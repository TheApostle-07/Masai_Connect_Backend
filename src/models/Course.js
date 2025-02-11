// models/Course.js

const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true, // e.g. "WEB", "RCT305FSD"
    index: true,
  },
  name: {
    type: String,
    required: true,
  },
  // Arrays of user ObjectIds representing assigned experts
  mentors: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  IAs: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  ECs: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  // You can add additional expert roles as needed (e.g. LEADERSHIP, TEACHER)
}, {
  timestamps: true,
});

module.exports = mongoose.model('Course', courseSchema);