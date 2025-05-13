const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  user: { type: String, required: true },
  message: { type: String, required: true },
  type: { 
    type: String, 
    enum: ['OVERDUE', 'NEW_TASK', 'COMPLETED', 'STATUS_CHANGED', 'NEW_MEETING', 'UPDATED_MEETING', 'DELETED_MEETING', 'DELETED_TASK'], 
    required: true 
  },
  taskId: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', required: false },
  meetingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Meeting', required: false },
  read: { type: Boolean, default: false },
  viewed: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

// Add unique index to prevent duplicate notifications, excluding createdAt
notificationSchema.index(
  { user: 1, message: 1, taskId: 1, meetingId: 1 },
  { unique: true }
);

module.exports = mongoose.model('Notification', notificationSchema);