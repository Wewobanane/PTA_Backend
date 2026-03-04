const Behavior = require('../models/Behavior');
const Student = require('../models/Student');
const User = require('../models/User');

// @desc    Get all behavior records
// @route   GET /api/behaviors
// @access  Private
exports.getAllBehaviors = async (req, res) => {
  try {
    const { studentId, type, category, severity, startDate, endDate } = req.query;

    let query = {};

    // Filter by student
    if (studentId) {
      query.student = studentId;
    }

    // Filter by type
    if (type) {
      query.type = type;
    }

    // Filter by category
    if (category) {
      query.category = category;
    }

    // Filter by severity
    if (severity) {
      query.severity = severity;
    }

    // Filter by date range
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    // If parent, only show their children's records
    if (req.user.role === 'parent') {
      const parent = await User.findById(req.user.id).populate('children');
      const childrenIds = parent.children.map(child => child._id);
      query.student = { $in: childrenIds };
    }

    // If teacher, show all or filter by their students
    const behaviors = await Behavior.find(query)
      .populate('student', 'firstName lastName class')
      .populate('teacher', 'name email subject')
      .sort({ date: -1 })
      .lean();

    res.status(200).json({
      success: true,
      count: behaviors.length,
      data: behaviors
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get single behavior record
// @route   GET /api/behaviors/:id
// @access  Private
exports.getBehavior = async (req, res) => {
  try {
    const behavior = await Behavior.findById(req.params.id)
      .populate('student', 'firstName lastName class')
      .populate('teacher', 'name email subject');

    if (!behavior) {
      return res.status(404).json({
        success: false,
        message: 'Behavior record not found'
      });
    }

    // Check authorization for parents
    if (req.user.role === 'parent') {
      const student = await Student.findById(behavior.student._id);
      const isParent = student.parents.some(parent => parent.toString() === req.user.id);
      if (!isParent) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to view this behavior record'
        });
      }
    }

    res.status(200).json({
      success: true,
      data: behavior
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Create behavior record
// @route   POST /api/behaviors
// @access  Private (Admin, Teacher)
exports.createBehavior = async (req, res) => {
  try {
    // Add teacher ID from logged-in user
    req.body.teacher = req.user.id;

    // If subject not provided, default to teacher's subject (first subject if comma-separated)
    if (!req.body.subject && req.user.subject) {
      const firstSubject = String(req.user.subject)
        .split(',')
        .map(s => s.trim())
        .filter(Boolean)[0];
      if (firstSubject) {
        req.body.subject = firstSubject;
      }
    }

    const behavior = await Behavior.create(req.body);

    // Populate the created behavior
    await behavior.populate('student', 'firstName lastName class');
    await behavior.populate('teacher', 'name email');

    // TODO: Send notification to parent

    res.status(201).json({
      success: true,
      message: 'Behavior record created successfully',
      data: behavior
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update behavior record
// @route   PUT /api/behaviors/:id
// @access  Private (Admin, Teacher who created it)
exports.updateBehavior = async (req, res) => {
  try {
    let behavior = await Behavior.findById(req.params.id);

    if (!behavior) {
      return res.status(404).json({
        success: false,
        message: 'Behavior record not found'
      });
    }

    // Check if teacher owns this record or user is admin
    if (req.user.role !== 'admin' && behavior.teacher.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this behavior record'
      });
    }

    // Keep subject consistent with teacher's subject if not explicitly updated
    if (!req.body.subject && req.user.subject) {
      const firstSubject = String(req.user.subject)
        .split(',')
        .map(s => s.trim())
        .filter(Boolean)[0];
      if (firstSubject) {
        req.body.subject = firstSubject;
      }
    }

    behavior = await Behavior.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    ).populate('student', 'firstName lastName class')
     .populate('teacher', 'name email');

    res.status(200).json({
      success: true,
      message: 'Behavior record updated successfully',
      data: behavior
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Delete behavior record
// @route   DELETE /api/behaviors/:id
// @access  Private (Admin, Teacher who created it)
exports.deleteBehavior = async (req, res) => {
  try {
    const behavior = await Behavior.findById(req.params.id);

    if (!behavior) {
      return res.status(404).json({
        success: false,
        message: 'Behavior record not found'
      });
    }

    // Check if teacher owns this record or user is admin
    if (req.user.role !== 'admin' && behavior.teacher.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this behavior record'
      });
    }

    await behavior.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Behavior record deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get behavior statistics for a student
// @route   GET /api/behaviors/stats/:studentId
// @access  Private
exports.getBehaviorStats = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { startDate, endDate } = req.query;

    // Check authorization for parents
    if (req.user.role === 'parent') {
      const student = await Student.findById(studentId);
      const isParent = student.parents.some(parent => parent.toString() === req.user.id);
      if (!isParent) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to view this student\'s behavior'
        });
      }
    }

    let dateFilter = {};
    if (startDate || endDate) {
      dateFilter.date = {};
      if (startDate) dateFilter.date.$gte = new Date(startDate);
      if (endDate) dateFilter.date.$lte = new Date(endDate);
    }

    const stats = await Behavior.aggregate([
      {
        $match: {
          student: require('mongoose').Types.ObjectId(studentId),
          ...dateFilter
        }
      },
      {
        $group: {
          _id: null,
          totalRecords: { $sum: 1 },
          positiveCount: {
            $sum: { $cond: [{ $eq: ['$type', 'positive'] }, 1, 0] }
          },
          negativeCount: {
            $sum: { $cond: [{ $eq: ['$type', 'negative'] }, 1, 0] }
          },
          severityCounts: {
            $push: '$severity'
          },
          categoryCounts: {
            $push: '$category'
          }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      data: stats[0] || {
        totalRecords: 0,
        positiveCount: 0,
        negativeCount: 0,
        severityCounts: [],
        categoryCounts: []
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Mark parent as notified
// @route   PUT /api/behaviors/:id/notify
// @access  Private (Teacher, Admin)
exports.markParentNotified = async (req, res) => {
  try {
    const behavior = await Behavior.findByIdAndUpdate(
      req.params.id,
      { parentNotified: true },
      { new: true }
    );

    if (!behavior) {
      return res.status(404).json({
        success: false,
        message: 'Behavior record not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Parent notification status updated',
      data: behavior
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
