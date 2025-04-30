const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  user: { type: String, required: true }, // User name from assignedUsers
  message: { type: String, required: true },
  type: { type: String, enum: ['OVERDUE', 'NEW_TASK', 'COMPLETED'], required: true },
  taskId: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', required: true },
  read: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Notification', notificationSchema);