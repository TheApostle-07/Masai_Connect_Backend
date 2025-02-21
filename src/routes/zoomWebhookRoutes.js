// zoomWebhookRoutes.js

const express = require('express');
const router = express.Router();
const Booking = require('../models/Booking');  // or your booking model
const { getZoomMeetingParticipants } = require('../services/zoom.service');

router.post('/webhook', async (req, res) => {
  try {
    const { event, payload, plainToken } = req.body;

    // 🔑 Handle Zoom URL Validation Request
    if (plainToken) {
      console.log('Zoom URL Validation Request Received');
      return res.status(200).json({
        plainToken, // Send back the received plainToken
        encryptedToken: plainToken, // In production, use HMAC SHA-256 for token encryption
      });
    }

    // Handle meeting events
    const zoomMeetingId = payload.object.id;

    if (event === 'meeting.participant_joined') {
      const participantEmail = payload.object.participant.email;

      console.log(`Participant joined: ${participantEmail} in Meeting ID: ${zoomMeetingId}`);

      const booking = await Booking.findOne({ zoomMeetingId });
      if (booking) {
        if (participantEmail === booking.mentorEmail) {
          booking.mentorJoined = true;
        } else if (participantEmail === booking.studentEmail) {
          booking.studentJoined = true;
        }
        await booking.save();
      }
    }

    if (event === 'meeting.ended') {
      console.log(`Meeting ended. Zoom Meeting ID: ${zoomMeetingId}`);

      const booking = await Booking.findOne({ zoomMeetingId });
      if (!booking) {
        console.log('No matching booking found.');
        return res.status(200).send('No booking found');
      }

      if (!booking.mentorJoined) booking.mentorNoShow = true;
      if (!booking.studentJoined) booking.studentNoShow = true;

      booking.status = 'Completed';
      await booking.save();

      console.log('Updated booking after meeting end:', booking._id);
    }

    return res.status(200).send('Webhook processed successfully');
  } catch (error) {
    console.error('Error handling Zoom webhook:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
