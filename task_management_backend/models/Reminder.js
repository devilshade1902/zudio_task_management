const mongoose = require('mongoose');

const reminderSchema = new mongoose.Schema({
  taskId: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', required: true },
  user: { type: String, required: true }, // User name from assignedUsers
  dueDate: { type: Date, required: true }, // Task due date
  reminderDate: { type: Date, required: true }, // One day before dueDate
  status: { type: String, enum: ['pending', 'dismissed'], default: 'pending' },
  message: { type: String, required: true },
}, { timestamps: true });

module.exports = mongoose.model('Reminder', reminderSchema);