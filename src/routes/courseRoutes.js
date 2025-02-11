// routes/courseRoutes.js

const express = require('express');
const router = express.Router();
const { getCourseById, getCourseExperts } = require('../controllers/courseController');

// Route to get full course details
router.get('/:courseId', getCourseById);

// Route to filter experts based on role
router.get('/:courseId/experts', getCourseExperts);

module.exports = router;