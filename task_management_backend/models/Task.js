// task-management-backend/models/Task.js
const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, default: '' },
  status: { type: String, default: 'Pending' },
  priority: { type: String, default: 'Medium' },
  dueDate: { type: Date, default: null },
  assignedUsers: [{ type: String, default: '' }], // Changed to array
  employeesAssigned: { type: Number, default: 0 },
  document: { type: String, default: null },
  category: { type: String, default: '' },
});

module.exports = mongoose.model('Task', taskSchema);