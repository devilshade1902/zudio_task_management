const express = require('express');
const router = express.Router();
const Task = require('../models/Task');
const User = require('../models/User');
const Notification = require('../models/Notification');
const Message = require('../models/Message');
const Activity = require('../models/Activity');
const { auth, restrictTo } = require('../middleware/auth');
const nodemailer = require('nodemailer');
const sendgridTransport = require('nodemailer-sendgrid-transport');

// Email transporter setup (SendGrid)
const transporter = nodemailer.createTransport(
  sendgridTransport({
    auth: {
      api_key: process.env.SENDGRID_API_KEY,
    },
  })
);

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

    // Log activity
    await new Activity({
      userId: req.user.id,
      action: `Created task "${task.title}"`,
    }).save();

    if (['Pending', 'In Progress'].includes(newTask.status)) {
      const chatRooms = req.app.get('chatRooms') || {};
      const normalizedRoom = `task-${newTask._id}`;
      if (!chatRooms[normalizedRoom]) {
        chatRooms[normalizedRoom] = [];
        console.log(`Initialized chat room: ${normalizedRoom}`);
      }
    }

    // Create in-app notifications
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

    const io = req.app.get('io');
    savedNotifications.forEach(notification => {
      console.log(`Emitting NEW_TASK notification to room: ${notification.user} for task ${newTask._id}`, notification);
      io.to(notification.user).emit('newNotification', notification);
    });

    // Send email notifications to assigned users
    if (normalizedUsers.length > 0) {
      const assignedUserDocs = await User.find({ name: { $in: normalizedUsers } }).select('email name');
      const dueDate = newTask.dueDate ? new Date(newTask.dueDate).toLocaleDateString() : 'Not set';
      const emailPromises = assignedUserDocs.map(user => {
        const mailOptions = {
          to: user.email,
          from: process.env.SENDGRID_FROM_EMAIL || 'dhruvsawant1811@gmail.com',
          subject: `New Task Assigned: ${newTask.title}`,
          html: `
            <h2>New Task Assigned</h2>
            <p>Dear ${user.name},</p>
            <p>You have been assigned a new task:</p>
            <ul>
              <li><strong>Title:</strong> ${newTask.title}</li>
              <li><strong>Description:</strong> ${newTask.description || 'No description'}</li>
              <li><strong>Priority:</strong> ${newTask.priority}</li>
              <li><strong>Due Date:</strong> ${dueDate}</li>
              <li><strong>Status:</strong> ${newTask.status}</li>
            </ul>
            <p>Please log in to the Task Management system to view details and take action.</p>
            <p>Best regards,<br>Task Management Team</p>
          `,
        };
        return transporter.sendMail(mailOptions).catch(err => {
          console.error(`Failed to send email to ${user.email} for task ${newTask._id}:`, err.message);
        });
      });
      await Promise.all(emailPromises);
    }

    // Handle overdue notifications
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

    const normalizedRoom = `task-${task._id}`;
    const chatRooms = req.app.get('chatRooms') || {};
    if (chatRooms[normalizedRoom]) {
      const io = req.app.get('io');
      io.to(normalizedRoom).emit('message', { username: 'System', message: 'This chat room has been deleted.' });
      delete chatRooms[normalizedRoom];
      console.log(`Deleted chat room: ${normalizedRoom}`);
    }
    await Message.deleteMany({ roomId: task._id });

    // Create in-app notifications
    const admins = await User.find({ role: 'Admin' });
    const adminUsers = admins.map(admin => admin.name.toLowerCase());
    const uniqueUsers = new Set([...task.assignedUsers, ...adminUsers]);
    const notifications = Array.from(uniqueUsers).map(user => ({
      user,
      message: `Task "${task.title}" has been deleted`,
      type: 'DELETED_TASK',
      taskId: task._id,
      isRead: true,
    }));

    const savedNotifications = await Notification.insertMany(notifications, { ordered: false });
    const io = req.app.get('io');
    savedNotifications.forEach(notification => {
      console.log(`Emitting DELETED_TASK notification to room: ${notification.user} for task ${task._id}`, notification);
      io.to(notification.user).emit('newNotification', notification);
    });

    // Send email notifications to assigned users
    if (task.assignedUsers.length > 0) {
      const assignedUserDocs = await User.find({ name: { $in: task.assignedUsers } }).select('email name');
      const emailPromises = assignedUserDocs.map(user => {
        const mailOptions = {
          to: user.email,
          from: process.env.SENDGRID_FROM_EMAIL || 'dhruvsawant1811@gmail.com',
          subject: `Task Deleted: ${task.title}`,
          html: `
            <h2>Task Deleted</h2>
            <p>Dear ${user.name},</p>
            <p>The following task has been deleted:</p>
            <ul>
              <li><strong>Title:</strong> ${task.title}</li>
              <li><strong>Description:</strong> ${task.description || 'No description'}</li>
            </ul>
            <p>No further action is required.</p>
            <p>Best regards,<br>Task Management Team</p>
          `,
        };
        return transporter.sendMail(mailOptions).catch(err => {
          console.error(`Failed to send email to ${user.email} for deleted task ${task._id}:`, err.message);
        });
      });
      await Promise.all(emailPromises);
    }

    // Log activity
    await new Activity({
      userId: req.user.id,
      action: `Deleted task "${task.title}"`,
    }).save();

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

    // Log activity
    if (req.body.status && req.body.status !== previousStatus) {
      await new Activity({
        userId: req.user.id,
        action: `Changed task "${task.title}" status to ${req.body.status}`,
      }).save();
    } else if (isAdmin) {
      await new Activity({
        userId: req.user.id,
        action: `Updated task "${task.title}"`,
      }).save();
    }

    let notifications = [];
    if (req.body.status && req.body.status !== previousStatus && task.assignedUsers.length > 0) {
      if (req.body.status === 'Completed') {
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

    // Send email notifications for admin updates
    if (isAdmin && task.assignedUsers.length > 0) {
      const assignedUserDocs = await User.find({ name: { $in: task.assignedUsers } }).select('email name');
      const dueDate = updatedTask.dueDate ? new Date(updatedTask.dueDate).toLocaleDateString() : 'Not set';
      const emailPromises = assignedUserDocs.map(user => {
        const mailOptions = {
          to: user.email,
          from: process.env.SENDGRID_FROM_EMAIL || 'dhruvsawant1811@gmail.com',
          subject: `Task Updated: ${updatedTask.title}`,
          html: `
            <h2>Task Updated</h2>
            <p>Dear ${user.name},</p>
            <p>The following task has been updated:</p>
            <ul>
              <li><strong>Title:</strong> ${updatedTask.title}</li>
              <li><strong>Description:</strong> ${updatedTask.description || 'No description'}</li>
              <li><strong>Priority:</strong> ${updatedTask.priority}</li>
              <li><strong>Due Date:</strong> ${dueDate}</li>
              <li><strong>Status:</strong> ${updatedTask.status}</li>
            </ul>
            <p>Please log in to the Task Management system to view the updated details.</p>
            <p>Best regards,<br>Task Management Team</p>
          `,
        };
        return transporter.sendMail(mailOptions).catch(err => {
          console.error(`Failed to send email to ${user.email} for updated task ${updatedTask._id}:`, err.message);
        });
      });
      await Promise.all(emailPromises);
    }

    if (notifications.length > 0) {
      const savedNotifications = await Notification.insertMany(notifications, { ordered: false });
      savedNotifications.forEach(notification => {
        console.log(`Emitting STATUS_CHANGED/COMPLETED notification to room: ${notification.user} for task ${task._id}`, notification);
        io.to(notification.user).emit('newNotification', notification);
      });
    }

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

    // Log activity
    await new Activity({
      userId: req.user.id,
      action: `Completed task "${task.title}"`,
    }).save();

    const normalizedRoom = `task-${task._id}`;
    const chatRooms = req.app.get('chatRooms') || {};
    const io = req.app.get('io');
    if (chatRooms[normalizedRoom]) {
      io.to(normalizedRoom).emit('message', { username: 'System', message: 'This chat room has been deleted.' });
      delete chatRooms[normalizedRoom];
      console.log(`Deleted chat room: ${normalizedRoom}`);
    }
    await Message.deleteMany({ roomId: task._id });

    // Create in-app notifications
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

    savedNotifications.forEach(notification => {
      console.log(`Emitting COMPLETED notification to room: ${notification.user} for task ${task._id}`, notification);
      io.to(notification.user).emit('newNotification', notification);
    });

    // Send email notifications to admins
    if (adminUsers.length > 0) {
      const adminDocs = await User.find({ name: { $in: adminUsers } }).select('email name');
      const dueDate = task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'Not set';
      const emailPromises = adminDocs.map(admin => {
        const mailOptions = {
          to: admin.email,
          from: process.env.SENDGRID_FROM_EMAIL || 'dhruvsawant1811@gmail.com',
          subject: `Task Completed: ${task.title}`,
          html: `
            <h2>Task Completed</h2>
            <p>Dear ${admin.name},</p>
            <p>The following task has been marked as completed:</p>
            <ul>
              <li><strong>Title:</strong> ${task.title}</li>
              <li><strong>Description:</strong> ${task.description || 'No description'}</li>
              <li><strong>Priority:</strong> ${task.priority}</li>
              <li><strong>Due Date:</strong> ${dueDate}</li>
              <li><strong>Assigned Users:</strong> ${task.assignedUsers.join(', ') || 'None'}</li>
            </ul>
            <p>Please log in to the Task Management system to review.</p>
            <p>Best regards,<br>Task Management Team</p>
          `,
        };
        return transporter.sendMail(mailOptions).catch(err => {
          console.error(`Failed to send email to ${admin.email} for completed task ${task._id}:`, err.message);
        });
      });
      await Promise.all(emailPromises);
    }

    await Notification.deleteMany({ taskId: task._id, type: 'OVERDUE' });

    res.json(updatedTask);
  } catch (err) {
    console.error('Error marking task as completed:', err.message);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;