const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

const AcademicYear = require('../models/AcademicYear');
const Student = require('../models/Student');
const { protect, authorize } = require('../middleware/auth');
const authController = require('../controllers/authController');

// All teacher routes require authentication and teacher role
router.use(protect);
router.use(authorize('teacher'));

// Update teacher profile (subjects/phone/etc.)
router.put('/me/profile', authController.updateProfile);

// --- Classrooms (Year + Term + Class) - used for dashboard, attendance, behavior, assessment ---

// GET /api/teacher/classrooms - list classrooms for current academic year only
router.get('/classrooms', async (req, res, next) => {
  try {
    const assigned = req.user.classesTeaching || [];
    if (assigned.length === 0) {
      return res.status(200).json({ success: true, data: [] });
    }

    const active = await AcademicYear.find({ isActive: true }).lean();
    let yearName = active.length > 0 ? active[0].name : null;
    if (!yearName) {
      const latest = await AcademicYear.findOne().sort({ createdAt: -1 }).lean();
      if (!latest) return res.status(200).json({ success: true, data: [] });
      yearName = latest.name;
    }

    const yearDocs = await AcademicYear.find({ name: yearName }).sort({ classLevel: 1 }).lean();
    const classrooms = [];
    for (const doc of yearDocs) {
      const classLevel = (doc.classLevel || '').trim();
      if (!classLevel || !assigned.includes(classLevel)) continue;
      const count = await Student.countDocuments({ academicYearId: doc._id, isActive: true });
      classrooms.push({
        academicYearId: doc._id,
        yearName: doc.name,
        classLevel,
        currentTermNumber: doc.currentTermNumber || null,
        termLabel: doc.currentTermNumber ? `Term ${doc.currentTermNumber}` : 'Term not set',
        studentCount: count,
      });
    }

    res.status(200).json({ success: true, data: classrooms });
  } catch (err) {
    next(err);
  }
});

// GET /api/teacher/classrooms/:academicYearId - single classroom info
router.get('/classrooms/:academicYearId', async (req, res, next) => {
  try {
    const { academicYearId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(academicYearId)) {
      return res.status(400).json({ success: false, message: 'Invalid classroom id' });
    }
    const doc = await AcademicYear.findById(academicYearId).lean();
    if (!doc) {
      return res.status(404).json({ success: false, message: 'Classroom not found' });
    }
    const assigned = req.user.classesTeaching || [];
    const classLevel = (doc.classLevel || '').trim();
    if (!assigned.includes(classLevel)) {
      return res.status(403).json({ success: false, message: 'Not authorized to access this classroom' });
    }
    const studentCount = await Student.countDocuments({ academicYearId: doc._id, isActive: true });
    res.status(200).json({
      success: true,
      data: {
        academicYearId: doc._id,
        yearName: doc.name,
        classLevel,
        currentTermNumber: doc.currentTermNumber || null,
        termLabel: doc.currentTermNumber ? `Term ${doc.currentTermNumber}` : 'Term not set',
        studentCount,
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/teacher/classrooms/:academicYearId/students - students in this classroom only
router.get('/classrooms/:academicYearId/students', async (req, res, next) => {
  try {
    const { academicYearId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(academicYearId)) {
      return res.status(400).json({ success: false, message: 'Invalid classroom id' });
    }
    const doc = await AcademicYear.findById(academicYearId).lean();
    if (!doc) {
      return res.status(404).json({ success: false, message: 'Classroom not found' });
    }
    const assigned = req.user.classesTeaching || [];
    const classLevel = (doc.classLevel || '').trim();
    if (!assigned.includes(classLevel)) {
      return res.status(403).json({ success: false, message: 'Not authorized to access this classroom' });
    }

    const students = await Student.find({ academicYearId, isActive: true })
      .select('firstName lastName class section rollNumber avatar')
      .sort({ lastName: 1, firstName: 1 })
      .lean();

    res.status(200).json({ success: true, count: students.length, data: students });
  } catch (err) {
    next(err);
  }
});

// Get teacher's assigned class names (legacy)
router.get('/classes', async (req, res, next) => {
  try {
    res.status(200).json({
      success: true,
      data: req.user.classesTeaching || [],
    });
  } catch (err) {
    next(err);
  }
});

// Get students for a class - supports classroom id (academicYearId) or class name
router.get('/classes/:classId/students', async (req, res, next) => {
  try {
    const { classId } = req.params;
    const assigned = req.user.classesTeaching || [];

    if (mongoose.Types.ObjectId.isValid(classId) && classId.length === 24) {
      const doc = await AcademicYear.findById(classId).lean();
      if (doc && assigned.includes((doc.classLevel || '').trim())) {
        const students = await Student.find({ academicYearId: classId, isActive: true })
          .select('firstName lastName class section rollNumber avatar')
          .sort({ lastName: 1, firstName: 1 })
          .lean();
        return res.status(200).json({ success: true, count: students.length, data: students });
      }
    }

    if (!assigned.includes(classId)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this class',
      });
    }

    const students = await Student.find({ class: classId, isActive: true })
      .select('firstName lastName class section rollNumber avatar')
      .sort({ lastName: 1, firstName: 1 })
      .lean();

    res.status(200).json({
      success: true,
      count: students.length,
      data: students,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

