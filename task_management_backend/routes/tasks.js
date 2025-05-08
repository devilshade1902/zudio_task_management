const express = require('express');
const router = express.Router();
const Task = require('../models/Task');
const User = require('../models/User');
const Notification = require('../models/Notification');
const Message = require('../models/Message');
const { auth, restrictTo } = require('../middleware/auth');

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
    console.error('Error fetching tasks:', err.message);
    res.status(500).json({ message: err.message });
  }
});

// Create a new task (admin-only)
router.post('/', auth, restrictTo('Admin'), async (req, res) => {
  try {
    // Validate assignedUsers
    const { assignedUsers } = req.body;
    let normalizedUsers = assignedUsers || [];
    if (assignedUsers && assignedUsers.length > 0) {
      normalizedUsers = assignedUsers.map(user => user.trim().toLowerCase());
      const users = await User.find({ name: { $in: normalizedUsers } });
      if (users.length !== normalizedUsers.length) {
        return res.status(400).json({ message: 'One or more assigned users not found' });
      }
    }

    const task = new Task({
      title: req.body.title,
      description: req.body.description || '',
      status: req.body.status || 'Pending',
      priority: req.body.priority || 'Medium',
      dueDate: req.body.dueDate || null,
      assignedUsers: normalizedUsers,
      employeesAssigned: req.body.employeesAssigned || 0,
      document: req.body.document || null,
      category: req.body.category || '',
    });

    const newTask = await task.save();

    // Initialize chat room for Pending or In Progress tasks
    if (['Pending', 'In Progress'].includes(newTask.status)) {
      const chatRooms = req.app.get('chatRooms') || {};
      const normalizedRoom = `task-${newTask._id}`;
      if (!chatRooms[normalizedRoom]) {
        chatRooms[normalizedRoom] = [];
        console.log(`Initialized chat room: ${normalizedRoom}`);
      }
    }

    // Create notifications for assigned users and admins, ensuring no duplicates
    const admins = await User.find({ role: 'Admin' });
    const adminUsers = admins.map(admin => admin.name.toLowerCase());
    const uniqueUsers = new Set([...normalizedUsers, ...adminUsers]);
    const notifications = Array.from(uniqueUsers).map(user => ({
      user,
      message: `New task "${task.title}" created`,
      type: 'NEW_TASK',
      taskId: newTask._id,
    }));

    const savedNotifications = await Notification.insertMany(notifications, { ordered: false });

    // Emit WebSocket events
    const io = req.app.get('io');
    savedNotifications.forEach(notification => {
      console.log(`Emitting NEW_TASK notification to room: ${notification.user} for task ${newTask._id}`, notification);
      io.to(notification.user).emit('newNotification', notification);
    });

    // Create overdue notification if dueDate is within 24 hours
    if (task.dueDate) {
      const dueDate = new Date(task.dueDate);
      const now = new Date();
      const oneDayFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      if (dueDate <= oneDayFromNow && dueDate > now && normalizedUsers.length > 0) {
        const overdueNotifications = normalizedUsers.map(user => ({
          user,
          message: `Task "${task.title}" is due soon on ${dueDate.toLocaleDateString()}`,
          type: 'OVERDUE',
          taskId: newTask._id,
        }));
        const savedOverdueNotifications = await Notification.insertMany(overdueNotifications, { ordered: false });
        savedOverdueNotifications.forEach(notification => {
          console.log(`Emitting OVERDUE notification to room: ${notification.user} for task ${newTask._id}`, notification);
          io.to(notification.user).emit('newNotification', notification);
        });
      }
    }

    res.status(201).json(newTask);
  } catch (err) {
    console.error('Error creating task:', err.message);
    res.status(400).json({ message: err.message });
  }
});

