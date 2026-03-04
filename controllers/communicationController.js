const Message = require('../models/Message');
const Announcement = require('../models/Announcement');
const Meeting = require('../models/Meeting');
const User = require('../models/User');

// ============ MESSAGES ============

// @desc    Get all messages for logged-in user
// @route   GET /api/communication/messages
// @access  Private
exports.getMessages = async (req, res) => {
  try {
    const { type = 'received' } = req.query;

    let query;
    if (type === 'sent') {
      query = { sender: req.user.id };
    } else {
      query = { recipient: req.user.id };
    }

    const messages = await Message.find(query)
      .populate('sender', 'name email role avatar')
      .populate('recipient', 'name email role avatar')
      .populate('student', 'firstName lastName')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: messages.length,
      data: messages
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get single message
// @route   GET /api/communication/messages/:id
// @access  Private
exports.getMessage = async (req, res) => {
  try {
    const message = await Message.findById(req.params.id)
      .populate('sender', 'name email role avatar')
      .populate('recipient', 'name email role avatar')
      .populate('student', 'firstName lastName');

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    // Check authorization
    if (message.sender._id.toString() !== req.user.id && 
        message.recipient._id.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this message'
      });
    }

    // Mark as read if recipient is viewing
    if (message.recipient._id.toString() === req.user.id && !message.isRead) {
      message.isRead = true;
      message.readAt = Date.now();
      await message.save();
    }

    res.status(200).json({
      success: true,
      data: message
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Send a message
// @route   POST /api/communication/messages
// @access  Private
exports.sendMessage = async (req, res) => {
  try {
    console.log('Sending message:', JSON.stringify(req.body, null, 2));
    req.body.sender = req.user.id;

    // Fetch sender and recipient roles
    const sender = await User.findById(req.user.id);
    const recipient = await User.findById(req.body.recipient);
    
    console.log('Sender:', sender?.name, sender?.role);
    console.log('Recipient:', recipient?.name, recipient?.role);
    
    if (!recipient) {
      return res.status(400).json({ success: false, message: 'Recipient not found' });
    }

    // Allowed role combinations:
    // parent <-> teacher/admin
    // teacher <-> admin/parent/teacher
    // admin <-> anyone
    const allowed = (
      sender.role === 'admin' || // Admin can message anyone
      recipient.role === 'admin' || // Anyone can message admin
      (sender.role === 'parent' && (recipient.role === 'teacher' || recipient.role === 'admin')) ||
      (sender.role === 'teacher' && (recipient.role === 'parent' || recipient.role === 'admin' || recipient.role === 'teacher'))
    );
    
    console.log('Message allowed:', allowed);
    
    if (!allowed) {
      return res.status(403).json({ success: false, message: 'You are not allowed to send messages to this user.' });
    }

    // Clean up empty student field (when messaging admin directly)
    if (req.body.student === '' || req.body.student === null || req.body.student === undefined) {
      delete req.body.student;
    }

    const message = await Message.create(req.body);

    await message.populate('sender', 'name email role avatar');
    await message.populate('recipient', 'name email role avatar');
    if (message.student) {
      await message.populate('student', 'firstName lastName');
    }

    console.log('Message created successfully:', message._id);

    // TODO: Send real-time notification via Socket.io

    res.status(201).json({
      success: true,
      message: 'Message sent successfully',
      data: message
    });
  } catch (error) {
    console.error('Send message error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Delete message
// @route   DELETE /api/communication/messages/:id
// @access  Private
exports.deleteMessage = async (req, res) => {
  try {
    const message = await Message.findById(req.params.id);

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    // Only sender can delete
    if (message.sender.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this message'
      });
    }

    await message.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Message deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get unread message count
// @route   GET /api/communication/messages/unread/count
// @access  Private
exports.getUnreadCount = async (req, res) => {
  try {
    const count = await Message.countDocuments({
      recipient: req.user.id,
      isRead: false
    });

    res.status(200).json({
      success: true,
      data: { count }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ============ ANNOUNCEMENTS ============

// @desc    Get all announcements
// @route   GET /api/communication/announcements
// @access  Private
exports.getAnnouncements = async (req, res) => {
  try {
    let query = { isActive: true };

    // Filter based on user role
    if (req.user.role === 'parent') {
      query.$or = [
        { targetAudience: 'all' },
        { targetAudience: 'parents' }
      ];
    } else if (req.user.role === 'teacher') {
      query.$or = [
        { targetAudience: 'all' },
        { targetAudience: 'teachers' }
      ];
    }

    const announcements = await Announcement.find(query)
      .populate('author', 'name email role')
      .sort({ isPinned: -1, publishDate: -1 });

    res.status(200).json({
      success: true,
      count: announcements.length,
      data: announcements
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get single announcement
// @route   GET /api/communication/announcements/:id
// @access  Private
exports.getAnnouncement = async (req, res) => {
  try {
    const announcement = await Announcement.findById(req.params.id)
      .populate('author', 'name email role');

    if (!announcement) {
      return res.status(404).json({
        success: false,
        message: 'Announcement not found'
      });
    }

    // Increment view count
    announcement.viewCount += 1;
    await announcement.save();

    res.status(200).json({
      success: true,
      data: announcement
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Create announcement
// @route   POST /api/communication/announcements
// @access  Private (Admin, Teacher)
exports.createAnnouncement = async (req, res) => {
  try {
    req.body.author = req.user.id;

    const announcement = await Announcement.create(req.body);

    await announcement.populate('author', 'name email role');

    res.status(201).json({
      success: true,
      message: 'Announcement created successfully',
      data: announcement
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update announcement
// @route   PUT /api/communication/announcements/:id
// @access  Private (Admin, Author)
exports.updateAnnouncement = async (req, res) => {
  try {
    let announcement = await Announcement.findById(req.params.id);

    if (!announcement) {
      return res.status(404).json({
        success: false,
        message: 'Announcement not found'
      });
    }

    // Check authorization
    if (req.user.role !== 'admin' && announcement.author.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this announcement'
      });
    }

    announcement = await Announcement.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('author', 'name email role');

    res.status(200).json({
      success: true,
      message: 'Announcement updated successfully',
      data: announcement
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Delete announcement
// @route   DELETE /api/communication/announcements/:id
// @access  Private (Admin, Author)
exports.deleteAnnouncement = async (req, res) => {
  try {
    const announcement = await Announcement.findById(req.params.id);

    if (!announcement) {
      return res.status(404).json({
        success: false,
        message: 'Announcement not found'
      });
    }

    if (req.user.role !== 'admin' && announcement.author.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this announcement'
      });
    }

    await announcement.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Announcement deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ============ MEETINGS ============

// @desc    Get all meetings
// @route   GET /api/communication/meetings
// @access  Private
exports.getMeetings = async (req, res) => {
  try {
    const { status, upcoming } = req.query;

    // Build query based on user role and targetAudience
    let query = {
      $or: [
        { organizer: req.user.id },
        { 'participants.user': req.user.id },
        { targetAudience: 'all' },
        { targetAudience: { $exists: false } } // For backward compatibility with old meetings
      ]
    };

    // Add role-specific targetAudience
    if (req.user.role === 'teacher') {
      query.$or.push({ targetAudience: 'teachers' });
    } else if (req.user.role === 'parent') {
      query.$or.push({ targetAudience: 'parents' });
    }

    if (status) {
      query.status = status;
    }

    if (upcoming === 'true') {
      query.meetingDate = { $gte: new Date() };
      query.status = 'scheduled';
    }

    const meetings = await Meeting.find(query)
      .populate('organizer', 'name email role')
      .populate('participants.user', 'name email role')
      .populate('student', 'firstName lastName')
      .sort({ meetingDate: 1 });

    res.status(200).json({
      success: true,
      count: meetings.length,
      data: meetings
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get single meeting
// @route   GET /api/communication/meetings/:id
// @access  Private
exports.getMeeting = async (req, res) => {
  try {
    const meeting = await Meeting.findById(req.params.id)
      .populate('organizer', 'name email role')
      .populate('participants.user', 'name email role')
      .populate('student', 'firstName lastName');

    if (!meeting) {
      return res.status(404).json({
        success: false,
        message: 'Meeting not found'
      });
    }

    res.status(200).json({
      success: true,
      data: meeting
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Create meeting
// @route   POST /api/communication/meetings
// @access  Private
exports.createMeeting = async (req, res) => {
  try {
    req.body.organizer = req.user.id;

    const meeting = await Meeting.create(req.body);

    await meeting.populate('organizer', 'name email role');
    await meeting.populate('participants.user', 'name email role');
    if (meeting.student) {
      await meeting.populate('student', 'firstName lastName');
    }

    // TODO: Send notifications to participants

    res.status(201).json({
      success: true,
      message: 'Meeting scheduled successfully',
      data: meeting
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update meeting
// @route   PUT /api/communication/meetings/:id
// @access  Private (Organizer)
exports.updateMeeting = async (req, res) => {
  try {
    let meeting = await Meeting.findById(req.params.id);

    if (!meeting) {
      return res.status(404).json({
        success: false,
        message: 'Meeting not found'
      });
    }

    if (meeting.organizer.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this meeting'
      });
    }

    meeting = await Meeting.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('organizer', 'name email role')
     .populate('participants.user', 'name email role')
     .populate('student', 'firstName lastName');

    res.status(200).json({
      success: true,
      message: 'Meeting updated successfully',
      data: meeting
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Respond to meeting invitation
// @route   PUT /api/communication/meetings/:id/respond
// @access  Private
exports.respondToMeeting = async (req, res) => {
  try {
    const { status } = req.body; // 'accepted', 'declined', 'tentative'

    const meeting = await Meeting.findById(req.params.id);

    if (!meeting) {
      return res.status(404).json({
        success: false,
        message: 'Meeting not found'
      });
    }

    // Find participant
    const participant = meeting.participants.find(
      p => p.user.toString() === req.user.id
    );

    if (!participant) {
      return res.status(403).json({
        success: false,
        message: 'You are not invited to this meeting'
      });
    }

    participant.status = status;
    participant.responseDate = Date.now();

    await meeting.save();

    res.status(200).json({
      success: true,
      message: `Meeting ${status} successfully`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Delete meeting
// @route   DELETE /api/communication/meetings/:id
// @access  Private (Organizer, Admin)
exports.deleteMeeting = async (req, res) => {
  try {
    const meeting = await Meeting.findById(req.params.id);

    if (!meeting) {
      return res.status(404).json({
        success: false,
        message: 'Meeting not found'
      });
    }

    if (meeting.organizer.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this meeting'
      });
    }

    await meeting.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Meeting deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
