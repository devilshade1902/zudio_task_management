const express = require('express');
const { auth } = require('../middleware/auth');
const Notification = require('../models/Notification');

const router = express.Router();

// Get all notifications for the authenticated user (last 24 hours)
router.get('/', auth, async (req, res) => {
  try {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const notifications = await Notification.find({
      user: req.user.name.toLowerCase(),
      createdAt: { $gte: twentyFourHoursAgo },
    })
      .populate('taskId', 'title')
      .populate('meetingId', 'title')
      .sort({ createdAt: -1 });
    console.log(`Fetched ${notifications.length} notifications for user: ${req.user.name}`);
    res.json(notifications);
  } catch (err) {
    console.error('Error fetching notifications:', err.message);
    res.status(500).json({ message: 'Failed to fetch notifications' });
  }
});

// Mark a notification as read
router.put('/:id/read', auth, async (req, res) => {
  try {
    const notification = await Notification.findOne({ _id: req.params.id, user: req.user.name.toLowerCase() });
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }
    notification.read = true;
    await notification.save();
    console.log(`Marked notification ${req.params.id} as read for user: ${req.user.name}`);
    res.json({ message: 'Notification marked as read' });
  } catch (err) {
    console.error('Error marking notification as read:', err.message);
    res.status(500).json({ message: 'Failed to mark notification as read' });
  }
});

// Mark a notification as viewed
router.put('/:id/viewed', auth, async (req, res) => {
  try {
    const notification = await Notification.findOne({ _id: req.params.id, user: req.user.name.toLowerCase() });
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }
    notification.viewed = true;
    await notification.save();
    console.log(`Marked notification ${req.params.id} as viewed for user: ${req.user.name}`);
    res.json({ message: 'Notification marked as viewed' });
  } catch (err) {
    console.error('Error marking notification as viewed:', err.message);
    res.status(500).json({ message: 'Failed to mark notification as viewed' });
  }
});

// Create multiple notifications with deduplication
router.post('/', auth, async (req, res) => {
  const { notifications } = req.body;

  if (!Array.isArray(notifications) || notifications.length === 0) {
    return res.status(400).json({ message: 'Notifications array is required' });
  }

  try {
    // Deduplicate notifications by user, message, taskId, and meetingId
    const uniqueNotifications = [];
    const seen = new Set();
    for (const notification of notifications) {
      const key = `${notification.user}-${notification.message}-${notification.taskId || ''}-${notification.meetingId || ''}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueNotifications.push(notification);
      } else {
        console.log(`Skipping duplicate notification: ${key}`);
      }
    }

    const savedNotifications = await Notification.insertMany(uniqueNotifications, { ordered: false });
    const io = req.app.get('io');
    savedNotifications.forEach(notification => {
      console.log(`Emitting newNotification to room: ${notification.user}`, {
        id: notification._id,
        message: notification.message,
        type: notification.type,
        taskId: notification.taskId,
        meetingId: notification.meetingId,
      });
      io.to(notification.user).emit('newNotification', notification);
    });
    res.status(201).json(savedNotifications);
  } catch (err) {
    console.error('Error creating notifications:', err.message);
    res.status(500).json({ message: 'Failed to create notifications' });
  }
});

module.exports = router;