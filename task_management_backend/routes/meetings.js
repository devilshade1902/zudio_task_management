const express = require('express');
const router = express.Router();
const generateMeetingJWT = require('../utils/meetingToken');
const Meeting = require('../models/Meeting');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { auth, restrictTo } = require('../middleware/auth');

// Create meeting
router.post('/create-meeting', auth, restrictTo('Admin'), async (req, res) => {
  try {
    console.log('Payload received:', req.body);
    const meeting = await Meeting.create(req.body);
    
    // Create notifications for meeting creation
    const admins = await User.find({ role: 'Admin' });
    const adminUsers = admins.map(admin => admin.name.toLowerCase());
    const notifications = [
      ...req.body.participants.map(participant => ({
        user: participant.toLowerCase(),
        message: `New meeting "${req.body.title}" scheduled on ${req.body.date} at ${req.body.time}`,
        type: 'NEW_MEETING',
        meetingId: meeting._id,
      })),
      ...adminUsers.map(admin => ({
        user: admin,
        message: `New meeting "${req.body.title}" scheduled on ${req.body.date} at ${req.body.time}`,
        type: 'NEW_MEETING',
        meetingId: meeting._id,
      }))
    ];
    const savedNotifications = await Notification.insertMany(notifications);
    const io = req.app.get('io');
    savedNotifications.forEach(notification => {
      io.to(notification.user).emit('newNotification', notification);
    });

    res.json(meeting);
  } catch (err) {
    console.error("Error creating meeting:", err);
    res.status(500).json({ error: err.message });
  }
});

// Get all meetings
router.get('/get-meetings', auth, async (req, res) => {
  try {
    const meetings = await Meeting.find();
    res.json(meetings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get users list
router.get('/get-users', auth, async (req, res) => {
  try {
    const users = await User.find({}, 'email name');
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Generate JWT for meeting
router.post('/generate-meeting-jwt', auth, (req, res) => {
  const { roomName, userName } = req.body;

  if (!roomName || !userName) {
    return res.status(400).json({ error: 'roomName and userName are required' });
  }

  const token = generateMeetingJWT(roomName, userName);
  res.json({ token });
});

// Update meeting
router.put('/:id', auth, restrictTo('Admin'), async (req, res) => {
  const { id } = req.params;
  const { title, description, date, time, duration, link, participants } = req.body;

  try {
    const updatedMeeting = await Meeting.findByIdAndUpdate(
      id,
      { title, description, date, time, duration, link, participants },
      { new: true }
    );
    if (!updatedMeeting) {
      return res.status(404).json({ message: 'Meeting not found' });
    }

    // Create notifications for meeting update
    const admins = await User.find({ role: 'Admin' });
    const adminUsers = admins.map(admin => admin.name.toLowerCase());
    const notifications = [
      ...participants.map(participant => ({
        user: participant.toLowerCase(),
        message: `Meeting "${title}" updated for ${date} at ${time}`,
        type: 'UPDATED_MEETING',
        meetingId: updatedMeeting._id,
      })),
      ...adminUsers.map(admin => ({
        user: admin,
        message: `Meeting "${title}" updated for ${date} at ${time}`,
        type: 'UPDATED_MEETING',
        meetingId: updatedMeeting._id,
      }))
    ];
    const savedNotifications = await Notification.insertMany(notifications);
    const io = req.app.get('io');
    savedNotifications.forEach(notification => {
      io.to(notification.user).emit('newNotification', notification);
    });

    res.json(updatedMeeting);
  } catch (err) {
    console.error('Error updating meeting:', err);
    res.status(500).send('Failed to update meeting');
  }
});

// Delete meeting
router.delete('/:id', auth, restrictTo('Admin'), async (req, res) => {
  const { id } = req.params;
  try {
    const meeting = await Meeting.findById(id);
    if (!meeting) {
      return res.status(404).json({ message: 'Meeting not found' });
    }
    await Meeting.findByIdAndDelete(id);

    // Create notifications for meeting deletion
    const admins = await User.find({ role: 'Admin' });
    const adminUsers = admins.map(admin => admin.name.toLowerCase());
    const notifications = [
      ...meeting.participants.map(participant => ({
        user: participant.toLowerCase(),
        message: `Meeting "${meeting.title}" has been cancelled`,
        type: 'DELETED_MEETING',
        meetingId: id,
      })),
      ...adminUsers.map(admin => ({
        user: admin,
        message: `Meeting "${meeting.title}" has been cancelled`,
        type: 'DELETED_MEETING',
        meetingId: id,
      }))
    ];
    const savedNotifications = await Notification.insertMany(notifications);
    const io = req.app.get('io');
    savedNotifications.forEach(notification => {
      io.to(notification.user).emit('newNotification', notification);
    });

    res.status(200).send('Meeting deleted successfully');
  } catch (err) {
    console.error('Error deleting meeting:', err);
    res.status(500).send('Failed to delete meeting');
  }
});

module.exports = router;