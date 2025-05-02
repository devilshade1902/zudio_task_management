require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const axios = require('axios');
const qs = require('qs');
const crypto = require('crypto');
const { Server } = require('socket.io');
const http = require('http');

const Meeting = require('./models/Meeting');
const tasksRouter = require('./routes/tasks');
const chatRouter = require('./routes/chat');
const userRoutes = require('./routes/users');
const notificationsRouter = require('./routes/notifications');
const { scheduleTaskNotifications } = require('./utils/taskNotifications');
const { scheduleNotificationCleanup } = require('./utils/cleanupNotifications');

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

// Zoom Server-to-Server OAuth Credentials
const ZOOM_ACCOUNT_ID = process.env.ZOOM_ACCOUNT_ID;
const ZOOM_CLIENT_ID = process.env.ZOOM_CLIENT_ID;
const ZOOM_CLIENT_SECRET = process.env.ZOOM_CLIENT_SECRET;

// Get Zoom Access Token
async function getZoomAccessToken() {
  const url = 'https://zoom.us/oauth/token';
  const headers = {
    'Authorization': `Basic ${Buffer.from(`${ZOOM_CLIENT_ID}:${ZOOM_CLIENT_SECRET}`).toString('base64')}`,
    'Content-Type': 'application/x-www-form-urlencoded',
  };
  const data = qs.stringify({
    grant_type: 'account_credentials',
    account_id: ZOOM_ACCOUNT_ID,
  });

  try {
    const response = await axios.post(url, data, { headers });
    return response.data.access_token;
  } catch (error) {
    console.error('Error getting Zoom access token:', error.response?.data || error.message);
    throw error;
  }
}

// Route to create Zoom Meeting
app.post('/api/zoom/create-meeting', async (req, res) => {
  const { topic, description, startTime, duration } = req.body;

  try {
    const accessToken = await getZoomAccessToken();
    const url = 'https://api.zoom.us/v2/users/me/meetings';
    const headers = {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    };

    const meetingData = {
      topic,
      type: 2,
      start_time: startTime,
      duration,
      agenda: description,
      settings: {
        host_video: true,
        participant_video: true,
        join_before_host: true,
        mute_upon_entry: true,
      },
    };

    const response = await axios.post(url, meetingData, { headers });

    res.json({
      join_url: response.data.join_url,
      start_url: response.data.start_url,
    });
  } catch (error) {
    console.error('Error creating Zoom meeting:', error.response?.data || error.message);
    res.status(500).send('Failed to create Zoom meeting');
  }
});

// Route to generate Zoom SDK Signature
app.post('/api/zoom/generate-signature', (req, res) => {
  const { meetingNumber, role } = req.body;
  const sdkKey = process.env.ZOOM_SDK_KEY;
  const sdkSecret = process.env.ZOOM_SDK_SECRET;

  const iat = Math.round(new Date().getTime() / 1000) - 30;
  const exp = iat + 60 * 60 * 2;
  const oHeader = { alg: 'HS256', typ: 'JWT' };

  const oPayload = {
    sdkKey,
    mn: meetingNumber,
    role,
    iat,
    exp,
    appKey: sdkKey,
    tokenExp: exp,
  };

  const sHeader = Buffer.from(JSON.stringify(oHeader)).toString('base64');
  const sPayload = Buffer.from(JSON.stringify(oPayload)).toString('base64');
  const signature = crypto
    .createHmac('sha256', sdkSecret)
    .update(`${sHeader}.${sPayload}`)
    .digest('base64');

  const signedToken = `${sHeader}.${sPayload}.${signature}`;

  res.json({ signature: signedToken });
});

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
// Start Task Notification and Cleanup Cron Jobs
scheduleTaskNotifications(io);
scheduleNotificationCleanup();

// Start Server
server.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});