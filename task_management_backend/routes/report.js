const express = require('express');
const Task = require('../models/Task');
const User = require('../models/User');
const { auth, restrictTo } = require('../middleware/auth');
const router = express.Router();

router.get('/taskreport',  auth, restrictTo('Admin'),async (req, res) => {
    try {
        const totalTasks = await Task.countDocuments({});
        const completedTasks = await Task.countDocuments({ status: 'Completed' });
        const pendingTasks = await Task.countDocuments({ status: 'Pending' });
        const overdueTasks = await Task.countDocuments({ dueDate: { $lt: new Date() }, status: { $ne: 'Completed' } });

        res.json({ totalTasks, completedTasks, pendingTasks, overdueTasks });
    } catch (error) {
        res.status(500).json({ message: 'Error generating task report', error });
    }
});

router.get('/userReport', auth, restrictTo('Admin'), async (req, res) => {
  try {
    const users = await User.find({}).select('name email');
    const userPerformance = await Promise.all(
      users.map(async (user) => {
        const username = user.name.toLowerCase();
        const tasksAssigned = await Task.countDocuments({ assignedUsers: username });
        const tasksCompleted = await Task.countDocuments({ assignedUsers: username, status: 'Completed' });
        return { user, tasksAssigned, tasksCompleted };
      })
    );

    res.json(userPerformance);
  } catch (error) {
    res.status(500).json({ message: 'Error generating user report', error });
  }
});


module.exports = router;