// Delete a task (admin-only)
router.delete('/:id', auth, restrictTo('Admin'), async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Delete chat room and messages
    const normalizedRoom = `task-${task._id}`;
    const chatRooms = req.app.get('chatRooms') || {};
    if (chatRooms[normalizedRoom]) {
      const io = req.app.get('io');
      io.to(normalizedRoom).emit('message', { username: 'System', message: 'This chat room has been deleted.' });
      delete chatRooms[normalizedRoom];
      console.log(`Deleted chat room: ${normalizedRoom}`);
    }
    await Message.deleteMany({ roomId: task._id });

    // Create notifications for assigned users and admins, ensuring no duplicates
    const admins = await User.find({ role: 'Admin' });
    const adminUsers = admins.map(admin => admin.name.toLowerCase());
    const uniqueUsers = new Set([...task.assignedUsers, ...adminUsers]);
    const notifications = Array.from(uniqueUsers).map(user => ({
      user,
      message: `Task "${task.title}" has been deleted`,
      type: 'DELETED_TASK',
      taskId: task._id,
      isRead: true, // Mark as read to skip client-side marking
    }));

    const savedNotifications = await Notification.insertMany(notifications, { ordered: false });
    const io = req.app.get('io');
    savedNotifications.forEach(notification => {
      console.log(`Emitting DELETED_TASK notification to room: ${notification.user} for task ${task._id}`, notification);
      io.to(notification.user).emit('newNotification', notification);
    });

    // Delete only non-DELETED_TASK notifications
    await Notification.deleteMany({ taskId: task._id, type: { $ne: 'DELETED_TASK' } });
    await task.deleteOne();
    res.json({ message: 'Task deleted' });
  } catch (err) {
    console.error('Error deleting task:', err.message);
    res.status(500).json({ message: err.message });
  }
});

// Update a task (admin or assigned user for status only)
router.put('/:id', auth, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    const isAdmin = req.user.role === 'Admin';
    const isAssigned = task.assignedUsers.includes(req.user.name.toLowerCase());

    if (!isAdmin && !isAssigned) {
      return res.status(403).json({ message: 'Not authorized to update this task' });
    }

    // Validate inputs
    if (req.body.status && !['Pending', 'In Progress', 'Completed'].includes(req.body.status)) {
      return res.status(400).json({ message: 'Invalid status value' });
    }
    if (req.body.priority && !['High', 'Medium', 'Low'].includes(req.body.priority)) {
      return res.status(400).json({ message: 'Invalid priority value' });
    }
    let normalizedUsers = req.body.assignedUsers || task.assignedUsers;
    if (req.body.assignedUsers && req.body.assignedUsers.length > 0) {
      normalizedUsers = req.body.assignedUsers.map(user => user.trim().toLowerCase());
      const users = await User.find({ name: { $in: normalizedUsers } });
      if (users.length !== normalizedUsers.length) {
        return res.status(400).json({ message: 'One or more assigned users not found' });
      }
    }

    // Update fields based on role
    const previousStatus = task.status;
    if (!isAdmin) {
      if (Object.keys(req.body).some(key => key !== 'status')) {
        return res.status(403).json({ message: 'Non-admins can only update task status' });
      }
      task.status = req.body.status;
    } else {
      task.title = req.body.title || task.title;
      task.description = req.body.description ?? task.description;
      task.status = req.body.status || task.status;
      task.priority = req.body.priority || task.priority;
      task.dueDate = req.body.dueDate ?? task.dueDate;
      task.assignedUsers = normalizedUsers;
      task.employeesAssigned = req.body.employeesAssigned ?? task.employeesAssigned;
      task.document = req.body.document ?? task.document;
      task.category = req.body.category ?? task.category;
    }

    // Manage chat room based on status
    const normalizedRoom = `task-${task._id}`;
    const chatRooms = req.app.get('chatRooms') || {};
    const io = req.app.get('io');
    if (task.status !== previousStatus) {
      if (['Pending', 'In Progress'].includes(task.status)) {
        if (!chatRooms[normalizedRoom]) {
          chatRooms[normalizedRoom] = [];
          console.log(`Initialized chat room: ${normalizedRoom}`);
        }
      } else if (task.status === 'Completed') {
        if (chatRooms[normalizedRoom]) {
          io.to(normalizedRoom).emit('message', { username: 'System', message: 'This chat room has been deleted.' });
          delete chatRooms[normalizedRoom];
          console.log(`Deleted chat room: ${normalizedRoom}`);
        }
        await Message.deleteMany({ roomId: task._id });
      }
    }

    const updatedTask = await task.save();

    // Create notifications only for status changes, skip if recently completed
    let notifications = [];
    if (req.body.status && req.body.status !== previousStatus && task.assignedUsers.length > 0) {
      if (req.body.status === 'Completed') {
        // Check if a COMPLETED notification exists within the last 10 seconds
        const recentNotification = await Notification.findOne({
          taskId: task._id,
          type: 'COMPLETED',
          createdAt: { $gte: new Date(Date.now() - 10 * 1000) },
        });
        if (recentNotification) {
          console.log(`Skipping COMPLETED notification for task ${task._id}: recent notification found`, recentNotification);
          res.json(updatedTask);
          return;
        }
      }
      const admins = await User.find({ role: 'Admin' });
      const adminUsers = admins.map(admin => admin.name.toLowerCase());
      const uniqueUsers = new Set([...task.assignedUsers, ...adminUsers]);
      notifications = Array.from(uniqueUsers).map(user => ({
        user,
        message: `Task "${task.title}" status changed to ${req.body.status}`,
        type: req.body.status === 'Completed' ? 'COMPLETED' : 'STATUS_CHANGED',
        taskId: task._id,
      }));
    }

    if (notifications.length > 0) {
      const savedNotifications = await Notification.insertMany(notifications, { ordered: false });
      savedNotifications.forEach(notification => {
        console.log(`Emitting STATUS_CHANGED/COMPLETED notification to room: ${notification.user} for task ${task._id}`, notification);
        io.to(notification.user).emit('newNotification', notification);
      });
    }

    // Update overdue notifications if dueDate or assignedUsers changed
    if (isAdmin && (req.body.dueDate || req.body.assignedUsers)) {
      await Notification.deleteMany({ taskId: task._id, type: 'OVERDUE' });
      if (task.dueDate) {
        const dueDate = new Date(task.dueDate);
        const now = new Date();
        const oneDayFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        if (dueDate <= oneDayFromNow && dueDate > now && task.assignedUsers.length > 0) {
          const overdueNotifications = task.assignedUsers.map(user => ({
            user,
            message: `Task "${task.title}" is due soon on ${dueDate.toLocaleDateString()}`,
            type: 'OVERDUE',
            taskId: task._id,
          }));
          const savedOverdueNotifications = await Notification.insertMany(overdueNotifications, { ordered: false });
          savedOverdueNotifications.forEach(notification => {
            console.log(`Emitting OVERDUE notification to room: ${notification.user} for task ${task._id}`, notification);
            io.to(notification.user).emit('newNotification', notification);
          });
        }
      }
    }

    res.json(updatedTask);
  } catch (err) {
    console.error('Error updating task:', err.message);
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
    const tasks = await Task.find({ assignedUsers: name.toLowerCase() });
    res.json({ tasks });
  } catch (err) {
    console.error('Error fetching my tasks:', err.message);
    res.status(500).json({ message: err.message });
  }
});

