const mongoose = require('mongoose');

const meetingSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  organizer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Organizer is required']
  },
  participants: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'declined', 'tentative'],
      default: 'pending'
    },
    responseDate: Date
  }],
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student'
  },
  targetAudience: {
    type: String,
    enum: ['all', 'parents', 'teachers', 'specific_class'],
    default: 'all'
  },
  type: {
    type: String,
    enum: ['parent-teacher', 'staff', 'class', 'individual', 'other'],
    default: 'parent-teacher'
  },
  meetingDate: {
    type: Date,
    required: [true, 'Meeting date is required']
  },
  startTime: {
    type: String,
    required: [true, 'Start time is required']
  },
  endTime: {
    type: String,
    required: [true, 'End time is required']
  },
  location: {
    type: String,
    trim: true
  },
  meetingLink: {
    type: String,
    trim: true
  },
  agenda: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['scheduled', 'completed', 'cancelled', 'rescheduled'],
    default: 'scheduled'
  },
  notes: {
    type: String,
    trim: true
  },
  reminders: [{
    reminderDate: Date,
    sent: {
      type: Boolean,
      default: false
    }
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index for faster queries
meetingSchema.index({ meetingDate: 1, status: 1 });
meetingSchema.index({ organizer: 1 });
meetingSchema.index({ 'participants.user': 1 });

module.exports = mongoose.model('Meeting', meetingSchema);
