const Grade = require('../models/Grade');
const Student = require('../models/Student');
const mongoose = require('mongoose');

// @desc    Get all grades
// @route   GET /api/grades
// @access  Private
exports.getAllGrades = async (req, res) => {
  try {
    const { studentId, subject, term, academicYear, assessmentType } = req.query;

    let query = {};

    if (studentId) query.student = studentId;
    if (subject) query.subject = subject;
    if (term) query.term = term;
    if (academicYear) query.academicYear = academicYear;
    if (assessmentType) query.assessmentType = assessmentType;

    // If parent, only show their children's grades
    if (req.user.role === 'parent') {
      const parent = await req.user.populate('children');
      const childrenIds = parent.children.map(child => child._id);
      query.student = { $in: childrenIds };
    }

    // If teacher, only show grades they recorded
    if (req.user.role === 'teacher') {
      query.teacher = req.user.id;
    }

    const grades = await Grade.find(query)
      .populate('student', 'firstName lastName class')
      .populate('teacher', 'name email')
      .sort({ date: -1 });

    res.status(200).json({
      success: true,
      count: grades.length,
      data: grades
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get single grade
// @route   GET /api/grades/:id
// @access  Private
exports.getGrade = async (req, res) => {
  try {
    const grade = await Grade.findById(req.params.id)
      .populate('student', 'firstName lastName class')
      .populate('teacher', 'name email');

    if (!grade) {
      return res.status(404).json({
        success: false,
        message: 'Grade not found'
      });
    }

    // Check authorization for parents
    if (req.user.role === 'parent') {
      const student = await Student.findById(grade.student._id);
      const isParent = student.parents.some(parent => parent.toString() === req.user.id);
      if (!isParent) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to view this grade'
        });
      }
    }

    res.status(200).json({
      success: true,
      data: grade
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Create grade
// @route   POST /api/grades
// @access  Private (Admin, Teacher)
exports.createGrade = async (req, res) => {
  try {
    req.body.teacher = req.user.id;

    console.log('Creating grade with data:', req.body);

    const grade = await Grade.create(req.body);

    await grade.populate('student', 'firstName lastName class');
    await grade.populate('teacher', 'name email');

    res.status(201).json({
      success: true,
      message: 'Grade created successfully',
      data: grade
    });
  } catch (error) {
    console.error('Grade creation error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update grade
// @route   PUT /api/grades/:id
// @access  Private (Admin, Teacher who created it)
exports.updateGrade = async (req, res) => {
  try {
    let grade = await Grade.findById(req.params.id);

    if (!grade) {
      return res.status(404).json({
        success: false,
        message: 'Grade not found'
      });
    }

    if (req.user.role !== 'admin' && grade.teacher.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this grade'
      });
    }

    grade = await Grade.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('student', 'firstName lastName class')
     .populate('teacher', 'name email');

    res.status(200).json({
      success: true,
      message: 'Grade updated successfully',
      data: grade
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Delete grade
// @route   DELETE /api/grades/:id
// @access  Private (Admin, Teacher who created it)
exports.deleteGrade = async (req, res) => {
  try {
    const grade = await Grade.findById(req.params.id);

    if (!grade) {
      return res.status(404).json({
        success: false,
        message: 'Grade not found'
      });
    }

    if (req.user.role !== 'admin' && grade.teacher.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this grade'
      });
    }

    await grade.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Grade deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get grade statistics for a student
// @route   GET /api/grades/stats/:studentId
// @access  Private
exports.getGradeStats = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { term, academicYear, subject } = req.query;

    // Check authorization for parents
    if (req.user.role === 'parent') {
      const student = await Student.findById(studentId);
      const isParent = student.parents.some(parent => parent.toString() === req.user.id);
      if (!isParent) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to view this student\'s grades'
        });
      }
    }

    let matchFilter = { student: require('mongoose').Types.ObjectId(studentId) };
    if (term) matchFilter.term = term;
    if (academicYear) matchFilter.academicYear = academicYear;
    if (subject) matchFilter.subject = subject;

    const stats = await Grade.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: '$subject',
          averagePercentage: { $avg: '$percentage' },
          totalAssessments: { $sum: 1 },
          grades: { $push: '$grade' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    const overallAverage = await Grade.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: null,
          overallAverage: { $avg: '$percentage' }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      data: {
        bySubject: stats,
        overallAverage: overallAverage[0]?.overallAverage || 0
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get class rank for a student in a subject/term/year
// @route   GET /api/grades/rank/:studentId
// @access  Private (Parent, Teacher, Admin)
exports.getStudentSubjectRank = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { subject, term, academicYear } = req.query;

    if (!subject || !term || !academicYear) {
      return res.status(400).json({
        success: false,
        message: 'subject, term, and academicYear are required',
      });
    }

    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found',
      });
    }

    // Parents can only see their own children
    if (req.user.role === 'parent') {
      const isParent = (student.parents || []).some(
        (parentId) => parentId.toString() === req.user.id
      );
      if (!isParent) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to view this student\'s rank',
        });
      }
    }

    // Determine classmates: same academicYearId (same classroom), active only
    const classmates = await Student.find({
      academicYearId: student.academicYearId,
      isActive: true,
    })
      .select('_id')
      .lean();

    const classmateIds = classmates.map((s) => s._id);
    if (classmateIds.length === 0) {
      return res.status(200).json({
        success: true,
        data: {
          position: null,
          finalScore: null,
          letterGrade: null,
          totalStudents: 0,
        },
      });
    }

    // Fetch all grades for this class+subject+term+year
    const grades = await Grade.find({
      student: { $in: classmateIds },
      subject,
      term,
      academicYear,
    })
      .select('student assessmentType percentage')
      .lean();

    if (!grades.length) {
      return res.status(200).json({
        success: true,
        data: {
          position: null,
          finalScore: null,
          letterGrade: null,
          totalStudents: classmateIds.length,
        },
      });
    }

    // Group percentages by student and assessment type
    const byStudent = {};
    grades.forEach((g) => {
      const id = g.student.toString();
      if (!byStudent[id]) {
        byStudent[id] = {
          classworks: [],
          tests: [],
          exams: [],
        };
      }
      const pct = typeof g.percentage === 'number' ? g.percentage : 0;
      if (g.assessmentType === 'classwork') {
        byStudent[id].classworks.push(pct);
      } else if (g.assessmentType === 'test') {
        byStudent[id].tests.push(pct);
      } else if (g.assessmentType === 'exam') {
        byStudent[id].exams.push(pct);
      }
    });

    // Compute final score per student using same weights as teacher portal
    const results = Object.entries(byStudent).map(([id, buckets]) => {
      const classworkAvg =
        buckets.classworks.length > 0
          ? buckets.classworks.reduce((a, b) => a + b, 0) /
            buckets.classworks.length
          : 0;
      const testAvg =
        buckets.tests.length > 0
          ? buckets.tests.reduce((a, b) => a + b, 0) / buckets.tests.length
          : 0;
      const examAvg =
        buckets.exams.length > 0
          ? buckets.exams.reduce((a, b) => a + b, 0) / buckets.exams.length
          : 0;

      const finalScore = classworkAvg * 0.2 + testAvg * 0.3 + examAvg * 0.5;

      // Map to letter grade (keep in sync with frontend)
      let letterGrade = 'F';
      if (finalScore >= 90) letterGrade = 'A+';
      else if (finalScore >= 85) letterGrade = 'A';
      else if (finalScore >= 80) letterGrade = 'B+';
      else if (finalScore >= 75) letterGrade = 'B';
      else if (finalScore >= 70) letterGrade = 'C+';
      else if (finalScore >= 65) letterGrade = 'C';
      else if (finalScore >= 60) letterGrade = 'D';
      else if (finalScore >= 50) letterGrade = 'E';

      return {
        studentId: id,
        finalScore,
        letterGrade,
      };
    });

    // Sort by final score descending and assign positions
    results.sort((a, b) => b.finalScore - a.finalScore);
    const totalStudents = results.length;
    const targetId = studentId.toString();
    const index = results.findIndex((r) => r.studentId === targetId);

    const target =
      index !== -1
        ? {
            position: index + 1,
            finalScore: Number(results[index].finalScore.toFixed(2)),
            letterGrade: results[index].letterGrade,
            totalStudents,
          }
        : {
            position: null,
            finalScore: null,
            letterGrade: null,
            totalStudents,
          };

    return res.status(200).json({
      success: true,
      data: target,
    });
  } catch (error) {
    console.error('Error computing student rank:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
