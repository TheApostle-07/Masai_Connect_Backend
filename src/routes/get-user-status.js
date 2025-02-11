const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/user.model');  // Adjust the path to your user model

const router = express.Router();

router.get('/get-user-status', async (req, res) => {
    try {
        // Prevent caching
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        res.setHeader('Surrogate-Control', 'no-store');

        // Check for token in Authorization header
        const token = req.headers.authorization?.split(' ')[1];

        if (!token) {
            return res.status(401).json({ error: 'Unauthorized. Token is required.' });
        }

        // Decode the token to get the user ID
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decoded.user_id;

        // Fetch the user from the database
        const user = await User.findOne({ user_id: userId });

        if (!user) {
            return res.status(404).json({ error: 'User not found.' });
        }

        // Return user's status, roles, and labels
        res.json({
            name: user.name,
            email: user.email,
            status: user.status,
            roles: user.roles,  // Return all roles
            labels: user.labels,  // Return any labels associated with the user
        });
    } catch (error) {
        console.error('Error fetching user status:', error);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

module.exports = router;