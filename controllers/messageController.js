const Message = require('../models/Message');
const User = require('../models/User');
const Student = require('../models/Student');

// Send a message (parent to teacher/admin, teacher/admin to parent)
exports.sendMessage = async (req, res) => {
  try {
    const { recipient, student, subject, message, priority, category, attachments, replyTo } = req.body;
    const sender = req.user._id;

    // Optionally validate recipient, student, etc. here
    const newMessage = await Message.create({
      sender,
      recipient,
      student,
      subject,
      message,
      priority,
      category,
      attachments,
      replyTo
    });
    res.status(201).json({ success: true, data: newMessage });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// Get all messages for the logged-in user (inbox)
exports.getInbox = async (req, res) => {
  try {
    const userId = req.user._id;
    const messages = await Message.find({ recipient: userId })
      .populate('sender', 'name role')
      .populate('student', 'name')
      .sort({ createdAt: -1 });
    res.json({ success: true, data: messages });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Get all sent messages for the logged-in user
exports.getSent = async (req, res) => {
  try {
    const userId = req.user._id;
    const messages = await Message.find({ sender: userId })
      .populate('recipient', 'name role')
      .populate('student', 'name')
      .sort({ createdAt: -1 });
    res.json({ success: true, data: messages });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Mark a message as read
exports.markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const message = await Message.findByIdAndUpdate(
      id,
      { isRead: true, readAt: new Date() },
      { new: true }
    );
    if (!message) return res.status(404).json({ success: false, error: 'Message not found' });
    res.json({ success: true, data: message });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Get a single message (if sender or recipient)
exports.getMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;
    const message = await Message.findOne({
      _id: id,
      $or: [{ sender: userId }, { recipient: userId }]
    })
      .populate('sender', 'name role')
      .populate('recipient', 'name role')
      .populate('student', 'name');
    if (!message) return res.status(404).json({ success: false, error: 'Message not found' });
    res.json({ success: true, data: message });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
