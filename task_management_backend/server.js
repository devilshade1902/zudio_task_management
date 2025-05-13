require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const { Server } = require('socket.io');
const http = require('http');
const path = require('path');
const User = require('./models/User');
const Notification = require('./models/Notification');
const tasksRouter = require('./routes/tasks');
const chatRouter = require('./routes/chat');
const userRoutes = require('./routes/users');
const notificationsRouter = require('./routes/notifications');
const meetingRoutes = require('./routes/meetings');
const { scheduleTaskNotifications } = require('./utils/taskNotifications');
const { scheduleNotificationCleanup } = require('./utils/cleanupNotifications');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:5173',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
  },
});

const PORT = process.env.PORT || 5001;
const chatRooms = {};

// Middleware
app.use(cors({
  origin: 'http://localhost:5173',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));
app.use(express.json());
app.use('/Uploads', express.static(path.join(__dirname, 'Uploads'))); // Serve Uploads folder

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log('Connected to MongoDB Atlas'))
  .catch(err => console.error('MongoDB Atlas connection error:', err));

// Socket.IO Connection
io.on('connection', (socket) => {
  console.log('Socket.IO client connected:', socket.id);

  socket.on('join', (username) => {
    if (username && username !== 'Guest') {
      const room = username.trim().toLowerCase();
      const currentRooms = Array.from(socket.rooms).filter(r => r !== socket.id);
      currentRooms.forEach(r => socket.leave(r));
      socket.join(room);
      console.log(`${username} joined room: ${room}, rooms:`, socket.rooms);
    }
  });

  socket.on('joinRoom', async ({ room, username }) => {
    const taskId = room.split('-')[1];

    try {
      const task = await Task.findById(taskId);

      if (!task) {
        socket.emit('roomDenied', { message: 'Task not found.' });
        return;
      }

      if (!task.assignedUsers.includes(username)) {
        socket.emit('roomDenied', { message: 'Access denied to this chat room.' });
        return;
      }

      if (!chatRooms[room]) chatRooms[room] = [];
      chatRooms[room].push({ id: socket.id, username });
      socket.join(room);

      console.log(`${username} joined room: ${room}`);
      io.to(room).emit('message', { username: 'System', message: `${username} joined the chat.` });

    } catch (err) {
      console.error('Join room error:', err);
      socket.emit('roomDenied', { message: 'Server error while joining room.' });
    }
  });

  socket.on('sendMessage', ({ room, message, username }) => {
    io.to(room).emit('message', { username, message });
  });

  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);

    for (const room in chatRooms) {
      chatRooms[room] = chatRooms[room].filter(user => user.id !== socket.id);

      if (chatRooms[room].length === 0) {
        delete chatRooms[room];
        console.log(`Room ${room} deleted as it's now empty`);
      }
    }
  });

  socket.on('error', (err) => {
    console.error('Socket.IO error:', err);
  });
});

// Room Deletion on Task Completion
app.delete('/delete-room/:room', (req, res) => {
  const room = req.params.room;
  if (chatRooms[room]) {
    io.to(room).emit('message', { username: 'System', message: 'This chat room has been deleted.' });
    delete chatRooms[room];
    res.status(200).send('Room deleted successfully');
  } else {
    res.status(404).send('Room not found');
  }
});

// Make io accessible to routes
app.set('io', io);

// Routes
app.use('/api/tasks', tasksRouter);
app.use('/api/users', userRoutes);
app.use('/api/notifications', notificationsRouter);
app.use('/api/chat', chatRouter);
app.use('/meetings', meetingRoutes);
app.use('/api', meetingRoutes);

// Start Task Notification and Cleanup Cron Jobs
// scheduleTaskNotifications(io);
scheduleNotificationCleanup();

// Start Server
server.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});