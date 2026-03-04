const express = require('express');
const router = express.Router();
const {
  getAllAttendance,
  getAttendance,
  createAttendance,
  updateAttendance,
  deleteAttendance,
  getAttendanceStats,
  bulkCreateAttendance
} = require('../controllers/attendanceController');
const { protect, authorize } = require('../middleware/auth');

// Routes
router.route('/')
  .get(protect, getAllAttendance)
  .post(protect, authorize('admin', 'teacher'), createAttendance);

router.post('/bulk', protect, authorize('admin', 'teacher'), bulkCreateAttendance);

router.get('/stats/:studentId', protect, getAttendanceStats);

router.route('/:id')
  .get(protect, getAttendance)
  .put(protect, authorize('admin', 'teacher'), updateAttendance)
  .delete(protect, authorize('admin'), deleteAttendance);

module.exports = router;
