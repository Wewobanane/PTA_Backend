const mongoose = require('mongoose');

const inviteTokenSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  token: {
    type: String,
    required: true
    // unique: true moved to schema.index() below
  },
  type: {
    type: String,
    enum: ['ACTIVATION', 'PASSWORD_RESET'],
    required: true
  },
  expiresAt: {
    type: Date,
    required: true
  },
  used: {
    type: Boolean,
    default: false
  },
  usedAt: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Indexes for performance
inviteTokenSchema.index({ token: 1 }, { unique: true });
inviteTokenSchema.index({ userId: 1 });
inviteTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // Auto-delete expired tokens
inviteTokenSchema.index({ used: 1 });

module.exports = mongoose.model('InviteToken', inviteTokenSchema);
