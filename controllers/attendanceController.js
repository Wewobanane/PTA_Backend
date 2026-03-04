const Attendance = require('../models/Attendance');
const Student = require('../models/Student');

// @desc    Get all attendance records
// @route   GET /api/attendance
// @access  Private
exports.getAllAttendance = async (req, res) => {
  try {
    const { studentId, date, status, startDate, endDate } = req.query;

    let query = {};

    if (studentId) query.student = studentId;
    if (date) query.date = new Date(date);
    if (status) query.status = status;

    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    // If parent, only show their children's attendance
    if (req.user.role === 'parent') {
      const parent = await req.user.populate('children');
      const childrenIds = parent.children.map(child => child._id);
      query.student = { $in: childrenIds };
    }

    const attendance = await Attendance.find(query)
      .populate('student', 'firstName lastName class')
      .populate('teacher', 'name email subject')
      .sort({ date: -1 })
      .lean();

    res.status(200).json({
      success: true,
      count: attendance.length,
      data: attendance
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get single attendance record
// @route   GET /api/attendance/:id
// @access  Private
exports.getAttendance = async (req, res) => {
  try {
    const attendance = await Attendance.findById(req.params.id)
      .populate('student', 'firstName lastName class')
      .populate('teacher', 'name email subject');

    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: 'Attendance record not found'
      });
    }

    res.status(200).json({
      success: true,
      data: attendance
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Create attendance record
// @route   POST /api/attendance
// @access  Private (Admin, Teacher)
exports.createAttendance = async (req, res) => {
  try {
    req.body.teacher = req.user.id;

    const attendance = await Attendance.create(req.body);

    await attendance.populate('student', 'firstName lastName class');
    await attendance.populate('teacher', 'name email');

    res.status(201).json({
      success: true,
      message: 'Attendance recorded successfully',
      data: attendance
    });
  } catch (error) {
    // Handle duplicate entry
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Attendance already recorded for this student on this date'
      });
    }
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update attendance record
// @route   PUT /api/attendance/:id
// @access  Private (Admin, Teacher)
exports.updateAttendance = async (req, res) => {
  try {
    const attendance = await Attendance.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('student', 'firstName lastName class')
     .populate('teacher', 'name email');

    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: 'Attendance record not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Attendance updated successfully',
      data: attendance
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Delete attendance record
// @route   DELETE /api/attendance/:id
// @access  Private (Admin)
exports.deleteAttendance = async (req, res) => {
  try {
    const attendance = await Attendance.findById(req.params.id);

    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: 'Attendance record not found'
      });
    }

    await attendance.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Attendance record deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get attendance statistics for a student
// @route   GET /api/attendance/stats/:studentId
// @access  Private
exports.getAttendanceStats = async (req, res) => {
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
          message: 'Not authorized to view this student\'s attendance'
        });
      }
    }

    let dateFilter = {};
    if (startDate || endDate) {
      dateFilter.date = {};
      if (startDate) dateFilter.date.$gte = new Date(startDate);
      if (endDate) dateFilter.date.$lte = new Date(endDate);
    }

    const stats = await Attendance.aggregate([
      {
        $match: {
          student: require('mongoose').Types.ObjectId(studentId),
          ...dateFilter
        }
      },
      {
        $group: {
          _id: null,
          totalDays: { $sum: 1 },
          presentDays: {
            $sum: { $cond: [{ $eq: ['$status', 'present'] }, 1, 0] }
          },
          absentDays: {
            $sum: { $cond: [{ $eq: ['$status', 'absent'] }, 1, 0] }
          },
          lateDays: {
            $sum: { $cond: [{ $eq: ['$status', 'late'] }, 1, 0] }
          },
          excusedDays: {
            $sum: { $cond: [{ $eq: ['$status', 'excused'] }, 1, 0] }
          }
        }
      }
    ]);

    const result = stats[0] || {
      totalDays: 0,
      presentDays: 0,
      absentDays: 0,
      lateDays: 0,
      excusedDays: 0
    };

    result.attendancePercentage = result.totalDays > 0
      ? Math.round((result.presentDays / result.totalDays) * 100)
      : 0;

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Bulk create attendance (for entire class)
// @route   POST /api/attendance/bulk
// @access  Private (Admin, Teacher)
exports.bulkCreateAttendance = async (req, res) => {
  try {
    const { date, attendanceRecords, records } = req.body;
    
    // Support both formats: { date, attendanceRecords } or { records }
    const recordsArray = attendanceRecords || records;
    
    // Log incoming data for debugging
    console.log('Bulk attendance request:', {
      date,
      recordsCount: recordsArray?.length,
      isArray: Array.isArray(recordsArray),
      firstRecord: recordsArray?.[0]
    });
    
    // Validate request
    if (!recordsArray || !Array.isArray(recordsArray)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide records or attendanceRecords array'
      });
    }

    if (recordsArray.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Records array cannot be empty'
      });
    }


    // Map records to attendance format and use bulkWrite for upsert
    const bulkOps = recordsArray.map(record => ({
      updateOne: {
        filter: {
          student: record.studentId || record.student,
          date: new Date(record.date || date)
        },
        update: {
          $set: {
            teacher: req.user.id,
            status: record.status,
            period: record.period,
            remarks: record.remarks,
            absentReason: record.absentReason
          }
        },
        upsert: true
      }
    }));

    const result = await Attendance.bulkWrite(bulkOps);

    res.status(200).json({
      success: true,
      message: `${result.upsertedCount} records created, ${result.modifiedCount} records updated`,
      data: {
        created: result.upsertedCount,
        updated: result.modifiedCount,
        matched: result.matchedCount
      }
    });
  } catch (error) {
    // Handle duplicate entries
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Some attendance records already exist for this date',
        error: error.message
      });
    }
    
    console.error('Bulk attendance error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
