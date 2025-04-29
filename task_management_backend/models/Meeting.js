// models/Meeting.js
const mongoose = require('mongoose');

const meetingSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  date: { type: Date, required: true },
  time: { type: String, required: true },
  duration: { type: Number }, // in minutes
  link: { type: String }, // Zoom link
  start_url: {type: String},
});

const Meeting = mongoose.model('Meeting', meetingSchema);
module.exports = Meeting;
