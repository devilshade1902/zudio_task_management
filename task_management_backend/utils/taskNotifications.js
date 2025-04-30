const cron = require('node-cron');
const Task = require('../models/Task');
const Notification = require('../models/Notification');

function scheduleTaskNotifications(io) {
  // Run every day at 8 AM
  cron.schedule('0 8 * * *', async () => {
    try {
      console.log('Checking for near-overdue tasks...');
      const now = new Date();
      const oneDayFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      // Find tasks due within 24 hours, not completed
      const tasks = await Task.find({
        dueDate: { $gte: now, $lte: oneDayFromNow },
        status: { $ne: 'Completed' },
      });

      const notifications = [];
      for (const task of tasks) {
        if (task.assignedUsers && task.assignedUsers.length > 0) {
          task.assignedUsers.forEach(user => {
            notifications.push({
              user: user.trim().toLowerCase(),
              message: `Task "${task.title}" is due soon on ${new Date(task.dueDate).toLocaleDateString()}`,
              type: 'OVERDUE',
              taskId: task._id,
            });
          });
        }
      }

      if (notifications.length > 0) {
        const savedNotifications = await Notification.insertMany(notifications);
        // Emit WebSocket events
        savedNotifications.forEach(notification => {
          console.log(`Emitting newNotification to room: ${notification.user}`);
          io.to(notification.user).emit('newNotification', notification);
        });
        console.log(`Created ${notifications.length} overdue notifications`);
      } else {
        console.log('No near-overdue tasks found');
      }
    } catch (err) {
      console.error('Error in task notification cron:', err.message);
    }
  });
}

module.exports = { scheduleTaskNotifications };