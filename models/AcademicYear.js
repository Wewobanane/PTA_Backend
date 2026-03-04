const mongoose = require('mongoose');

const termSchema = new mongoose.Schema({
  termNumber: {
    type: Number,
    required: true,
    min: 1,
    max: 4
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  }
}, { _id: true });

const academicYearSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Academic year name is required'],
    trim: true
  },
  classLevel: {
    type: String,
    required: [true, 'Class level is required'],
    trim: true
  },
  currentTermNumber: {
    type: Number,
    default: null,
    min: 1,
    max: 4
  },
  terms: [termSchema],
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('AcademicYear', academicYearSchema);
