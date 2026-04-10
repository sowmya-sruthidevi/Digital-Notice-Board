const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/db');
const authRoutes = require('./routes/auth');
const noticeRoutes = require('./routes/notice');
const historyRoutes = require('./routes/history');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST', 'DELETE'] }
});

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use(express.static(path.join(__dirname, '..', 'client')));
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Make io accessible in routes
app.set('io', io);

// API Routes
app.use('/auth', authRoutes);
app.use('/', noticeRoutes);
app.use('/', historyRoutes);

// Socket.IO connection
io.on('connection', (socket) => {
  console.log(`🔌 Client connected: ${socket.id}`);
  socket.on('disconnect', () => {
    console.log(`❌ Client disconnected: ${socket.id}`);
  });
});

// Start server on all interfaces
const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🚀 Server running on http://0.0.0.0:${PORT}`);
  console.log(`📺 Display page: http://localhost:${PORT}/display.html`);
  console.log(`🔧 Admin panel:  http://localhost:${PORT}/admin.html`);
  console.log(`\n💡 To access from other devices on your network:`);
  console.log(`   Run: ipconfig (Windows) or ifconfig (Mac/Linux)`);
  console.log(`   Use: http://<YOUR_LOCAL_IP>:${PORT}/display.html\n`);
});
