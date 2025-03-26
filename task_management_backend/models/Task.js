// task-management-backend/models/Task.js
const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, default: '' },
  status: { type: String, default: 'Pending' }, // New: Replaces completed/pending flags
  priority: { type: String, default: 'Medium' }, // New
  dueDate: { type: Date, default: null }, // New
  assignedUser: { type: String, default: '' }, // New
  employeesAssigned: { type: Number, default: 0 }, // Kept for compatibility
  document: { type: String, default: null },
});



module.exports = mongoose.model('Task', taskSchema);