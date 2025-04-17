
// task-management-backend/routes/tasks.js
const express = require('express');
const router = express.Router();
const Task = require('../models/Task');
const User = require('../models/User');
const Reminder = require('../models/Reminder');

// Get all tasks with aggregated stats
router.get('/', async (req, res) => {
  try {
    const tasks = await Task.find();
    const today = new Date();
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(task => task.status === 'Completed').length;
    const pendingTasks = tasks.filter(task => task.status === 'Pending').length;
    const inProgressTasks = tasks.filter(task => task.status === 'In Progress').length;
    const overdueTasks = tasks.filter(
      task =>
        (task.status === 'Pending' || task.status === 'In Progress') &&
        task.dueDate &&
        new Date(task.dueDate) < today
    ).length;
    const highPriority = tasks.filter(task => task.priority === 'High').length;
    const mediumPriority = tasks.filter(task => task.priority === 'Medium').length;
    const lowPriority = tasks.filter(task => task.priority === 'Low').length;
    const employeesAssigned = tasks.reduce((sum, task) => sum + task.employeesAssigned, 0);

    res.json({
      totalTasks,
      completedTasks,
      inProgressTasks,
      pendingTasks,
      overdueTasks,
      highPriority,
      mediumPriority,
      lowPriority,
      employeesAssigned,
      tasks,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create a new task
router.post('/', async (req, res) => {
  try {
    // Validate assignedUsers
    const { assignedUsers } = req.body;
    if (assignedUsers && assignedUsers.length > 0) {
      const users = await User.find({ name: { $in: assignedUsers } });
      if (users.length !== assignedUsers.length) {
        return res.status(400).json({ message: 'One or more assigned users not found' });
      }
    }

    const task = new Task({
      title: req.body.title,
      description: req.body.description || '',
      status: req.body.status || 'Pending',
      priority: req.body.priority || 'Medium',
      dueDate: req.body.dueDate || null,
      assignedUsers: req.body.assignedUsers || [],
      employeesAssigned: req.body.employeesAssigned || 0,
      document: req.body.document || null,
      category: req.body.category || '',
    });

    const newTask = await task.save();

    // Create reminders if dueDate is set
    if (task.dueDate) {
      const dueDate = new Date(task.dueDate);
      const reminderDate = new Date(dueDate);
      reminderDate.setDate(dueDate.getDate() - 1); // One day before

      for (const user of task.assignedUsers) {
        const reminder = new Reminder({
          taskId: newTask._id,
          user,
          dueDate,
          reminderDate,
          message: `Task "${task.title}" is due tomorrow on ${dueDate.toLocaleDateString()}. Please complete it before the deadline.`,
        });
        await reminder.save();
      }
    }

    res.status(201).json(newTask);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Delete a task
router.delete('/:id', async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }
    await Reminder.deleteMany({ taskId: task._id }); // Delete associated reminders
    await task.deleteOne();
    res.json({ message: 'Task deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update a task
router.put('/:id', async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Validate assignedUsers
    const { assignedUsers } = req.body;
    if (assignedUsers && assignedUsers.length > 0) {
      const users = await User.find({ name: { $in: assignedUsers } });
      if (users.length !== assignedUsers.length) {
        return res.status(400).json({ message: 'One or more assigned users not found' });
      }
    }

    // Update task
    Object.assign(task, req.body);
    const updatedTask = await task.save();

    // Update reminders if dueDate or assignedUsers changed
    if (req.body.dueDate || req.body.assignedUsers) {
      await Reminder.deleteMany({ taskId: task._id }); // Clear old reminders
      if (task.dueDate) {
        const dueDate = new Date(task.dueDate);
        const reminderDate = new Date(dueDate);
        reminderDate.setDate(dueDate.getDate() - 1);

        for (const user of task.assignedUsers) {
          const reminder = new Reminder({
            taskId: task._id,
            user,
            dueDate,
            reminderDate,
            message: `Task "${task.title}" is due tomorrow on ${dueDate.toLocaleDateString()}. Please complete it before the deadline.`,
          });
          await reminder.save();
        }
      }
    }

    res.json(updatedTask);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Get tasks by assigned user
router.get('/mytasks', async (req, res) => {
  try {
    const { name } = req.query;
    if (!name) {
      return res.status(400).json({ message: 'Name query parameter is required' });
    }
    const tasks = await Task.find({ assignedUsers: name });
    res.json({ tasks });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Mark a task as completed
router.put('/mytasks/:id/complete', async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }
    task.status = 'Completed';
    const updatedTask = await task.save();
    await Reminder.deleteMany({ taskId: task._id }); // Clear reminders on completion
    res.json(updatedTask);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;