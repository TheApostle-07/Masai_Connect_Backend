const mongoose = require('mongoose');

// Define session statuses
const sessionStatuses = {
    SCHEDULED: 'SCHEDULED',
    ONGOING: 'ONGOING',
    COMPLETED: 'COMPLETED',
    CANCELLED: 'CANCELLED',
};

// Define valid platforms
const platforms = {
    GOOGLE: 'GOOGLE',
    ZOOM: 'ZOOM',
};

// Define session schema
const sessionSchema = new mongoose.Schema(
    {
        title: { type: String, required: true },
        description: { type: String },
        mentor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        participants: [
            {
                user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
                email: { type: String, required: true },
                joinedAt: { type: Date },
                leftAt: { type: Date },
            },
        ],
        date: { type: Date, required: true },
        duration: { type: Number, required: true }, // Duration in minutes
        status: { type: String, enum: Object.values(sessionStatuses), default: sessionStatuses.SCHEDULED },
        meetingLink: { type: String, unique: true, required: true },
        platform: { type: String, enum: Object.values(platforms), required: true },
        resources: [{ type: String }], // URLs or file links for resources shared during the session
        reminders: [
            {
                time: { type: Date, required: true },
                sent: { type: Boolean, default: false },
            },
        ],
    },
    { timestamps: true }
);

// **Methods and Statics**

// Check if the session can be edited
sessionSchema.methods.canBeEdited = function () {
    return this.status === sessionStatuses.SCHEDULED;
};

// Add participants to the session
sessionSchema.methods.addParticipants = async function (participantList) {
    const existingEmails = this.participants.map(p => p.email);
    const newParticipants = participantList.filter(p => !existingEmails.includes(p.email));

    if (newParticipants.length > 0) {
        this.participants.push(...newParticipants);
        await this.save();
    }
};

// Get active participants (currently joined)
sessionSchema.methods.getActiveParticipants = function () {
    return this.participants.filter(p => p.joinedAt && !p.leftAt);
};

// Find sessions starting soon (for reminders or scheduling purposes)
sessionSchema.statics.findUpcomingSessions = async function (minutesAhead = 10) {
    const now = new Date();
    const soon = new Date(now.getTime() + minutesAhead * 60000);

    return this.find({
        status: sessionStatuses.SCHEDULED,
        date: { $lte: soon },
    });
};

// Middleware to validate and generate meeting link if necessary
sessionSchema.pre('save', async function (next) {
    if (!this.meetingLink) {
        // Generate meeting link dynamically based on platform
        if (this.platform === platforms.GOOGLE) {
            this.meetingLink = await generateGoogleMeetLink(this.title, this.date, this.duration);
        } else if (this.platform === platforms.ZOOM) {
            this.meetingLink = await generateZoomMeetingLink(this.title, this.date, this.duration);
        }
    }

    if (!this.meetingLink) {
        throw new Error('Meeting link could not be generated.');
    }

    next();
});

// **Helper Functions (imported externally)**

async function generateGoogleMeetLink(title, date, duration) {
    // Mock example: replace with actual Google Calendar API integration
    return `https://meet.google.com/${Math.random().toString(36).substring(2, 12)}`;
}

async function generateZoomMeetingLink(title, date, duration) {
    // Mock example: replace with actual Zoom API integration
    return `https://zoom.us/j/${Math.random().toString().slice(2, 11)}`;
}

module.exports = mongoose.model('Session', sessionSchema);