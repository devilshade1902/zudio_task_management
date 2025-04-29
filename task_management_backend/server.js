// server.js

require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const axios = require('axios');
const qs = require('qs');
const crypto = require('crypto');

const Meeting = require('./models/Meeting');
const tasksRouter = require('./routes/tasks');
const userRoutes = require('./routes/users');

const app = express();
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

// Additional Routes
app.use('/api/tasks', tasksRouter);
app.use('/api/users', userRoutes);

// Start Server
app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});
