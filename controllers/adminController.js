const crypto = require('crypto');
const User = require('../models/User');
const InviteToken = require('../models/InviteToken');
const { sendActivationEmail } = require('../utils/email');

// @desc    Create a new teacher (admin only)
// @route   POST /api/admin/teachers
// @access  Private/Admin
exports.createTeacher = async (req, res, next) => {
  try {
    const { name, email, classesTeaching } = req.body;

    // Check if user already exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email'
      });
    }

    // Create user with INVITED status and no password
    // Note: subjects and phone should be provided by the teacher after activation.
    const user = await User.create({
      name,
      email,
      role: 'teacher',
      status: 'INVITED',
      password: null,
      classesTeaching,
      createdBy: req.user.id // Assuming auth middleware adds user to req
    });

    // Generate activation token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 72); // 72 hours from now

    // Store token
    await InviteToken.create({
      userId: user._id,
      token,
      type: 'ACTIVATION',
      expiresAt
    });

    // Send activation email
    try {
      await sendActivationEmail(user.email, user.name, token, user.role);
    } catch (emailError) {
      console.error('Email sending failed:', emailError);
      // Don't fail the request if email fails, but log it
    }

    res.status(201).json({
      success: true,
      message: 'Teacher created successfully. Activation email sent.',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        subject: user.subject,
        classesTeaching: user.classesTeaching
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a new parent (admin only)
// @route   POST /api/admin/parents
// @access  Private/Admin
exports.createParent = async (req, res, next) => {
  try {
    const { name, email, phone, children } = req.body;

    // Check if user already exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email'
      });
    }

    // Create user with INVITED status and no password
    const user = await User.create({
      name,
      email,
      role: 'parent',
      status: 'INVITED',
      password: null,
      phone,
      children,
      createdBy: req.user.id
    });

    // Generate activation token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 72); // 72 hours from now

    // Store token
    await InviteToken.create({
      userId: user._id,
      token,
      type: 'ACTIVATION',
      expiresAt
    });

    // Send activation email
    try {
      await sendActivationEmail(user.email, user.name, token, user.role);
    } catch (emailError) {
      console.error('Email sending failed:', emailError);
    }

    res.status(201).json({
      success: true,
      message: 'Parent created successfully. Activation email sent.',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        children: user.children
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all pending invitations
// @route   GET /api/admin/pending-invitations
// @access  Private/Admin
exports.getPendingInvitations = async (req, res, next) => {
  try {
    const pendingUsers = await User.find({ status: 'INVITED' })
      .select('-password')
      .populate('createdBy', 'name email')
      .sort('-createdAt')
      .lean();

    res.status(200).json({
      success: true,
      count: pendingUsers.length,
      data: pendingUsers
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Resend activation email
// @route   POST /api/admin/resend-invitation
// @access  Private/Admin
exports.resendInvitation = async (req, res, next) => {
  try {
    const { userId } = req.body;

    // Find user
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.status !== 'INVITED') {
      return res.status(400).json({
        success: false,
        message: 'User account is already activated'
      });
    }

    // Invalidate old tokens
    await InviteToken.updateMany(
      { userId, type: 'ACTIVATION', used: false },
      { used: true, usedAt: new Date() }
    );

    // Generate new token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 72); // 72 hours

    await InviteToken.create({
      userId,
      token,
      type: 'ACTIVATION',
      expiresAt
    });

    // Send email
    await sendActivationEmail(user.email, user.name, token, user.role);

    res.status(200).json({
      success: true,
      message: 'Activation email sent successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all users (admin only)
// @route   GET /api/admin/users
// @access  Private/Admin
exports.getAllUsers = async (req, res, next) => {
  try {
    const { role, status } = req.query;
    
    const filter = {};
    if (role) filter.role = role;
    if (status) filter.status = status;

    const users = await User.find(filter)
      .select('-password')
      .populate('children', 'name')
      .sort('-createdAt')
      .lean();

    res.status(200).json({
      success: true,
      count: users.length,
      data: users
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user status (suspend/activate)
// @route   PATCH /api/admin/users/:id/status
// @access  Private/Admin
exports.updateUserStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const { id } = req.params;

    if (!['ACTIVE', 'SUSPENDED'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be ACTIVE or SUSPENDED'
      });
    }

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Cannot change status of INVITED user to ACTIVE (they must activate themselves)
    if (user.status === 'INVITED' && status === 'ACTIVE') {
      return res.status(400).json({
        success: false,
        message: 'Cannot manually activate an invited user. User must complete activation process.'
      });
    }

    user.status = status;
    await user.save();

    res.status(200).json({
      success: true,
      message: `User status updated to ${status}`,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete user (admin only)
// @route   DELETE /api/admin/users/:id
// @access  Private/Admin
exports.deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Prevent deleting yourself
    if (user._id.toString() === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'You cannot delete your own account'
      });
    }

    await user.deleteOne();

    // Clean up associated tokens
    await InviteToken.deleteMany({ userId: id });

    res.status(200).json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get teacher room options (admin only)
// @route   GET /api/admin/lookups/teacher-rooms
// @access  Private/Admin
exports.getTeacherRoomOptions = async (req, res, next) => {
  try {
    const teachers = await User.find({ role: 'teacher' })
      .select('room')
      .lean();

    const rooms = new Set();

    (teachers || []).forEach(t => {
      const value = t?.room;
      if (!value) return;

      // room is stored as comma-separated string in current schema
      String(value)
        .split(',')
        .map(s => s.trim())
        .filter(Boolean)
        .forEach(r => rooms.add(r));
    });

    const data = Array.from(rooms).sort((a, b) => a.localeCompare(b));

    res.status(200).json({
      success: true,
      count: data.length,
      data,
    });
  } catch (error) {
    next(error);
  }
};
