// controllers/courseController.js

const Course = require('../models/Course');

// Controller to handle fetching course details
const getCourseById = async (req, res) => {
  try {
    const { courseId } = req.params;

    // Fetch course and dynamically populate fields based on query parameters
    const course = await Course.findById(courseId)
      .populate('mentors', 'name email role')  // Customize fields as needed
      .populate('IAs', 'name email role')
      .populate('ECs', 'name email role');

    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    res.status(200).json(course);
  } catch (error) {
    console.error('Error fetching course:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Controller to handle filtering experts based on role
const getCourseExperts = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { role } = req.query;  // e.g., "mentors", "IAs", "ECs"

    // Validate the role parameter
    if (!['mentors', 'IAs', 'ECs'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role specified' });
    }

    // Find the course and only return the requested role array
    const course = await Course.findById(courseId).select(role).populate(role, 'name email role');

    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    res.status(200).json(course[role]);
  } catch (error) {
    console.error('Error fetching course experts:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = { getCourseById, getCourseExperts };