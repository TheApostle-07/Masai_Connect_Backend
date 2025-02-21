// zoomWebhookRoutes.js

const express = require('express');
const crypto = require('crypto'); // For HMAC
const router = express.Router();
const Booking = require('../models/Booking');
const { getZoomMeetingParticipants } = require('../services/zoom.service');

// Zoom Webhook secret token from environment
const ZOOM_WEBHOOK_SECRET_TOKEN = process.env.ZOOM_WEBHOOK_SECRET_TOKEN || '';

router.post('/webhook', async (req, res) => {
  try {
    const { event, payload, plainToken } = req.body;

    /**
     * 1) Handle Zoom URL validation: "endpoint.url_validation" event
     *    (Zoom calls this a Challenge-Response Check)
     */
    if (event === 'endpoint.url_validation' && plainToken) {
      console.log('Zoom URL Validation Request Received');

      // Use the Zoom Webhook Secret to create an HMAC SHA-256 of the plainToken
      const hashForValidate = crypto
        .createHmac('sha256', ZOOM_WEBHOOK_SECRET_TOKEN)
        .update(plainToken)
        .digest('hex');

      // Respond with the original plainToken and the HMAC-hex as encryptedToken
      return res.status(200).json({
        plainToken,
        encryptedToken: hashForValidate,
      });
    }

    /**
     * 2) For real events (e.g. "meeting.participant_joined", "meeting.ended"),
     *    Zoom includes 'payload.object'
     */
    if (!payload || !payload.object) {
      console.log('Invalid or missing payload:', req.body);
      return res.status(400).json({ error: 'Invalid Zoom event payload.' });
    }

    const zoomMeetingId = payload.object.id;

    // (A) MEETING.PARTICIPANT_JOINED
    if (event === 'meeting.participant_joined') {
      console.log(`Participant joined meeting ID: ${zoomMeetingId}`);
      const participantEmail = payload.object.participant.email;

      // Update booking's mentorJoined / studentJoined flags
      const booking = await Booking.findOne({ zoomMeetingId });
      if (booking) {
        if (participantEmail === booking.mentorEmail) {
          booking.mentorJoined = true;
          await booking.save();
        } else if (participantEmail === booking.studentEmail) {
          booking.studentJoined = true;
          await booking.save();
        }
      }

      return res.status(200).send('Participant joined processed');
    }

    // (B) MEETING.ENDED
    if (event === 'meeting.ended') {
      console.log(`Meeting ended. Zoom Meeting ID: ${zoomMeetingId}`);

      const booking = await Booking.findOne({ zoomMeetingId });
      if (!booking) {
        console.log('No matching booking found');
        return res.status(200).send('No booking found');
      }

      // Option 1: If you have a Paid Zoom account and want to call /report/meetings/...
      //   const participants = await getZoomMeetingParticipants(zoomMeetingId);

      // Option 2: If you only have a free account, rely on participant_joined events.
      // Mark no-shows based on who joined

      if (!booking.mentorJoined) {
        booking.mentorNoShow = true;
      }
      if (!booking.studentJoined) {
        booking.studentNoShow = true;
      }

      booking.status = 'Completed';
      await booking.save();
      console.log('Updated booking after meeting end:', booking._id);

      return res.status(200).send('Meeting ended processed');
    }

    // If we get here, we haven't handled the event
    return res.status(200).send('Event not handled');
  } catch (error) {
    console.error('Error handling Zoom webhook:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
