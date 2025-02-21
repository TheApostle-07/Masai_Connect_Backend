const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const Booking = require('../models/Booking');
const { getZoomMeetingParticipants } = require('../services/zoom.service');

const ZOOM_WEBHOOK_SECRET_TOKEN = process.env.ZOOM_WEBHOOK_SECRET_TOKEN || '';

router.post('/webhook', async (req, res) => {
  try {
    const { event, payload } = req.body;
    // For endpoint.url_validation, the token is at payload.plainToken
    if (event === 'endpoint.url_validation') {
      const plainToken = payload && payload.plainToken;
      console.log('Zoom URL Validation Request Received, plainToken=', plainToken);

      if (!plainToken) {
        // If for some reason no plainToken is provided, respond 400
        return res.status(400).json({ error: 'No plainToken in validation request.' });
      }

      // Create HMAC SHA-256 using your Zoom Webhook Secret
      const hashForValidate = crypto
        .createHmac('sha256', ZOOM_WEBHOOK_SECRET_TOKEN)
        .update(plainToken)
        .digest('hex');

      // Return the challenge response
      return res.status(200).json({
        plainToken,
        encryptedToken: hashForValidate,
      });
    }

    // If not endpoint.url_validation, handle normal events (meeting.ended, etc.)

    if (!payload) {
      console.log('No payload for Zoom event:', req.body);
      return res.status(400).json({ error: 'No payload found in Zoom event.' });
    }

    if (!payload.object) {
      console.log('Missing payload.object for Zoom event:', req.body);
      // Possibly it's an event you don't handle. Return 200 so Zoom doesn't keep retrying.
      return res.status(200).send('No payload.object for this event');
    }

    const zoomMeetingId = payload.object.id;

    // Example: participant joined
    if (event === 'meeting.participant_joined') {
      const participantEmail = payload.object.participant?.email;
      console.log(`Participant joined: ${participantEmail} in Meeting ID: ${zoomMeetingId}`);

      // ... update booking ...
      return res.status(200).send('Participant joined processed');
    }

    // meeting.ended
    if (event === 'meeting.ended') {
      console.log(`Meeting ended. Zoom Meeting ID: ${zoomMeetingId}`);
      // ... update booking ...
      return res.status(200).send('Meeting ended processed');
    }

    // If event not recognized
    return res.status(200).send('Event not handled');
  } catch (error) {
    console.error('Error handling Zoom webhook:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
