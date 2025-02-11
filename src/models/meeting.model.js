const mongoose = require('mongoose');

const meetingSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: true,
        },
        description: {
            type: String,
            default: '',
        },
        startTime: {
            type: Date,
            required: true,
        },
        duration: {
            type: Number,
            required: true, // Duration in minutes
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,  // Use type here instead of directly assigning a value
            ref: 'User',                           // Reference to the 'User' model
            required: true,
        },
        labels: {
            type: [String], // Array of labels like ['WEB', 'PROJECT_TEAM']
            default: [],
        },
        zoomMeetingId: {
            type: String,
            required: true,
        },
        zoomJoinUrl: {
            type: String,
            required: true,
        },
        zoomStartUrl: {
            type: String,
            required: true,
        },
    },
    {
        timestamps: true, // Automatically adds createdAt and updatedAt fields
    }
);

module.exports = mongoose.model('Meeting', meetingSchema);