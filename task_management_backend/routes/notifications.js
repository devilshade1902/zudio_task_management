const express = require('express');
const { auth } = require('../middleware/auth');
const Notification = require('../models/Notification');

const router = express.Router();

// Get all notifications for the authenticated user (last 24 hours)
router.get('/', auth, async (req, res) => {
  try {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const notifications = await Notification.find({
      user: req.user.name,
      createdAt: { $gte: twentyFourHoursAgo },
    })
      .populate('taskId', 'title')
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
    const notification = await Notification.findOne({ _id: req.params.id, user: req.user.name });
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

// Create multiple notifications (for Kanban board status changes)
router.post('/', auth, async (req, res) => {
  const { notifications } = req.body;

  if (!Array.isArray(notifications) || notifications.length === 0) {
    return res.status(400).json({ message: 'Notifications array is required' });
  }

  try {
    const savedNotifications = await Notification.insertMany(notifications);
    const io = req.app.get('io');
    savedNotifications.forEach(notification => {
      console.log(`Emitting newNotification to room: ${notification.user}`, notification);
      io.to(notification.user).emit('newNotification', notification);
    });
    res.status(201).json(savedNotifications);
  } catch (err) {
    console.error('Error creating notifications:', err.message);
    res.status(500).json({ message: 'Failed to create notifications' });
  }
});

module.exports = router;