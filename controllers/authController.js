const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const InviteToken = require('../models/InviteToken');

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE
  });
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public (Admin only in production)
exports.register = async (req, res, next) => {
  try {
    const { name, email, password, role, phone, subject, classesTeaching } = req.body;

    // Check if user already exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email'
      });
    }

    // Create user with ACTIVE status (direct registration)
    const user = await User.create({
      name,
      email,
      password,
      role,
      status: 'ACTIVE',
      phone,
      subject: role === 'teacher' ? subject : undefined,
      classesTeaching: role === 'teacher' ? classesTeaching : undefined,
      activatedAt: new Date()
    });

    // Generate token
    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        token
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Validate email & password
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }

    // Check for user (include password field)
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if account is invited (not yet activated)
    if (user.status === 'INVITED') {
      return res.status(403).json({
        success: false,
        message: 'Please activate your account using the invitation email before logging in'
      });
    }

    // Check if account is suspended
    if (user.status === 'SUSPENDED') {
      return res.status(403).json({
        success: false,
        message: 'Your account has been suspended. Please contact the administrator.'
      });
    }

    // Check if user is active (legacy check)
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated. Please contact administrator.'
      });
    }

    // Check if password matches
    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Update last login
    user.lastLogin = Date.now();
    await user.save();

    // Generate token
    const token = generateToken(user._id);

    // Set token in cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        token
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id)
      .populate('children')
      .lean();

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Logout user / clear cookie
// @route   POST /api/auth/logout
// @access  Private
exports.logout = async (req, res, next) => {
  res.cookie('token', 'none', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true
  });

  res.status(200).json({
    success: true,
    message: 'Logged out successfully'
  });
};

// @desc    Update user profile
// @route   PUT /api/auth/updateprofile
// @access  Private
exports.updateProfile = async (req, res, next) => {
  try {
    const fieldsToUpdate = {
      name: req.body.name,
      email: req.body.email,
      phone: req.body.phone,
      avatar: req.body.avatar
    };

    // Allow teachers to update their subject(s) themselves
    if (req.user && req.user.role === 'teacher' && typeof req.body.subject !== 'undefined') {
      // Accept array or string; store as comma-separated string in model
      if (Array.isArray(req.body.subject)) {
        fieldsToUpdate.subject = req.body.subject.join(', ');
      } else {
        fieldsToUpdate.subject = req.body.subject;
      }
    }

    const user = await User.findByIdAndUpdate(req.user.id, fieldsToUpdate, {
      new: true,
      runValidators: true
    });

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: user
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update password
// @route   PUT /api/auth/updatepassword
// @access  Private
exports.updatePassword = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('+password');

    // Check current password
    const isMatch = await user.comparePassword(req.body.currentPassword);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    user.password = req.body.newPassword;
    await user.save();

    const token = generateToken(user._id);

    res.status(200).json({
      success: true,
      message: 'Password updated successfully',
      data: { token }
    });
  } catch (error) {
    next(error);
  }
};

// Password strength validation helper
const isPasswordStrong = (password) => {
  // Minimum 8 characters, at least 1 uppercase, 1 lowercase, 1 number
  const minLength = password.length >= 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  
  return minLength && hasUpperCase && hasLowerCase && hasNumber;
};

// @desc    Validate activation token
// @route   GET /api/auth/validate-token/:token
// @access  Public
exports.validateToken = async (req, res, next) => {
  try {
    const { token } = req.params;

    // Find token in database
    const tokenDoc = await InviteToken.findOne({ token });

    if (!tokenDoc) {
      return res.status(400).json({
        valid: false,
        message: 'Invalid activation token'
      });
    }

    // Check if already used
    if (tokenDoc.used) {
      return res.status(400).json({
        valid: false,
        message: 'This activation link has already been used. Please use the normal login.'
      });
    }

    // Check if expired
    if (new Date() > tokenDoc.expiresAt) {
      return res.status(400).json({
        valid: false,
        message: 'This activation link has expired. Please contact the administrator for a new invitation.'
      });
    }

    // Get user details
    const user = await User.findById(tokenDoc.userId);

    if (!user) {
      return res.status(400).json({
        valid: false,
        message: 'User not found.'
      });
    }

    // Token is valid
    res.status(200).json({
      valid: true,
      email: user.email,
      name: user.name,
      role: user.role,
      message: 'Token is valid'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Activate account (set password)
// @route   POST /api/auth/activate-account
// @access  Public
exports.activateAccount = async (req, res, next) => {
  try {
    const { token, password } = req.body;

    // Validate input
    if (!token || !password) {
      return res.status(400).json({
        success: false,
        message: 'Token and password are required'
      });
    }

    // Validate password strength
    if (!isPasswordStrong(password)) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters and contain uppercase, lowercase, and numbers'
      });
    }

    // Validate token
    const tokenDoc = await InviteToken.findOne({ token, used: false });

    if (!tokenDoc) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired activation token'
      });
    }

    if (new Date() > tokenDoc.expiresAt) {
      return res.status(400).json({
        success: false,
        message: 'Activation link has expired. Please contact the administrator.'
      });
    }

    // Get user
    const user = await User.findById(tokenDoc.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.status === 'ACTIVE') {
      return res.status(400).json({
        success: false,
        message: 'Account is already activated. Please use the normal login.'
      });
    }

    // Set password (pre-save hook will hash it)
    user.password = password;
    user.status = 'ACTIVE';
    user.activatedAt = new Date();
    await user.save();

    // Mark token as used
    tokenDoc.used = true;
    tokenDoc.usedAt = new Date();
    await tokenDoc.save();

    // Generate JWT for auto-login
    const jwtToken = generateToken(user._id);

    // Set token in cookie
    res.cookie('token', jwtToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.status(200).json({
      success: true,
      message: 'Account activated successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status
      },
      token: jwtToken
    });
  } catch (error) {
    next(error);
  }
};
