const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/user.model');
const { roles, permissions,rolePermissions } = require('../models/user.model');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// Helper function to generate a JWT token
const generateToken = (user) => {
    return jwt.sign(
        {
            user_id: user.user_id,
            email: user.email,
            name: user.name,
            role: user.role,
            status: user.status,
            permissions: user.permissions,
        },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
    );
};

// Middleware to verify JWT and attach user to request
const authenticateToken = (req, res, next) => {
    if (req.path === '/api/auth/google/callback') return next();
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
        return res.status(401).json({ error: 'Unauthorized1. Token is required.' });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: 'Invalid or expired token' });
        req.user = user;
        next();
    });
};
// (async () => {
//     const plainPassword = 'rufusbright2R#';
//     const salt = await bcrypt.genSalt(10);
//     const newHash = await bcrypt.hash(plainPassword, salt);

//     console.log('Manually hashed password:', newHash);
// })();
// const plainPassword = 'rufusbright2R#';
// const storedHash = '$2b$10$ExXyK5o0pCc9NOv8rHwcbu1GjuOLtBAH9stbisNW4b.8uUpv5pdlS';

// bcrypt.compare(plainPassword, storedHash, (err, result) => {
//     if (err) {
//         console.error('Comparison error:', err);
//     } else {
//         console.log('Manual password comparison result:', result);  // Should print 'true'
//     }
// });


// Middleware to check permissions
const authorize = (requiredPermissions) => {
    return (req, res, next) => {
        const userPermissions = req.user.permissions || [];
        const hasPermission = requiredPermissions.every((perm) => userPermissions.includes(perm));
        if (!hasPermission) {
            return res.status(403).json({ error: 'Forbidden. You do not have the necessary permissions.' });
        }
        next();
    };
};

// Register route
router.post('/signup', async (req, res) => {
    try {
        const { email, name, password, role } = req.body;
        console.log('Password received for signup:', password);
        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ error: 'User already exists' });
        }

        // Hash the password
       

        // Create new user
        
        const newUser = new User({
            user_id: uuidv4(),
            email,
            name,
            password: password,
            role: role || roles.STUDENT,  // Default to 'STUDENT' role if not provided
            permissions: rolePermissions[role] || rolePermissions[roles.STUDENT],  // Default permissions
        });

        await newUser.save();

        res.status(201).json({ message: 'User registered successfully' });
    } catch (error) {
        console.error('Error registering user:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Login route
router.post('/signin', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Check if the user exists
        const user = await User.findOne({ email });
        if (!user) {
            console.log('User not found for email:', email);
            return res.status(400).json({ error: 'Invalid email or password' });
        }

        // Log the found user and proceed with password verification
        console.log('User found:', user);

        // Verify password
        const isPasswordValid = await user.isValidPassword(password);
        console.log('Password Check:', isPasswordValid);

        if (!isPasswordValid) {
            console.log('Invalid password attempt for user:', email);
            return res.status(400).json({ error: 'Invalid email or password' });
        }

        // Generate JWT token and send response
        const token = generateToken(user);
        console.log('Token generated:', token);

        res.json({ message: 'Login successful', token });
    } catch (error) {
        console.error('Error during login:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Protected route example: Get user profile
router.get('/profile', authenticateToken, (req, res) => {
    res.json({ user: req.user });
});

// Protected route example: Create a meeting (requires CREATE_MEETING permission)
router.post('/create-meeting', authenticateToken, authorize([permissions.CREATE_MEETING]), (req, res) => {
    // Placeholder for meeting creation logic
    res.json({ message: 'Meeting created successfully' });
});

module.exports = router;