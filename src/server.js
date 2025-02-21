require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const mongoose = require('mongoose');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const googleAuthRoutes = require('./routes/googleAuth');
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const { checkUserStatus } = require('./middleware/checkUserStatus'); // Import middleware
const getUserStatusRoutes = require('./routes/get-user-status');
const meetingsRoute = require('./routes/meetings');
const slotRoutes = require('./routes/slotRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const courseRoutes = require('./routes/courseRoutes');
const zoomWebhookRoutes = require('./zoomWebhookRoutes');


// const { verifyToken } = require('./middleware/auth');  // Import token verification middleware

const app = express();
const allowedOrigins = [
  'http://localhost:3000',
  'https://fabulous-dango-df3dfb.netlify.app',
  'https://masai-connect-frontend.vercel.app'
];
// ======= Environment Validation =======
if (!process.env.DATABASE_URI || !process.env.JWT_SECRET) {
    console.error('Missing required environment variables. Check .env file.');
    process.exit(1); // Exit if required variables are missing
}




// ======= Connect to MongoDB =======
mongoose
    .set('strictQuery', true)
    .connect(process.env.DATABASE_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    })
    .then(() => console.log('Connected to MongoDB'))
    .catch((err) => {
        console.error('Error connecting to MongoDB:', err);
        process.exit(1); // Exit on failure
    });

// ======= Middleware =======

// Basic security headers
app.use(helmet());

// Limit repeated requests to public APIs
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
    message: 'Too many requests, please try again later.',
});
app.use(limiter);

app.use(express.json());
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1) {
      return callback(null, true);
    } else {
      return callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true, // Allow cookies and other credentials to be sent
}));
app.use(morgan('dev'));
app.options('*', cors());

// ======= Routes =======

// Root Welcome Route
app.get('/', (req, res) => {
    res.send('<h1>Welcome to Masai Connect Backend</h1>');
});

// Health Check Endpoint
app.get('/api/health', async (req, res) => {
    const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
    res.json({
        status: 'OK',
        message: 'Server is running smoothly',
        dbStatus,
    });
});

// Register API routes
app.use('/api/auth', authRoutes);
app.use('/api/google', googleAuthRoutes);
app.use('/api', getUserStatusRoutes);
app.use('/api/meetings', meetingsRoute);// Middleware to restrict access based on user status
app.use('/api', adminRoutes);
app.use('/api', slotRoutes);
app.use('/api', bookingRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/zoom', zoomWebhookRoutes);




app.use(checkUserStatus);

// Protected routes can go here...
app.get('/api/dashboard', (req, res) => {
    res.json({ message: 'Welcome to your dashboard!' });
});

// 404 Handler for unknown routes
app.use((req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
});

// Global Error Handler
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

// ======= Start Server =======
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});

// Graceful Shutdown
process.on('SIGINT', async () => {
    console.log('Shutting down gracefully...');
    await mongoose.disconnect();
    process.exit(0);
});
