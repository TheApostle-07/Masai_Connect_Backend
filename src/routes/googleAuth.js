const { google } = require('googleapis');
const express = require('express');

const router = express.Router();

// Initialize OAuth2 client with environment variables
const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
);

console.log('Client ID:', process.env.GOOGLE_CLIENT_ID);
console.log('Redirect URI:', process.env.GOOGLE_REDIRECT_URI);

// Helper to set OAuth credentials
const setCredentials = async (tokens) => {
    oauth2Client.setCredentials(tokens);

    // Optionally handle storing the refresh token securely
    if (tokens.refresh_token) {
        console.log('New refresh token received:', tokens.refresh_token);
        // You can save this to your database if needed
    }
};

// Route to initiate OAuth flow
router.get('/auth/google', (req, res) => {
    const authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: ['https://www.googleapis.com/auth/calendar', 'https://www.googleapis.com/auth/userinfo.profile'],
    });
    res.redirect(authUrl);
});

router.get('/google/callback', async (req, res) => {
    const { code } = req.query;

    try {
        // Exchange authorization code for tokens
        const { tokens } = await oauth2Client.getToken(code);

        if (!tokens || !tokens.access_token) {
            return res.status(401).json({ error: 'Failed to retrieve access token.' });
        }

        // Store credentials and set the access token
        await setCredentials(tokens);

        console.log('OAuth tokens received:', tokens);

        // Store access token in cookies
        res.cookie('google_access_token', tokens.access_token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 3600 * 1000,  // 1-hour expiry
        });

        res.redirect('/dashboard');  // Redirect to a dashboard or success page

    } catch (error) {
        console.error('OAuth callback error:', error);
        res.status(500).json({ error: 'Failed to authenticate with Google' });
    }
});
// Middleware to ensure authentication before creating events
const ensureAuth = (req, res, next) => {
    const token = req.cookies.google_access_token;

    if (!token) {
        console.error('Access token missing from cookies.');
        return res.status(401).json({ error: 'Unauthorized. Token is required.' });
    }

    // Set the token in OAuth2 client
    oauth2Client.setCredentials({ access_token: token });

    next();
};

// Route to create a Google Calendar event with Google Meet link
router.post('/calendar/create-event', ensureAuth, async (req, res) => {
    const { summary, description, startDateTime, endDateTime, attendees, timeZone = 'UTC' } = req.body;

    try {
        const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

        const event = {
            summary,
            location: 'Online Meeting (Google Meet)',
            description,
            start: {
                dateTime: startDateTime,
                timeZone,
            },
            end: {
                dateTime: endDateTime,
                timeZone,
            },
            attendees: attendees.map(email => ({ email })),
            conferenceData: {
                createRequest: {
                    requestId: `req-${Date.now()}`,
                    conferenceSolutionKey: {
                        type: 'hangoutsMeet',
                    },
                },
            },
            reminders: {
                useDefault: false,
                overrides: [
                    { method: 'email', minutes: 30 },
                    { method: 'popup', minutes: 10 },
                ],
            },
        };

        const response = await calendar.events.insert({
            calendarId: 'primary',
            resource: event,
            conferenceDataVersion: 1,
        });

        res.json({ message: 'Meeting created successfully', meetLink: response.data.hangoutLink });
    } catch (error) {
        console.error('Error creating event:', error);
        res.status(500).json({ error: 'Failed to create meeting' });
    }
});

// Route to list all events from Google Calendar
router.get('/calendar/events', ensureAuth, async (req, res) => {
    try {
        const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

        const events = await calendar.events.list({
            calendarId: 'primary',
            maxResults: 10,
            singleEvents: true,
            orderBy: 'startTime',
        });

        res.json(events.data.items);
    } catch (error) {
        console.error('Error fetching events:', error);
        res.status(500).json({ error: 'Failed to fetch events' });
    }
});

module.exports = router;