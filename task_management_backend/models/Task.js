// task-management-backend/models/Task.js
const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, default: '' }, // New field
  completed: { type: Number, default: 0 },
  pending: { type: Number, default: 1 },
  employeesAssigned: { type: Number, default: 0 },
});

module.exports = mongoose.model('Task', taskSchema);