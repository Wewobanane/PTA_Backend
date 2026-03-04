const express = require('express');
const router = express.Router();
const {
  getMessages,
  getMessage,
  sendMessage,
  deleteMessage,
  getUnreadCount,
  getAnnouncements,
  getAnnouncement,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  getMeetings,
  getMeeting,
  createMeeting,
  updateMeeting,
  respondToMeeting,
  deleteMeeting
} = require('../controllers/communicationController');
const { protect, authorize } = require('../middleware/auth');

// ===== MESSAGE ROUTES =====
router.route('/messages')
  .get(protect, getMessages)
  .post(protect, sendMessage);

router.get('/messages/unread/count', protect, getUnreadCount);

router.route('/messages/:id')
  .get(protect, getMessage)
  .delete(protect, deleteMessage);

// ===== ANNOUNCEMENT ROUTES =====
router.route('/announcements')
  .get(protect, getAnnouncements)
  .post(protect, authorize('admin'), createAnnouncement);

router.route('/announcements/:id')
  .get(protect, getAnnouncement)
  .put(protect, authorize('admin'), updateAnnouncement)
  .delete(protect, authorize('admin'), deleteAnnouncement);

// ===== MEETING ROUTES =====
router.route('/meetings')
  .get(protect, getMeetings)
  .post(protect, authorize('admin'), createMeeting);

router.put('/meetings/:id/respond', protect, respondToMeeting);

router.route('/meetings/:id')
  .get(protect, getMeeting)
  .put(protect, authorize('admin'), updateMeeting)
  .delete(protect, authorize('admin'), deleteMeeting);

module.exports = router;
