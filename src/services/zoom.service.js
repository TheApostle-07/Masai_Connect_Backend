const axios = require('axios');

const ZOOM_CLIENT_ID = process.env.ZOOM_CLIENT_ID;
const ZOOM_CLIENT_SECRET = process.env.ZOOM_CLIENT_SECRET;
const ZOOM_ACCOUNT_ID = process.env.ZOOM_ACCOUNT_ID;
const ZOOM_TOKEN_URL = process.env.ZOOM_TOKEN_URL || 'https://zoom.us/oauth/token';
const ZOOM_API_BASE_URL = process.env.ZOOM_API_BASE_URL || 'https://api.zoom.us/v2';

// Generate OAuth token to access Zoom API
async function getZoomAccessToken() {
    try {
        console.log('Requesting Zoom access token...');
        
        const response = await axios.post(
            ZOOM_TOKEN_URL,
            new URLSearchParams({
                grant_type: 'account_credentials',
                account_id: ZOOM_ACCOUNT_ID,
            }).toString(),
            {
                headers: {
                    Authorization: `Basic ${Buffer.from(`${ZOOM_CLIENT_ID}:${ZOOM_CLIENT_SECRET}`).toString('base64')}`,
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
            }
        );

        console.log('Zoom access token response:', response.data);
        return response.data.access_token;
    } catch (error) {
        console.error('Error fetching Zoom access token:', error.response?.data || error.message);
        throw new Error('Failed to get Zoom access token');
    }
}

// Create a Zoom meeting
async function createZoomMeeting(meetingDetails) {
    try {
        const accessToken = await getZoomAccessToken();

        console.log('Creating Zoom meeting with details:', meetingDetails);

        const response = await axios.post(
            `${ZOOM_API_BASE_URL}/users/me/meetings`,
            {
                topic: meetingDetails.topic,
                type: meetingDetails.type || 2,
                start_time: meetingDetails.start_time,
                duration: meetingDetails.duration,
                agenda: meetingDetails.agenda || '',
                settings: meetingDetails.settings || {
                    host_video: true,
                    participant_video: true,
                    join_before_host: false,
                    mute_upon_entry: true,
                    waiting_room: true,
                },
            },
            {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        console.log('Zoom meeting created successfully:', response.data);

        const { id, join_url, start_url } = response.data;

        return {
            zoomMeetingId: id,
            zoomJoinUrl: join_url,
            zoomStartUrl: start_url,
        };
    } catch (error) {
        console.error('Error creating Zoom meeting:', error.response?.data || error.message);
        throw new Error('Failed to create Zoom meeting');
    }
}

// Get a Zoom meeting by ID
async function getZoomMeeting(meetingId) {
    try {
        const accessToken = await getZoomAccessToken();

        const response = await axios.get(`${ZOOM_API_BASE_URL}/meetings/${meetingId}`, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
        });

        return response.data;
    } catch (error) {
        console.error('Error fetching Zoom meeting:', error.response?.data || error.message);
        throw new Error('Failed to fetch Zoom meeting');
    }
}

// Update a Zoom meeting by ID
async function updateZoomMeeting(meetingId, meetingDetails) {
    try {
        const accessToken = await getZoomAccessToken();

        await axios.patch(
            `${ZOOM_API_BASE_URL}/meetings/${meetingId}`,
            meetingDetails,
            {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        return true;
    } catch (error) {
        console.error('Error updating Zoom meeting:', error.response?.data || error.message);
        throw new Error('Failed to update Zoom meeting');
    }
}

// Delete a Zoom meeting by ID
async function deleteZoomMeeting(meetingId) {
    try {
        const accessToken = await getZoomAccessToken();

        await axios.delete(`${ZOOM_API_BASE_URL}/meetings/${meetingId}`, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
        });

        return true;
    } catch (error) {
        console.error('Error deleting Zoom meeting:', error.response?.data || error.message);
        throw new Error('Failed to delete Zoom meeting');
    }
}

module.exports = {
    createZoomMeeting,
    getZoomMeeting,
    updateZoomMeeting,
    deleteZoomMeeting,
};