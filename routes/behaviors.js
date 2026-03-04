const express = require('express');
const router = express.Router();
const {
  getAllBehaviors,
  getBehavior,
  createBehavior,
  updateBehavior,
  deleteBehavior,
  getBehaviorStats,
  markParentNotified
} = require('../controllers/behaviorController');
const { protect, authorize } = require('../middleware/auth');

// Routes
router.route('/')
  .get(protect, getAllBehaviors)
  .post(protect, authorize('admin', 'teacher'), createBehavior);

router.get('/stats/:studentId', protect, getBehaviorStats);

router.route('/:id')
  .get(protect, getBehavior)
  .put(protect, authorize('admin', 'teacher'), updateBehavior)
  .delete(protect, authorize('admin', 'teacher'), deleteBehavior);

router.put('/:id/notify', protect, authorize('admin', 'teacher'), markParentNotified);

module.exports = router;
