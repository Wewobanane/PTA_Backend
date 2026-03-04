const mongoose = require('mongoose');

const gradeSchema = new mongoose.Schema({
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
  subject: {
    type: String,
    required: [true, 'Subject is required'],
    trim: true
  },
  assessmentType: {
    type: String,
    enum: ['homework', 'quiz', 'test', 'exam', 'project', 'assignment', 'classwork'],
    required: [true, 'Assessment type is required']
  },
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  score: {
    type: Number,
    required: [true, 'Score is required'],
    min: 0
  },
  maxScore: {
    type: Number,
    required: [true, 'Max score is required'],
    min: 0
  },
  percentage: {
    type: Number,
    min: 0,
    max: 100
  },
  grade: {
    type: String,
    enum: ['A+', 'A', 'B+', 'B', 'C+', 'C', 'D', 'F'],
    trim: true
  },
  date: {
    type: Date,
    default: Date.now
  },
  term: {
    type: String,
    enum: ['1st', '2nd', '3rd', 'final'],
    required: true
  },
  academicYear: {
    type: String,
    required: true
  },
  comments: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['submitted', 'graded', 'late', 'missing'],
    default: 'graded'
  },
  submissionDate: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Calculate percentage before saving
gradeSchema.pre('save', function() {
  if (this.score && this.maxScore) {
    this.percentage = Math.round((this.score / this.maxScore) * 100);
    
    // Auto-assign grade based on percentage
    if (this.percentage >= 97) this.grade = 'A+';
    else if (this.percentage >= 93) this.grade = 'A';
    else if (this.percentage >= 87) this.grade = 'B+';
    else if (this.percentage >= 83) this.grade = 'B';
    else if (this.percentage >= 77) this.grade = 'C+';
    else if (this.percentage >= 73) this.grade = 'C';
    else if (this.percentage >= 60) this.grade = 'D';
    else this.grade = 'F';
  }
});

// Index for faster queries
gradeSchema.index({ student: 1, subject: 1, date: -1 });

module.exports = mongoose.model('Grade', gradeSchema);
