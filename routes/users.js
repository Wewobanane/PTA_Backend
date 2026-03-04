const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { protect, authorize } = require('../middleware/auth');

// Get teachers list (accessible by teachers and parents for messaging)
router.get('/teachers', protect, authorize('teacher', 'parent'), async (req, res) => {
  try {
    const { class: classFilter } = req.query;
    
    let query = { role: 'teacher' };
    
    // If class filter is provided, filter teachers by that class
    if (classFilter) {
      query.classesTeaching = classFilter;
    }
    
    const teachers = await User.find(query)
      .select('name email subject classesTeaching')
      .sort('name')
      .lean();

    res.status(200).json({
      success: true,
      count: teachers.length,
      data: teachers
    });
  } catch (error) {
    console.error('Get teachers error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get admins list (accessible by teachers and parents for messaging)
router.get('/admins', protect, authorize('teacher', 'parent'), async (req, res) => {
  try {
    const admins = await User.find({ role: 'admin' })
      .select('name email')
      .sort('name')
      .lean();

    res.status(200).json({
      success: true,
      count: admins.length,
      data: admins
    });
  } catch (error) {
    console.error('Get admins error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get all users (admin only)
router.get('/', protect, authorize('admin'), async (req, res) => {
  try {
    const { role } = req.query;
    const query = role ? { role } : {};
    
    const users = await User.find(query)
      .select('-password')
      .populate('children', 'firstName lastName class')
      .sort('-createdAt')
      .lean();

    res.status(200).json({
      success: true,
      count: users.length,
      data: users
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Update user (admin only)
router.put('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    console.log('Updating user:', id);
    console.log('Updates received:', JSON.stringify(updates, null, 2));
    console.log('classesTeaching before processing:', updates.classesTeaching);

    // Handle password separately
    if (updates.password) {
      // If password is provided, hash it
      const bcrypt = require('bcryptjs');
      const salt = await bcrypt.genSalt(10);
      updates.password = await bcrypt.hash(updates.password, salt);
    }

    // For teachers, ensure classesTeaching is an array
    if (updates.classesTeaching && !Array.isArray(updates.classesTeaching)) {
      updates.classesTeaching = [updates.classesTeaching];
    }
    
    // Convert subject and room from arrays to strings if needed
    if (updates.subject && Array.isArray(updates.subject)) {
      updates.subject = updates.subject.join(', ');
    }

    // Rooms: support many (array). Accept legacy `room` or new `rooms`.
    if (Object.prototype.hasOwnProperty.call(updates, 'rooms') || Object.prototype.hasOwnProperty.call(updates, 'room')) {
      let rooms = updates.rooms;
      if (rooms === undefined) rooms = updates.room;

      if (rooms == null) {
        rooms = [];
      } else if (!Array.isArray(rooms)) {
        rooms = [rooms];
      }

      const normalizedRooms = rooms
        .map(r => (typeof r === 'string' ? r.trim() : String(r).trim()))
        .filter(Boolean);

      updates.rooms = normalizedRooms;
      // Keep a legacy, human-readable `room` field for older UIs/data
      updates.room = normalizedRooms.join(', ');
    }
    
    console.log('classesTeaching after processing:', updates.classesTeaching);
    console.log('subject after processing:', updates.subject);
    console.log('rooms after processing:', updates.rooms);

    // For parents, ensure children is an array
    if (updates.children && !Array.isArray(updates.children)) {
      updates.children = [updates.children];
    }

    const user = await User.findByIdAndUpdate(
      id,
      updates,
      { new: true, runValidators: true }
    ).select('-password').populate('children', 'firstName lastName class');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    console.log('User updated successfully:', user.email);
    console.log('Classes teaching:', user.classesTeaching);
    console.log('Subject:', user.subject);
    console.log('Rooms:', user.rooms);
    console.log('Full user data:', JSON.stringify(user.toObject ? user.toObject() : user, null, 2));

    res.status(200).json({
      success: true,
      message: 'User updated successfully',
      data: user
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Delete user (admin only)
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    await user.deleteOne();

    res.status(200).json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;
