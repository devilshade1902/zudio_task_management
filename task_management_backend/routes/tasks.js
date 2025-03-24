// task-management-backend/routes/tasks.js
const express = require('express');
const router = express.Router();
const Task = require('../models/Task');

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
  const task = new Task({
    title: req.body.title,
    description: req.body.description || '',
    status: req.body.status || 'Pending',
    priority: req.body.priority || 'Medium',
    dueDate: req.body.dueDate || null,
    assignedUser: req.body.assignedUser || '',
    employeesAssigned: req.body.employeesAssigned || 1,
    document: req.body.document || null,
  });

  try {
    const newTask = await task.save();
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
    await task.deleteOne();
    res.json({ message: 'Task deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }
    Object.assign(task, req.body); // Update fields with new data
    const updatedTask = await task.save();
    res.json(updatedTask);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;