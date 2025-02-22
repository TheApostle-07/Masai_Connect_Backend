// zoomWebhookRoutes.js

const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const Booking = require('../models/Booking');
const { getZoomMeetingParticipants } = require('../services/zoom.service');

const ZOOM_WEBHOOK_SECRET_TOKEN = process.env.ZOOM_WEBHOOK_SECRET_TOKEN || '';

router.post('/webhook', async (req, res) => {
  try {
    const { event, payload } = req.body;

    // 1) Zoom URL Validation (Challenge-Response)
    if (event === 'endpoint.url_validation') {
      const plainToken = payload && payload.plainToken;
      console.log('Zoom URL Validation Request Received, plainToken =', plainToken);
      if (!plainToken) {
        return res.status(400).json({ error: 'No plainToken in validation request.' });
      }
      const hashForValidate = crypto
        .createHmac('sha256', ZOOM_WEBHOOK_SECRET_TOKEN)
        .update(plainToken)
        .digest('hex');
      return res.status(200).json({
        plainToken,
        encryptedToken: hashForValidate,
      });
    }

    // 2) Handle regular Zoom events
    if (!payload) {
      console.log('No payload for Zoom event:', req.body);
      return res.status(400).json({ error: 'No payload found in Zoom event.' });
    }
    if (!payload.object) {
      console.log('Missing payload.object for Zoom event:', req.body);
      // Return 200 so that Zoom stops retrying if it’s an unhandled event.
      return res.status(200).send('No payload.object for this event');
    }

    // Get the Zoom meeting ID from the payload
    const zoomMeetingId = payload.object.id;
    console.log(`Received Zoom event: ${event} for Meeting ID: ${zoomMeetingId}`);

    // 2A) Handle participant_joined event to update live attendance flags
    if (event === 'meeting.participant_joined') {
      const participantEmail = payload.object.participant?.email;
      console.log(`Participant joined: ${participantEmail}`);
      
      // Find the booking by Zoom meeting ID
      const booking = await Booking.findOne({ zoomMeetingId });
      if (!booking) {
        console.log('No booking found for meeting ID:', zoomMeetingId);
        return res.status(200).send('No booking found');
      }
      
      // Populate mentor and student documents so we can compare emails
      await booking.populate('mentor');
      await booking.populate('student');
      const mentorEmail = booking.mentor.email;
      const studentEmail = booking.student.email;
      
      if (participantEmail && participantEmail.toLowerCase() === mentorEmail.toLowerCase()) {
        booking.mentorJoined = true;
      }
      if (participantEmail && participantEmail.toLowerCase() === studentEmail.toLowerCase()) {
        booking.studentJoined = true;
      }
      
      await booking.save();
      console.log('Updated booking attendance flags:', {
        mentorJoined: booking.mentorJoined,
        studentJoined: booking.studentJoined,
      });
      return res.status(200).send('Participant joined processed');
    }

    // 2B) Handle meeting.ended event to finalize attendance
    if (event === 'meeting.ended') {
      console.log(`Meeting ended event for Meeting ID: ${zoomMeetingId}`);
      
      // Find the booking corresponding to this Zoom meeting
      const booking = await Booking.findOne({ zoomMeetingId });
      if (!booking) {
        console.log('No booking found for meeting ID:', zoomMeetingId);
        return res.status(200).send('No booking found');
      }
      
      // Retrieve the list of participants from Zoom via your service function
      const participants = await getZoomMeetingParticipants(zoomMeetingId);
      console.log('Retrieved participants:', participants);
      
      // Populate mentor and student to retrieve their email addresses
      await booking.populate('mentor');
      await booking.populate('student');
      const mentorEmail = booking.mentor.email;
      const studentEmail = booking.student.email;
      
      // Determine attendance: if the participant’s email appears in the list, mark them as joined.
      const mentorJoined = participants.some(p => p.user_email?.toLowerCase() === mentorEmail.toLowerCase());
      const studentJoined = participants.some(p => p.user_email?.toLowerCase() === studentEmail.toLowerCase());
      
      // Update booking attendance flags accordingly.
      booking.mentorJoined = mentorJoined;
      booking.studentJoined = studentJoined;
      // If a user did not join, mark them as no-show.
      booking.mentorNoShow = !mentorJoined;
      booking.studentNoShow = !studentJoined;
      
      // Mark the booking as completed.
      booking.status = 'Completed';
      
      await booking.save();
      console.log('Meeting ended processed. Updated booking:', booking);
      return res.status(200).send('Meeting ended processed');
    }
    
    // For unrecognized events, simply return success.
    return res.status(200).send('Event not handled');
  } catch (error) {
    console.error('Error handling Zoom webhook:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
