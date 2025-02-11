const Session = require('../models/Sessions');
const User = require('../models/User');
const { roles, permissions } = require('../models/User');

// ** Create a session **
async function createSession(req, res) {
    try {
        const { title, description, date, duration, mentorId, platform } = req.body;

        // Validate input
        if (!title || !date || !duration || !mentorId || !platform) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Check if the mentor exists and has permission to create a session
        const mentor = await User.findById(mentorId);
        if (!mentor || !mentor.hasPermission(permissions.CREATE_MEETING)) {
            return res.status(403).json({ error: 'Unauthorized mentor or invalid permissions' });
        }

        // Create and save the session
        const session = new Session({
            title,
            description,
            date,
            duration,
            mentor: mentorId,
            platform,
        });

        // Save and send response
        await session.save();
        res.status(201).json(session);
    } catch (error) {
        console.error('Error creating session:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

// ** Fetch all sessions (Admin view) **
async function getAllSessions(req, res) {
    try {
        const sessions = await Session.find().populate('mentor', 'name email');
        res.json(sessions);
    } catch (error) {
        console.error('Error fetching sessions:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

// ** Fetch upcoming sessions for a specific mentor or user **
async function getUserSessions(req, res) {
    try {
        const userId = req.params.userId;
        const sessions = await Session.find({
            $or: [{ mentor: userId }, { 'participants.user': userId }],
            status: { $in: ['SCHEDULED', 'ONGOING'] },
        }).populate('mentor', 'name email');

        res.json(sessions);
    } catch (error) {
        console.error('Error fetching user sessions:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

// ** Update session details **
async function updateSession(req, res) {
    try {
        const sessionId = req.params.id;
        const updates = req.body;

        const session = await Session.findById(sessionId);
        if (!session) {
            return res.status(404).json({ error: 'Session not found' });
        }

        // Check if the session can be edited
        if (!session.canBeEdited()) {
            return res.status(400).json({ error: 'Cannot edit a non-scheduled session' });
        }

        // Update session details
        Object.assign(session, updates);
        await session.save();

        res.json(session);
    } catch (error) {
        console.error('Error updating session:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

// ** Delete a session **
async function deleteSession(req, res) {
    try {
        const sessionId = req.params.id;

        const session = await Session.findById(sessionId);
        if (!session) {
            return res.status(404).json({ error: 'Session not found' });
        }

        await session.remove();
        res.json({ message: 'Session deleted successfully' });
    } catch (error) {
        console.error('Error deleting session:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

// ** Send reminders for upcoming sessions **
async function sendSessionReminders(req, res) {
    try {
        const upcomingSessions = await Session.findUpcomingSessions(10); // Find sessions starting within 10 minutes

        for (const session of upcomingSessions) {
            for (const reminder of session.reminders) {
                if (!reminder.sent && reminder.time <= new Date()) {
                    // Send reminder logic here (e.g., email or notification)
                    console.log(`Sending reminder for session: ${session.title}`);

                    // Mark reminder as sent
                    reminder.sent = true;
                }
            }

            await session.save();
        }

        res.json({ message: 'Reminders sent successfully' });
    } catch (error) {
        console.error('Error sending reminders:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

module.exports = {
    createSession,
    getAllSessions,
    getUserSessions,
    updateSession,
    deleteSession,
    sendSessionReminders,
};