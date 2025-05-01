const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, default: '' },
  status: { type: String, default: 'Pending' },
  priority: { type: String, default: 'Medium' },
  dueDate: { type: Date },
  assignedUsers: { type: [String], default: [] },
  employeesAssigned: { type: Number, default: 0 },
  document: { type: String },
  category: { type: String, default: '' },
  chatRoomId: { type: String, unique: true }, 
}, { timestamps: true });

module.exports = mongoose.model('Task', taskSchema);