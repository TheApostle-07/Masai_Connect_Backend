const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

const Booking = require('../models/Booking');
const Course = require('../models/Course');
const User = require('../models/user.model');
const { createZoomMeeting } = require('../services/zoom.service');

/**
 * POST /api/bookings
 * Create a new booking.
 * Expected payload:
 * {
 *   student: "<studentId>",
 *   mentor: "<mentorId>",
 *   sessionType: "Mentor Connect",
 *   mode: "Private",
 *   slot: { date: "20-02-2025", time: "10:00 AM - 10:30 AM", slotId: "mon-slot-1" },
 *   agenda: "Discuss project ideas"
 * }
 */
router.post('/bookings', async (req, res) => {
  try {
    const { student, mentor, sessionType, mode, slot, agenda } = req.body;

    // Validate that the student exists.
    const studentDoc = await User.findById(student);
    if (!studentDoc) {
      return res.status(404).json({ error: 'Student not found.' });
    }

    // Validate that the mentor exists.
    const mentorDoc = await User.findById(mentor);
    if (!mentorDoc) {
      return res.status(404).json({ error: 'Mentor not found.' });
    }

    // Validate that the mentor is assigned to one of the student's courses.
    // (Assumes that studentDoc.courses is an array of course codes.)
    const course = await Course.findOne({
      code: { $in: studentDoc.courses },
      mentors: mentor, // Mentor is stored as an ObjectId reference in Course.  
    });
    if (!course) {
      return res.status(403).json({
        error: 'Selected mentor is not available for your enrolled courses.',
      });
    }

    // Prepare meeting details for Zoom.
    // Extract the start time from slot.time. Assumes slot.time is in the format "HH:MM AM/PM - HH:MM AM/PM"
    const [startTimeStr] = slot.time.split(' - ');
    // Assume slot.date is in "dd-mm-yyyy" format.
    const [day, month, year] = slot.date.split('-');
    let [hourStr, minuteStr] = startTimeStr.split(':');
    // The minuteStr will contain AM/PM (e.g., "00 AM"), so split further.
    const [minute, meridian] = minuteStr.split(' ');
    let hour = parseInt(hourStr, 10);
    if (meridian === 'PM' && hour !== 12) {
      hour += 12;
    } else if (meridian === 'AM' && hour === 12) {
      hour = 0;
    }
    const meetingStart = new Date(year, month - 1, day, hour, parseInt(minute, 10));

    const meetingDetails = {
      topic: `${sessionType} - ${agenda.substring(0, 50)}`,
      type: 2, // Scheduled meeting
      start_time: meetingStart.toISOString(),
      duration: 30, // You can adjust this based on your slot duration
      agenda: agenda,
    };

    // Create Zoom meeting.
    const zoomData = await createZoomMeeting(meetingDetails);
    // zoomData should contain: zoomMeetingId, zoomJoinUrl, zoomStartUrl

    // Create and save the booking.
    const booking = new Booking({
      student,
      mentor,
      sessionType,
      mode,
      slot,
      agenda,
      zoomMeetingId: zoomData.zoomMeetingId,
      zoomJoinUrl: zoomData.zoomJoinUrl,
      zoomStartUrl: zoomData.zoomStartUrl,
      status: 'Booked',
    });
    await booking.save();

    return res.status(201).json(booking);
  } catch (err) {
    console.error('Error creating booking:', err);
    return res.status(500).json({ error: 'Failed to create booking.' });
  }
});

/**
 * GET /api/bookings
 * Retrieve bookings for a user (either as student or mentor).
 * Query parameter: user=<userId>
 */
router.get('/bookings', async (req, res) => {
  try {
    const { user } = req.query;
    if (!user) {
      return res.status(400).json({ error: 'User query parameter is required.' });
    }

    const bookings = await Booking.find({
      $or: [{ student: user }, { mentor: user }],
    })
      .populate('student')
      .populate('mentor');

    return res.status(200).json(bookings);
  } catch (err) {
    console.error('Error fetching bookings:', err);
    return res.status(500).json({ error: 'Failed to fetch bookings.' });
  }
});

/**
 * GET /api/bookings/:id
 * Retrieve a single booking by its ID.
 */
router.get('/bookings/:id', async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('student')
      .populate('mentor');
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found.' });
    }
    return res.status(200).json(booking);
  } catch (err) {
    console.error('Error fetching booking:', err);
    return res.status(500).json({ error: 'Failed to fetch booking.' });
  }
});

/**
 * PUT /api/bookings/:id
 * Update a booking (e.g., to reschedule or change status).
 */
router.put('/bookings/:id', async (req, res) => {
  try {
    const updateData = req.body;
    const booking = await Booking.findByIdAndUpdate(req.params.id, updateData, { new: true });
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found.' });
    }
    return res.status(200).json(booking);
  } catch (err) {
    console.error('Error updating booking:', err);
    return res.status(500).json({ error: 'Failed to update booking.' });
  }
});

/**
 * DELETE /api/bookings/:id
 * Delete a booking.
 */
router.delete('/bookings/:id', async (req, res) => {
  try {
    const booking = await Booking.findByIdAndDelete(req.params.id);
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found.' });
    }
    return res.status(200).json({ message: 'Booking deleted successfully.' });
  } catch (err) {
    console.error('Error deleting booking:', err);
    return res.status(500).json({ error: 'Failed to delete booking.' });
  }
});

module.exports = router;