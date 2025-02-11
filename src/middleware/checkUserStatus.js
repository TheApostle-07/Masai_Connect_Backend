const jwt = require('jsonwebtoken');
const User = require('../models/user.model');

const checkUserStatus = async (req, res, next) => {
    try {
        // Check for JWT in authorization header
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({ error: 'Unauthorized. Token is required.' });
        }

        // Verify token and extract user data
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findOne({ user_id: decoded.user_id });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Check user status
        if (user.status === 'PENDING') {
            return res.status(403).json({
                error: 'Account approval pending. Redirecting to the approval page.',
                redirect: '/pending-approval',
            });
        }

        // Attach user to request and proceed
        req.user = user;
        next();
    } catch (error) {
        console.error('Error in checkUserStatus middleware:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

module.exports = { checkUserStatus };