// zoomWebhookRoutes.js
const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const Booking = require('../models/Booking');
const { getZoomMeetingParticipants } = require('../services/zoom.service');

const ZOOM_WEBHOOK_SECRET_TOKEN = process.env.ZOOM_WEBHOOK_SECRET_TOKEN || '';

router.post('/webhook', async (req, res) => {
  try {
    const { event, payload, plainToken } = req.body;

    // 1) Zoom URL Validation
    if (event === 'endpoint.url_validation' && plainToken) {
      console.log('Zoom URL Validation Request Received');

      // Create HMAC for the plainToken
      const hashForValidate = crypto
        .createHmac('sha256', ZOOM_WEBHOOK_SECRET_TOKEN)
        .update(plainToken)
        .digest('hex');

      // Return the required response
      return res.status(200).json({
        plainToken,
        encryptedToken: hashForValidate,
      });
    }

    // 2) Now handle normal Zoom events that have payload.object
    // If it's not endpoint.url_validation, we expect a real event like meeting.ended, etc.

    if (!payload) {
      console.log('No payload for Zoom event:', req.body);
      return res.status(400).json({ error: 'No payload found in Zoom event.' });
    }

    // Some events like `meeting.ended` or `meeting.participant_joined` require `payload.object`.
    if (!payload.object) {
      console.log('Missing payload.object for Zoom event:', req.body);
      return res.status(400).json({ error: 'Missing payload.object in Zoom event.' });
    }

    const zoomMeetingId = payload.object.id;

    if (event === 'meeting.participant_joined') {
      const participantEmail = payload.object.participant.email;
      console.log(`Participant joined: ${participantEmail} in Meeting ID: ${zoomMeetingId}`);
      // ... update booking ...
      return res.status(200).send('Participant joined processed');
    }

    if (event === 'meeting.ended') {
      console.log(`Meeting ended. Zoom Meeting ID: ${zoomMeetingId}`);
      // ... update booking ...
      return res.status(200).send('Meeting ended processed');
    }

    // If we get here, event not handled
    return res.status(200).send('Event not handled');
  } catch (error) {
    console.error('Error handling Zoom webhook:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
