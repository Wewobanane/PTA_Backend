const mongoose = require('mongoose');

const behaviorSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: [true, 'Student is required']
  },
  teacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Teacher is required']
  },
  type: {
    type: String,
    enum: ['positive', 'negative'],
    required: [true, 'Behavior type is required']
  },
  category: {
    type: String,
    enum: [
      'participation',
      'homework',
      'conduct',
      'attendance',
      'leadership',
      'disruption',
      'lateness',
      'misconduct',
      'bullying',
      'respect',
      'cooperation',
      'other'
    ],
    required: [true, 'Category is required']
  },
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true
  },
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  date: {
    type: Date,
    default: Date.now
  },
  actionTaken: {
    type: String,
    trim: true
  },
  parentNotified: {
    type: Boolean,
    default: false
  },
  parentResponse: {
    type: String,
    trim: true
  },
  followUpRequired: {
    type: Boolean,
    default: false
  },
  followUpDate: {
    type: Date
  },
  attachments: [{
    filename: String,
    url: String
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Indexes for faster queries
behaviorSchema.index({ student: 1, date: -1 });
behaviorSchema.index({ teacher: 1 });
behaviorSchema.index({ type: 1 });
behaviorSchema.index({ category: 1 });
behaviorSchema.index({ severity: 1 });

module.exports = mongoose.model('Behavior', behaviorSchema);
