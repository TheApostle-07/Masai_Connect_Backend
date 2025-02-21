// zoomWebhookRoutes.js

const express = require('express');
const router = express.Router();
const Booking = require('../models/Booking');  // or your booking model
const { getZoomMeetingParticipants } = require('../services/zoom.service');

router.post('/webhook', async (req, res) => {
  try {
    const { event, payload } = req.body;

    // We only care about meeting.ended
    if (event === 'meeting.ended') {
      const zoomMeetingId = payload.object.id; // numeric meeting ID
      console.log(`Meeting ended. Zoom Meeting ID: ${zoomMeetingId}`);

      // 1) Find local booking by zoomMeetingId
      const booking = await Booking.findOne({ zoomMeetingId });
      if (!booking) {
        console.log('No matching booking found for zoomMeetingId=', zoomMeetingId);
        return res.status(200).send('No booking found');
      }

      // 2) Retrieve participants from Zoom
      const participants = await getZoomMeetingParticipants(zoomMeetingId);

      // Suppose you have booking.mentorEmail, booking.studentEmail
      // (You could also populate booking.mentor and booking.student docs to get their emails.)
      const mentorEmail = booking.mentorEmail || 'mentor@example.com';
      const studentEmail = booking.studentEmail || 'student@example.com';

      // 3) Check who joined
      const mentorJoined = participants.some(
        (p) => p.user_email?.toLowerCase() === mentorEmail.toLowerCase()
      );
      const studentJoined = participants.some(
        (p) => p.user_email?.toLowerCase() === studentEmail.toLowerCase()
      );

      // 4) Mark no-shows
      if (!mentorJoined) booking.mentorNoShow = true;
      if (!studentJoined) booking.studentNoShow = true;

      // 5) Mark the booking as completed
      booking.status = 'Completed';
      await booking.save();

      console.log('Updated booking with no-show info:', booking._id);
      return res.status(200).send('Webhook processed successfully');
    }

    // Otherwise, just respond
    return res.status(200).send('Event not handled');
  } catch (error) {
    console.error('Error handling Zoom webhook:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