// Mark a task as completed
router.put('/mytasks/:id/complete', auth, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }
    if (!task.assignedUsers.includes(req.user.name.toLowerCase())) {
      return res.status(403).json({ message: 'Not authorized to complete this task' });
    }
    task.status = 'Completed';
    const updatedTask = await task.save();

    // Delete chat room and messages
    const normalizedRoom = `task-${task._id}`;
    const chatRooms = req.app.get('chatRooms') || {};
    const io = req.app.get('io');
    if (chatRooms[normalizedRoom]) {
      io.to(normalizedRoom).emit('message', { username: 'System', message: 'This chat room has been deleted.' });
      delete chatRooms[normalizedRoom];
      console.log(`Deleted chat room: ${normalizedRoom}`);
    }
    await Message.deleteMany({ roomId: task._id });

    // Create completion notifications, ensuring no duplicates
    const admins = await User.find({ role: 'Admin' });
    const adminUsers = admins.map(admin => admin.name.toLowerCase());
    const uniqueUsers = new Set([...task.assignedUsers, ...adminUsers]);
    const notifications = Array.from(uniqueUsers).map(user => ({
      user,
      message: `Task "${task.title}" has been completed`,
      type: 'COMPLETED',
      taskId: task._id,
    }));

    const savedNotifications = await Notification.insertMany(notifications, { ordered: false });

    // Emit WebSocket events
    savedNotifications.forEach(notification => {
      console.log(`Emitting COMPLETED notification to room: ${notification.user} for task ${task._id}`, notification);
      io.to(notification.user).emit('newNotification', notification);
    });

    // Delete overdue notifications
    await Notification.deleteMany({ taskId: task._id, type: 'OVERDUE' });

    res.json(updatedTask);
  } catch (err) {
    console.error('Error marking task as completed:', err.message);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;