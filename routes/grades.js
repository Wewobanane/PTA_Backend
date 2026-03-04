const express = require('express');
const router = express.Router();
const {
  getAllGrades,
  getGrade,
  createGrade,
  updateGrade,
  deleteGrade,
  getGradeStats,
  getStudentSubjectRank
} = require('../controllers/gradeController');
const { protect, authorize } = require('../middleware/auth');

// Routes
router.route('/')
  .get(protect, getAllGrades)
  .post(protect, authorize('admin', 'teacher'), createGrade);

router.get('/stats/:studentId', protect, getGradeStats);
router.get('/rank/:studentId', protect, getStudentSubjectRank);

router.route('/:id')
  .get(protect, getGrade)
  .put(protect, authorize('admin', 'teacher'), updateGrade)
  .delete(protect, authorize('admin', 'teacher'), deleteGrade);

module.exports = router;
