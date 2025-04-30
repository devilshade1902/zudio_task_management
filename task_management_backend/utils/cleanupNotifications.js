const cron = require('node-cron');
const Notification = require('../models/Notification');

const scheduleNotificationCleanup = () => {
  cron.schedule('0 0 * * *', async () => {
    try {
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const result = await Notification.deleteMany({
        createdAt: { $lt: twentyFourHoursAgo },
      });
      console.log(`Deleted ${result.deletedCount} old notifications at ${new Date().toISOString()}`);
    } catch (err) {
      console.error('Error cleaning up notifications:', err.message);
    }
  });
};

module.exports = { scheduleNotificationCleanup };