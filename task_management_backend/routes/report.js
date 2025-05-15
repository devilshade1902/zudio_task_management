const express = require('express');
const { auth } = require('../middleware/auth');
const Task = require('../models/Task');
const router = express.Router();

// GET /api/reports/task/:taskId
router.get('/task/:taskId', auth, async (req, res) => {
  try {
    const { taskId } = req.params;
    const task = await Task.findById(taskId);

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    const taskData = {
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      dueDate: task.dueDate,
    };

    res.json({ taskData });
  } catch (error) {
    console.error('Error fetching task report:', error);
    res.status(500).json({ message: 'Internal Server Error', error });
  }
});

module.exports = router;