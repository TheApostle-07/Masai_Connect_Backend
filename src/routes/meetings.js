const express = require('express');
const router = express.Router();
const Meeting = require('../models/meeting.model');
const zoomService = require('../services/zoom.service');
const mongoose = require('mongoose');  // Import mongoose

// Create a meeting
router.post('/', async (req, res) => {
    try {
        const { title, description, startTime, duration, labels,createdBy } = req.body;

        if (!title || !startTime || !duration || !labels) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        // Create Zoom meeting
        const zoomMeeting = await zoomService.createZoomMeeting({
            topic: title,
            start_time: startTime,
            duration,
            type: 2,
            settings: {
                host_video: true,
                participant_video: true,
            },
        });

        console.log('Zoom meeting response:', zoomMeeting);

        // Save meeting to the database
        const meeting = new Meeting({
            title,
            description,
            startTime,
            duration,
            labels,
            zoomMeetingId: zoomMeeting.zoomMeetingId,
            zoomJoinUrl: zoomMeeting.zoomJoinUrl,
            zoomStartUrl: zoomMeeting.zoomStartUrl,
            createdBy,  
        });

        await meeting.save();

        res.status(201).json({ message: 'Meeting created successfully', meeting });
    } catch (error) {
        console.error('Error creating meeting:', error);
        res.status(500).json({ message: 'Failed to create meeting' });
    }
});

// Get all meetings
router.get('/', async (req, res) => {
    try {
        // Fetch all meetings
        const meetings = await Meeting.find({});
        res.status(200).json({ meetings });
    } catch (error) {
        console.error('Error fetching meetings:', error);
        res.status(500).json({ message: 'Failed to fetch meetings' });
    }
});

// Get a specific meeting by ID
router.get('/:id', async (req, res) => {
    try {
        const meeting = await Meeting.findById(req.params.id);

        if (!meeting) {
            return res.status(404).json({ message: 'Meeting not found' });
        }

        res.status(200).json({ meeting });
    } catch (error) {
        console.error('Error fetching meeting:', error);
        res.status(500).json({ message: 'Failed to fetch meeting' });
    }
});

// Update a meeting by ID
router.put('/:id', async (req, res) => {
    try {
        const { topic, start_time, duration, agenda, labels } = req.body;

        const meeting = await Meeting.findById(req.params.id);
        if (!meeting) {
            return res.status(404).json({ message: 'Meeting not found' });
        }

        // Update the meeting details in Zoom
        await zoomService.updateZoomMeeting(meeting.zoomMeetingId, {
            topic,
            start_time,
            duration,
            agenda,
        });

        // Update the meeting details in the database
        meeting.topic = topic || meeting.topic;
        meeting.start_time = start_time || meeting.start_time;
        meeting.duration = duration || meeting.duration;
        meeting.agenda = agenda || meeting.agenda;
        meeting.labels = labels || meeting.labels;

        await meeting.save();

        res.status(200).json({ message: 'Meeting updated successfully', meeting });
    } catch (error) {
        console.error('Error updating meeting:', error);
        res.status(500).json({ message: 'Failed to update meeting' });
    }
});

// Delete a meeting by ID
router.delete('/:id', async (req, res) => {
    try {
        const meeting = await Meeting.findById(req.params.id);

        if (!meeting) {
            return res.status(404).json({ message: 'Meeting not found' });
        }

        // Delete the meeting from Zoom
        await zoomService.deleteZoomMeeting(meeting.zoomMeetingId);

        // Delete the meeting from the database
        await meeting.remove();

        res.status(200).json({ message: 'Meeting deleted successfully' });
    } catch (error) {
        console.error('Error deleting meeting:', error);
        res.status(500).json({ message: 'Failed to delete meeting' });
    }
});

module.exports = router;