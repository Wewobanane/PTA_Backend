const express = require('express');
const router = express.Router();
const {
  createTeacher,
  createParent,
  getPendingInvitations,
  resendInvitation,
  getTeacherRoomOptions,
  getAllUsers,
  updateUserStatus,
  deleteUser
} = require('../controllers/adminController');

const { protect, authorize } = require('../middleware/auth');

// Protect all routes and authorize only admin
router.use(protect);
router.use(authorize('admin'));

// User management routes
router.route('/users')
  .get(getAllUsers);

router.route('/users/:id')
  .delete(deleteUser);

router.route('/users/:id/status')
  .patch(updateUserStatus);

// Teacher routes
router.route('/teachers')
  .post(createTeacher);

// Parent routes
router.route('/parents')
  .post(createParent);

// Invitation management
router.route('/pending-invitations')
  .get(getPendingInvitations);

router.route('/resend-invitation')
  .post(resendInvitation);

// Lookup helpers
router.route('/lookups/teacher-rooms')
  .get(getTeacherRoomOptions);

module.exports = router;
