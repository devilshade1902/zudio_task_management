
// task-management-backend/routes/reminders.js
const express = require('express');
const router = express.Router();
const Reminder = require('../models/Reminder');
const { protect } = require('../controllers/auth');

// Get reminders for the logged-in user or all reminders (admin)
router.get('/', protect, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalize to start of day
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    let query = {
      reminderDate: { $gte: today, $lt: tomorrow },
      status: 'pending',
    };

    if (!req.user.isAdmin) {
      query.user = req.user.name;
    }

    const reminders = await Reminder.find(query).populate('taskId', 'title priority');
    res.json(reminders);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Dismiss a reminder
router.put('/:id/dismiss', protect, async (req, res) => {
  try {
    const reminder = await Reminder.findById(req.params.id);
    if (!reminder) {
      return res.status(404).json({ message: 'Reminder not found' });
    }
    if (!req.user.isAdmin && reminder.user !== req.user.name) {
      return res.status(403).json({ message: 'Not authorized to dismiss this reminder' });
    }
    reminder.status = 'dismissed';
    await reminder.save();
    res.json(reminder);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
