require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');

// Import models and routes
const tasksRouter = require('./routes/tasks');
const chatRouter = require('./routes/chat');
const reportRouter=require('./routes/report')
const userRoutes = require('./routes/users');
const notificationsRouter = require('./routes/notifications');
const meetingRoutes = require('./routes/meetings');
const Message = require('./models/Message'); 

// Initialize app and server
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Environment variables
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors({
  origin: 'http://localhost:5173',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));
app.use(express.json());

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log('Connected to MongoDB Atlas'))
  .catch(err => console.error('MongoDB Atlas connection error:', err));

// Routes
app.use('/api/tasks', tasksRouter);
app.use('/api/users', userRoutes);
app.use('/api/notifications', notificationsRouter);
app.use('/api/chat', chatRouter); // Chat feature routes
app.use('/meetings', meetingRoutes);
app.use('/api', meetingRoutes); 
app.use('/reports',reportRouter)

// Socket.IO Logic for Real-Time Chat
io.on("joinRoom", async ({ room, username }) => {
  if (!room || !username) {
    console.error("Invalid room or username in joinRoom event:", { room, username });
    socket.emit("roomDenied", { message: "Invalid room or username." });
    return;
  }

  const taskId = room.split("-")[1]; // assuming room = task-<taskId>

  try {
    const task = await Task.findById(taskId);

    if (!task) {
      socket.emit("roomDenied", { message: "Task not found." });
      return;
    }

    if (!task.assignedUsers.includes(username)) {
      socket.emit("roomDenied", { message: "Access denied to this chat room." });
      return;
    }

    // Add user to room
    if (!chatRooms[room]) chatRooms[room] = [];
    chatRooms[room].push({ id: socket.id, username });
    socket.join(room);

    console.log(`${username} joined room: ${room}`);
    io.to(room).emit("message", { username: "System", message: `${username} joined the chat.` });
  } catch (err) {
    console.error("Join room error:", err);
    socket.emit("roomDenied", { message: "Server error while joining room." });
  }
});


// Start Server
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});