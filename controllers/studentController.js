const Student = require('../models/Student');
const User = require('../models/User');

// @desc    Get all students
// @route   GET /api/students
// @access  Private (Admin, Teacher)
exports.getAllStudents = async (req, res) => {
  try {
    const { class: className, section, search } = req.query;
    
    let query = { isActive: true };

    // Filter by class
    if (className) {
      query.class = className;
    }

    // Filter by section
    if (section) {
      query.section = section;
    }

    // Search by name
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } }
      ];
    }

    const students = await Student.find(query)
      .populate('parents', 'name email phone')
      .sort({ class: 1, rollNumber: 1 })
      .lean();

    res.status(200).json({
      success: true,
      count: students.length,
      data: students
    });
  } catch (error) {
    console.error('❌ Error fetching students:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get single student
// @route   GET /api/students/:id
// @access  Private
exports.getStudent = async (req, res) => {
  try {
    // Validate ObjectId format
    if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid student ID format'
      });
    }

    const student = await Student.findById(req.params.id)
      .populate('parents', 'name email phone');

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // Parents can only view their own children
    if (req.user.role === 'parent') {
      const isParent = student.parents.some(parent => parent._id.toString() === req.user.id);
      if (!isParent) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to view this student'
        });
      }
    }

    res.status(200).json({
      success: true,
      data: student
    });
  } catch (error) {
    console.error('❌ Error fetching student:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Create new student
// @route   POST /api/students
// @access  Private (Admin, Teacher)
exports.createStudent = async (req, res) => {
  try {
    const student = await Student.create(req.body);

    // If parents are provided, add student to parent's children array
    if (req.body.parents && req.body.parents.length > 0) {
      await User.updateMany(
        { _id: { $in: req.body.parents } },
        { $addToSet: { children: student._id } }
      );
    }

    res.status(201).json({
      success: true,
      message: 'Student created successfully',
      data: student
    });
  } catch (error) {
    console.error('❌ Error creating student:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update student
// @route   PUT /api/students/:id
// @access  Private (Admin, Teacher)
exports.updateStudent = async (req, res) => {
  try {
    const student = await Student.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    );

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Student updated successfully',
      data: student
    });
  } catch (error) {
    console.error('❌ Error updating student:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Delete student (soft delete)
// @route   DELETE /api/students/:id
// @access  Private (Admin)
exports.deleteStudent = async (req, res) => {
  try {
    const student = await Student.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Student deactivated successfully',
      data: student
    });
  } catch (error) {
    console.error('❌ Error deleting student:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get students by parent
// @route   GET /api/students/parent/me
// @access  Private (Parent)
exports.getMyChildren = async (req, res) => {
  try {
    const parent = await User.findById(req.user.id).populate({
      path: 'children',
      match: { isActive: true }
    });

    res.status(200).json({
      success: true,
      count: parent.children.length,
      data: parent.children
    });
  } catch (error) {
    console.error('❌ Error fetching parent children:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Link parent to student
// @route   POST /api/students/:id/link-parent
// @access  Private (Admin, Teacher)
exports.linkParent = async (req, res) => {
  try {
    const { parentId } = req.body;
    const studentId = req.params.id;

    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    const parent = await User.findById(parentId);
    if (!parent || parent.role !== 'parent') {
      return res.status(404).json({
        success: false,
        message: 'Parent not found'
      });
    }

    // Add parent to student
    if (!student.parents.includes(parentId)) {
      student.parents.push(parentId);
      await student.save();
    }

    // Add student to parent
    if (!parent.children.includes(studentId)) {
      parent.children.push(studentId);
      await parent.save();
    }

    res.status(200).json({
      success: true,
      message: 'Parent linked to student successfully'
    });
  } catch (error) {
    console.error('❌ Error linking parent:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
