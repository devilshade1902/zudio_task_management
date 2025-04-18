// server.js

require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const axios = require('axios');
const qs = require('qs');
const Meeting = require('./models/Meeting'); // Import the Meeting model
const tasksRouter = require('./routes/tasks'); // Import task routes
const userRoutes = require('./routes/users'); // Import user routes

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors({
  origin: 'http://localhost:5173', // Explicitly allow frontend origin
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true, // Allow cookies or auth headers if needed
}));
app.use(express.json());

// MongoDB Atlas Connection
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log('Connected to MongoDB Atlas'))
  .catch(err => console.error('MongoDB Atlas connection error:', err));

// Zoom OAuth credentials (Server-to-Server OAuth)
const ZOOM_ACCOUNT_ID = process.env.ZOOM_ACCOUNT_ID;
const ZOOM_CLIENT_ID = process.env.ZOOM_CLIENT_ID;
const ZOOM_CLIENT_SECRET = process.env.ZOOM_CLIENT_SECRET;

// Get Zoom access token
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

// Route to create a Zoom meeting
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
      topic: topic,
      type: 2,
      start_time: startTime,
      duration: duration,
      agenda: description,
      settings: {
        host_video: true,
        participant_video: true,
        join_before_host: true,
        mute_upon_entry: true,
      },
    };

    const response = await axios.post(url, meetingData, { headers });
    res.json(response.data);
  } catch (error) {
    console.error('Error creating Zoom meeting:', error.response?.data || error.message);
    res.status(500).send('Failed to create Zoom meeting');
  }
});

// Routes for Meeting CRUD operations
// Get all meetings
app.get('/api/meetings', async (req, res) => {
  try {
    const meetings = await Meeting.find();
    res.json(meetings);
  } catch (err) {
    console.error('Error fetching meetings:', err);
    res.status(500).send('Error fetching meetings');
  }
});

// Create a new meeting
app.post('/api/meetings', async (req, res) => {
  const { title, description, date, time, duration, link } = req.body;
  
  const newMeeting = new Meeting({
    title,
    description,
    date,
    time,
    duration,
    link,
  });

  try {
    await newMeeting.save();
    res.status(201).json(newMeeting);
  } catch (err) {
    console.error('Error saving meeting:', err);
    res.status(500).send('Failed to save meeting');
  }
});

// Update an existing meeting
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

// Delete a meeting
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

// Routes for task management
app.use('/api/tasks', tasksRouter);
app.use('/api/users', userRoutes);

// Start Server
app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});
