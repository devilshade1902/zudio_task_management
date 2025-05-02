// models/Meeting.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const MeetingSchema = new Schema({
  title: { type: String, required: true },
  description: { type: String },
  date: { type: Date, required: true },          
  time: { type: String, required: true },
  duration: { type: Number, required: true },     
  roomName: { type: String, required: false, unique: true }, 
  passcode: { type: String },
  createdBy: { type: String },
  participants: [String],
  taskName: {type: String},
}, { timestamps: true });

const Meeting = mongoose.model('Meeting', MeetingSchema);
module.exports = Meeting;
