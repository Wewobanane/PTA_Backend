const express = require('express');
const router = express.Router();
const {
  getAllStudents,
  getStudent,
  createStudent,
  updateStudent,
  deleteStudent,
  getMyChildren,
  linkParent
} = require('../controllers/studentController');
const { protect, authorize } = require('../middleware/auth');

// Routes
router.route('/')
  .get(protect, authorize('admin', 'teacher', 'parent'), getAllStudents)
  .post(protect, authorize('admin', 'teacher'), createStudent);

router.get('/parent/me', protect, authorize('parent'), getMyChildren);

router.route('/:id')
  .get(protect, getStudent)
  .put(protect, authorize('admin', 'teacher'), updateStudent)
  .delete(protect, authorize('admin'), deleteStudent);

router.post('/:id/link-parent', protect, authorize('admin', 'teacher'), linkParent);

module.exports = router;
