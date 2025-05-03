const express = require('express');
const router = express.Router();
const generateMeetingJWT = require('../utils/meetingToken');
const Meeting = require('../models/Meeting');
const User = require('../models/User');

// Create meeting
router.post('/create-meeting', async (req, res) => {
  try {
    console.log('Payload received:', req.body);
    const meeting = await Meeting.create(req.body);
    res.json(meeting);
  } catch (err) {
    console.error("Error creating meeting:", err);
    res.status(500).json({ error: err.message });
  }
});

// Get all meetings
router.get('/get-meetings', async (req, res) => {
  try {
    const meetings = await Meeting.find();
    res.json(meetings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

//get users list
router.get('/get-users', async (req, res) => {
  try {
    const users = await User.find({}, 'email name'); // return email + name
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

//generate jwt for meeting
router.post('/generate-meeting-jwt', (req, res) => {
  const { roomName, userName } = req.body;

  if (!roomName || !userName) {
    return res.status(400).json({ error: 'roomName and userName are required' });
  }

  const token = generateMeetingJWT(roomName, userName);
  res.json({ token });
});

// Meeting CRUD Routes
router.get('/', async (req, res) => {
    try {
      const meetings = await Meeting.find();
      res.json(meetings);
    } catch (err) {
      console.error('Error fetching meetings:', err);
      res.status(500).send('Error fetching meetings');
    }
  });
router.put('/:id', async (req, res) => {
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
  
router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    try {
      await Meeting.findByIdAndDelete(id);
      res.status(200).send('Meeting deleted successfully');
    } catch (err) {
      console.error('Error deleting meeting:', err);
      res.status(500).send('Failed to delete meeting');
    }
});

module.exports = router;