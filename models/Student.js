const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
  firstName: { type: String, required: [true, 'First name is required'], trim: true },
  lastName: { type: String, required: [true, 'Last name is required'], trim: true },
  dateOfBirth: { type: Date, required: [true, 'Date of birth is required'] },
  gender: { type: String, enum: ['male', 'female', 'other'], required: true },
  class: { type: String, required: [true, 'Class is required'] },
  section: { type: String, default: 'A' },
  academicYearId: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicYear', default: null },
  currentTermNumber: { type: Number, default: null },
  rollNumber: { type: String },
  parents: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  avatar: { type: String, default: '' },
  address: { street: String, city: String, state: String, zipCode: String },
  emergencyContact: { name: String, phone: String, relation: String },
  medicalInfo: { bloodGroup: String, allergies: [String], medications: [String] },
  isActive: { type: Boolean, default: true },
  enrollmentDate: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now }
});

// Indexes for faster queries
studentSchema.index({ class: 1, rollNumber: 1 });
studentSchema.index({ firstName: 1, lastName: 1 });
studentSchema.index({ parents: 1 });
studentSchema.index({ isActive: 1 });

module.exports = mongoose.model('Student', studentSchema);