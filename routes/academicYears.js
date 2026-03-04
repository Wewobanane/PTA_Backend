const express = require('express');
const router = express.Router();
const AcademicYear = require('../models/AcademicYear');
const Student = require('../models/Student');
const { protect, authorize } = require('../middleware/auth');

// @route   GET /api/academic-years
// @desc    Get all academic years
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const years = await AcademicYear.find().sort({ createdAt: -1 });
    res.json({ success: true, data: years });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @route   GET /api/academic-years/current
// @desc    Get the current academic year name and all its classes
//          Priority:
//            1) Any years marked isActive === true (by name)
//            2) Otherwise, the most recently created year
// @access  Private
router.get('/current', protect, async (req, res) => {
  try {
    let activeDocs = await AcademicYear.find({ isActive: true }).lean();

    let yearName;
    let yearDocs;

    if (activeDocs && activeDocs.length > 0) {
      yearName = activeDocs[0].name;
      yearDocs = activeDocs;
    } else {
      const latest = await AcademicYear.findOne().sort({ createdAt: -1 }).lean();
      if (!latest) {
        return res.json({ success: true, data: null });
      }
      yearName = latest.name;
      yearDocs = await AcademicYear.find({ name: yearName }).sort({ classLevel: 1 }).lean();
    }

    const classes = Array.from(
      new Set(
        (yearDocs || [])
          .map((y) =>
            typeof y.classLevel === 'string'
              ? y.classLevel.trim()
              : String(y.classLevel || '').trim()
          )
          .filter(Boolean)
      )
    ).sort((a, b) => a.localeCompare(b));

    res.json({
      success: true,
      data: {
        name: yearName,
        classes,
        years: yearDocs,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @route   PUT /api/academic-years/set-current
// @desc    Mark all academic years with a given name as current (isActive = true),
//          and clear isActive on all others. This controls what teachers see as
//          "Current Academic Year" when assigning classes.
// @access  Private
router.put('/set-current', protect, async (req, res) => {
  try {
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Year name is required',
      });
    }

    const exists = await AcademicYear.find({ name }).lean();
    if (!exists || exists.length === 0) {
      return res.status(404).json({
        success: false,
        message: `No academic years found with name "${name}"`,
      });
    }

    // Clear current flag on all years, then set it for this name
    await AcademicYear.updateMany({}, { isActive: false });
    await AcademicYear.updateMany({ name }, { isActive: true });

    const updated = await AcademicYear.find({ name }).sort({ classLevel: 1 }).lean();

    res.json({
      success: true,
      message: `Current academic year set to "${name}"`,
      data: {
        name,
        years: updated,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @route   POST /api/academic-years
// @desc    Create new academic year
// @access  Private (Admin only)
router.post('/', protect, async (req, res) => {
  try {
    const { name, classLevel, currentTermNumber } = req.body;

    if (!name || !classLevel) {
      return res.status(400).json({ success: false, message: 'Please provide name and classLevel' });
    }

    const academicYear = new AcademicYear({
      name,
      classLevel,
      currentTermNumber: currentTermNumber || null,
      terms: []
    });

    await academicYear.save();
    res.status(201).json({ success: true, data: academicYear });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @route   PUT /api/academic-years/:id
// @desc    Update academic year
// @access  Private (Admin only)
router.put('/:id', protect, async (req, res) => {
  try {
    const { name, classLevel, currentTermNumber } = req.body;

    const academicYear = await AcademicYear.findByIdAndUpdate(
      req.params.id,
      { name, classLevel, currentTermNumber },
      { new: true, runValidators: true }
    );

    if (!academicYear) {
      return res.status(404).json({ success: false, message: 'Academic year not found' });
    }

    res.json({ success: true, data: academicYear });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @route   DELETE /api/academic-years/:id
// @desc    Delete academic year
// @access  Private (Admin only)
router.delete('/:id', protect, async (req, res) => {
  try {
    const academicYear = await AcademicYear.findByIdAndDelete(req.params.id);

    if (!academicYear) {
      return res.status(404).json({ success: false, message: 'Academic year not found' });
    }

    // Optionally clean up students
    await Student.updateMany(
      { academicYearId: req.params.id },
      { $set: { academicYearId: null, currentTermNumber: null } }
    );

    res.json({ success: true, message: 'Academic year deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @route   GET /api/academic-years/:id/terms
// @desc    Get all terms for an academic year
// @access  Private
router.get('/:id/terms', protect, async (req, res) => {
  try {
    const academicYear = await AcademicYear.findById(req.params.id);

    if (!academicYear) {
      return res.status(404).json({ success: false, message: 'Academic year not found' });
    }

    res.json({ success: true, data: academicYear.terms });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @route   POST /api/academic-years/:id/terms
// @desc    Add term to academic year
// @access  Private (Admin only)
router.post('/:id/terms', protect, async (req, res) => {
  try {
    const { termNumber, startDate, endDate } = req.body;

    if (!termNumber || !startDate || !endDate) {
      return res.status(400).json({ success: false, message: 'Please provide termNumber, startDate, and endDate' });
    }

    const academicYear = await AcademicYear.findById(req.params.id);

    if (!academicYear) {
      return res.status(404).json({ success: false, message: 'Academic year not found' });
    }

    // Check if term already exists
    const existingTerm = academicYear.terms.find(t => t.termNumber === termNumber);
    if (existingTerm) {
      return res.status(400).json({ success: false, message: 'Term already exists for this academic year' });
    }

    academicYear.terms.push({ termNumber, startDate, endDate });
    await academicYear.save();

    res.status(201).json({ success: true, data: academicYear.terms });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @route   PUT /api/academic-years/:id/terms/:termId
// @desc    Update term
// @access  Private (Admin only)
router.put('/:id/terms/:termId', protect, async (req, res) => {
  try {
    const { termNumber, startDate, endDate } = req.body;

    const academicYear = await AcademicYear.findById(req.params.id);

    if (!academicYear) {
      return res.status(404).json({ success: false, message: 'Academic year not found' });
    }

    const term = academicYear.terms.id(req.params.termId);

    if (!term) {
      return res.status(404).json({ success: false, message: 'Term not found' });
    }

    if (termNumber) term.termNumber = termNumber;
    if (startDate) term.startDate = startDate;
    if (endDate) term.endDate = endDate;

    await academicYear.save();

    res.json({ success: true, data: academicYear.terms });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @route   DELETE /api/academic-years/:id/terms/:termId
// @desc    Delete term
// @access  Private (Admin only)
router.delete('/:id/terms/:termId', protect, async (req, res) => {
  try {
    const academicYear = await AcademicYear.findById(req.params.id);

    if (!academicYear) {
      return res.status(404).json({ success: false, message: 'Academic year not found' });
    }

    academicYear.terms.pull(req.params.termId);
    await academicYear.save();

    res.json({ success: true, message: 'Term deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @route   GET /api/academic-years/:id/students
// @desc    Get all students for an academic year
// @access  Private
router.get('/:id/students', protect, async (req, res) => {
  try {
    const students = await Student.find({ academicYearId: req.params.id }).populate('parents', 'firstName lastName email');
    res.json({ success: true, data: students });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @route   PUT /api/academic-years/:id/change-term
// @desc    Change current term for academic year (moves all students)
// @access  Private (Admin only)
router.put('/:id/change-term', protect, async (req, res) => {
  try {
    const { termNumber } = req.body;

    if (!termNumber) {
      return res.status(400).json({ success: false, message: 'Please provide termNumber' });
    }

    const academicYear = await AcademicYear.findById(req.params.id);

    if (!academicYear) {
      return res.status(404).json({ success: false, message: 'Academic year not found' });
    }

    // Check if term exists
    const term = academicYear.terms.find(t => t.termNumber === termNumber);
    if (!term) {
      return res.status(404).json({ success: false, message: 'Term not found' });
    }

    // Update academic year's current term
    academicYear.currentTermNumber = termNumber;
    await academicYear.save();

    // Update all students in this academic year to the new term
    await Student.updateMany(
      { academicYearId: req.params.id },
      { $set: { currentTermNumber: termNumber } }
    );

    res.json({ success: true, message: `All students moved to Term ${termNumber}`, data: academicYear });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @route   POST /api/academic-years/:id/promote
// @desc    Promote entire academic year to next year (creates new year, moves students)
// @access  Private (Admin only)
router.post('/:id/promote', protect, async (req, res) => {
  try {
    const { newYearName, newClassLevel } = req.body;

    if (!newYearName || !newClassLevel) {
      return res.status(400).json({ success: false, message: 'Please provide newYearName and newClassLevel' });
    }

    const oldAcademicYear = await AcademicYear.findById(req.params.id);

    if (!oldAcademicYear) {
      return res.status(404).json({ success: false, message: 'Academic year not found' });
    }

    // Create new academic year
    const newAcademicYear = new AcademicYear({
      name: newYearName,
      classLevel: newClassLevel,
      currentTermNumber: 1, // Start with Term 1
      terms: []
    });

    await newAcademicYear.save();

    // Move all students to new academic year
    const result = await Student.updateMany(
      { academicYearId: req.params.id },
      { 
        $set: { 
          academicYearId: newAcademicYear._id,
          currentTermNumber: 1,
          class: newClassLevel 
        } 
      }
    );

    res.json({ 
      success: true, 
      message: `Promoted ${result.modifiedCount} students to ${newYearName}`,
      data: newAcademicYear 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

module.exports = router;
