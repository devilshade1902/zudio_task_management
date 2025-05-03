require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const axios = require('axios');
const { Server } = require('socket.io');
const http = require('http');

const Meeting = require('./models/Meeting');
const tasksRouter = require('./routes/tasks');
const chatRouter = require('./routes/chat');
const userRoutes = require('./routes/users');
const notificationsRouter = require('./routes/notifications');
const { scheduleTaskNotifications } = require('./utils/taskNotifications');
const { scheduleNotificationCleanup } = require('./utils/cleanupNotifications');
const meetingRoutes = require('./routes/meetings')

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:5173',
    methods: ['GET', 'POST'],
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

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log('Connected to MongoDB Atlas'))
  .catch(err => console.error('MongoDB Atlas connection error:', err));

// Meeting CRUD Routes
app.get('/api/meetings', async (req, res) => {
  try {
    const meetings = await Meeting.find();
    res.json(meetings);
  } catch (err) {
    console.error('Error fetching meetings:', err);
    res.status(500).send('Error fetching meetings');
  }
});

app.post('/api/meetings', async (req, res) => {
  const { title, description, date, time, duration, link, start_url } = req.body;
  const newMeeting = new Meeting({ title, description, date, time, duration, link, start_url });

  try {
    await newMeeting.save();
    res.status(201).json(newMeeting);
  } catch (err) {
    console.error('Error saving meeting:', err);
    res.status(500).send('Failed to save meeting');
  }
});

app.put('/api/meetings/:id', async (req, res) => {
  const { id } = req.params;
  const { title, description, date, time, duration, link } = req.body;

  try {
    const updatedMeeting = await Meeting.findByIdAndUpdate(
      id,
      { title, description, date, time, duration, link },
      { new: true }
    );
    res.json(updatedMeeting);
  } catch (err) {
    console.error('Error updating meeting:', err);
    res.status(500).send('Failed to update meeting');
  }
});

app.delete('/api/meetings/:id', async (req, res) => {
  const { id } = req.params;

  try {
    await Meeting.findByIdAndDelete(id);
    res.status(200).send('Meeting deleted successfully');
  } catch (err) {
    console.error('Error deleting meeting:', err);
    res.status(500).send('Failed to delete meeting');
  }
});

// Socket.IO Connection

io.on('connection', (socket) => {
  console.log('Socket.IO client connected:', socket.id);

  socket.on('joinRoom', async ({ room, username }) => {
    const taskId = room.split('-')[1]; // assuming room = task-<taskId>

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

      // Add user to room
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

// Additional Routes
app.use('/api/tasks', tasksRouter);
app.use('/api/users', userRoutes);
app.use('/api/notifications', notificationsRouter);
app.use('/api/chat', chatRouter);
app.use('/meetings',meetingRoutes );
app.use('/api', meetingRoutes);

// Start Task Notification and Cleanup Cron Jobs
scheduleTaskNotifications(io);
scheduleNotificationCleanup();

// Start Server
server.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});