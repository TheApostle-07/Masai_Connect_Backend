const jwt = require('jsonwebtoken');
const User = require('../models/user.model');

async function verifyToken(req, res, next) {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'No token provided' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.userId);

        if (!user) {
            return res.status(401).json({ error: 'User not found' });
        }

        req.user = user;
        next();
    } catch (error) {
        console.error('Token verification error:', error);
        res.status(401).json({ error: 'Invalid token' });
    }
}

function checkPermissions(permission) {
    return (req, res, next) => {
        if (!req.user.hasPermission(permission)) {
            return res.status(403).json({ error: 'Permission denied' });
        }
        next();
    };
}

module.exports = {
    verifyToken,
    checkPermissions,
};