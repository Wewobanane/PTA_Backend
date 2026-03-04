require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const http = require('http');
const socketio = require('socket.io');
const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');

// Initialize express app
const app = express();

// Connect to MongoDB
connectDB();

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.io
const io = socketio(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5174',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Make io accessible to routes
app.set('io', io);

// Socket.io connection
io.on('connection', (socket) => {
  console.log('New WebSocket connection:', socket.id);

  // Join room based on user ID
  socket.on('join', (userId) => {
    socket.join(userId);
    console.log(`User ${userId} joined room`);
  });

  // Handle new message
  socket.on('sendMessage', (data) => {
    // Emit to recipient
    io.to(data.recipientId).emit('newMessage', data);
  });

  // Handle notification
  socket.on('sendNotification', (data) => {
    io.to(data.userId).emit('newNotification', data);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Cookie parser
app.use(cookieParser());

// CORS
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5174',
  credentials: true
}));

// Security headers
app.use(helmet());

// Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}



// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/users', require('./routes/users'));
app.use('/api/teacher', require('./routes/teacher'));
app.use('/api/students', require('./routes/students'));
app.use('/api/behaviors', require('./routes/behaviors'));
app.use('/api/grades', require('./routes/grades'));
app.use('/api/attendance', require('./routes/attendance'));
app.use('/api/communication', require('./routes/communication'));
app.use('/api/academic-years', require('./routes/academicYears'));

// Health check route
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// 404 handler - must be after all other routes (Express 5 compatible)
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Error handler middleware (should be last)
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════╗
║                                                        ║
║   🎓 PTA Management System Server                     ║
║                                                        ║
║   Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}      ║
║   Environment: ${process.env.NODE_ENV || 'development'}                               ║
║                                                        ║
║   📡 API Endpoints:                                    ║
║   - Auth:          /api/auth                          ║
║   - Admin:         /api/admin                         ║
║   - Students:      /api/students                      ║
║   - Behaviors:     /api/behaviors                     ║
║   - Grades:        /api/grades                        ║
║   - Attendance:    /api/attendance                    ║
║   - Communication: /api/communication                 ║
║                                                        ║
║   🔌 Socket.io: Ready for real-time communication     ║
║                                                        ║
╚════════════════════════════════════════════════════════╝
  `);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error(`❌ Unhandled Rejection: ${err.message}`);
  server.close(() => process.exit(1));
});

module.exports = { app, server, io };

