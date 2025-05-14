const express = require('express');
const router = express.Router();
const generateMeetingJWT = require('../utils/meetingToken');
const Meeting = require('../models/Meeting');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { auth, restrictTo } = require('../middleware/auth');
const nodemailer = require('nodemailer');
const sendgridTransport = require('nodemailer-sendgrid-transport');

// Email transporter setup (SendGrid)
const transporter = nodemailer.createTransport(
  sendgridTransport({
    auth: {
      api_key: process.env.SENDGRID_API_KEY,
    },
  })
);

// Create meeting
router.post('/create-meeting', auth, restrictTo('Admin'), async (req, res) => {
  try {
    console.log('Payload received:', req.body);
    const meeting = await Meeting.create(req.body);

    // Create in-app notifications for meeting creation
    const admins = await User.find({ role: 'Admin' });
    const adminUsers = admins.map(admin => admin.name.toLowerCase());
    const notifications = [
      ...req.body.participants.map(participant => ({
        user: participant.toLowerCase(),
        message: `New meeting "${req.body.title}" scheduled on ${req.body.date} at ${req.body.time}`,
        type: 'NEW_MEETING',
        meetingId: meeting._id,
      })),
      ...adminUsers.map(admin => ({
        user: admin,
        message: `New meeting "${req.body.title}" scheduled on ${req.body.date} at ${req.body.time}`,
        type: 'NEW_MEETING',
        meetingId: meeting._id,
      }))
    ];
    const savedNotifications = await Notification.insertMany(notifications);
    const io = req.app.get('io');
    savedNotifications.forEach(notification => {
      io.to(notification.user).emit('newNotification', notification);
    });

    // Send email notifications to participants
    if (req.body.participants.length > 0) {
      const participantDocs = await User.find({ name: { $in: req.body.participants.map(p => p.toLowerCase()) } }).select('email name');
      const emailPromises = participantDocs.map(user => {
        const mailOptions = {
          to: user.email,
          from: process.env.SENDGRID_FROM_EMAIL || 'dhruvsawant1811@gmail.com',
          subject: `New Meeting Scheduled: ${req.body.title}`,
          html: `
            <h2>New Meeting Scheduled</h2>
            <p>Dear ${user.name},</p>
            <p>You have been invited to a new meeting:</p>
            <ul>
              <li><strong>Title:</strong> ${req.body.title}</li>
              <li><strong>Description:</strong> ${req.body.description || 'No description'}</li>
              <li><strong>Date:</strong> ${req.body.date}</li>
              <li><strong>Time:</strong> ${req.body.time}</li>
              <li><strong>Duration:</strong> ${req.body.duration || 'Not specified'}</li>
              <li><strong>Link:</strong> ${req.body.link || 'Not provided'}</li>
            </ul>
            <p>Please log in to the Task Management system for more details.</p>
            <p>Best regards,<br>Task Management Team</p>
          `,
        };
        return transporter.sendMail(mailOptions).catch(err => {
          console.error(`Failed to send email to ${user.email} for meeting ${meeting._id}:`, err.message);
        });
      });
      await Promise.all(emailPromises);
    }

    res.json(meeting);
  } catch (err) {
    console.error("Error creating meeting:", err);
    res.status(500).json({ error: err.message });
  }
});

// Get all meetings
router.get('/get-meetings', auth, async (req, res) => {
  try {
    const meetings = await Meeting.find();
    res.json(meetings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get users list
router.get('/get-users', auth, async (req, res) => {
  try {
    const users = await User.find({}, 'email name');
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Generate JWT for meeting
router.post('/generate-meeting-jwt', auth, (req, res) => {
  const { roomName, userName } = req.body;

  if (!roomName || !userName) {
    return res.status(400).json({ error: 'roomName and userName are required' });
  }

  const token = generateMeetingJWT(roomName, userName);
  res.json({ token });
});

// Update meeting
router.put('/:id', auth, restrictTo('Admin'), async (req, res) => {
  const { id } = req.params;
  const { title, description, date, time, duration, link, participants } = req.body;

  try {
    const updatedMeeting = await Meeting.findByIdAndUpdate(
      id,
      { title, description, date, time, duration, link, participants },
      { new: true }
    );
    if (!updatedMeeting) {
      return res.status(404).json({ message: 'Meeting not found' });
    }

    // Create in-app notifications for meeting update
    const admins = await User.find({ role: 'Admin' });
    const adminUsers = admins.map(admin => admin.name.toLowerCase());
    const notifications = [
      ...participants.map(participant => ({
        user: participant.toLowerCase(),
        message: `Meeting "${title}" updated for ${date} at ${time}`,
        type: 'UPDATED_MEETING',
        meetingId: updatedMeeting._id,
      })),
      ...adminUsers.map(admin => ({
        user: admin,
        message: `Meeting "${title}" updated for ${date} at ${time}`,
        type: 'UPDATED_MEETING',
        meetingId: updatedMeeting._id,
      }))
    ];
    const savedNotifications = await Notification.insertMany(notifications);
    const io = req.app.get('io');
    savedNotifications.forEach(notification => {
      io.to(notification.user).emit('newNotification', notification);
    });

    // Send email notifications to participants
    if (participants.length > 0) {
      const participantDocs = await User.find({ name: { $in: participants.map(p => p.toLowerCase()) } }).select('email name');
      const emailPromises = participantDocs.map(user => {
        const mailOptions = {
          to: user.email,
          from: process.env.SENDGRID_FROM_EMAIL || 'dhruvsawant1811@gmail.com',
          subject: `Meeting Updated: ${title}`,
          html: `
            <h2>Meeting Updated</h2>
            <p>Dear ${user.name},</p>
            <p>The following meeting has been updated:</p>
            <ul>
              <li><strong>Title:</strong> ${title}</li>
              <li><strong>Description:</strong> ${description || 'No description'}</li>
              <li><strong>Date:</strong> ${date}</li>
              <li><strong>Time:</strong> ${time}</li>
              <li><strong>Duration:</strong> ${duration || 'Not specified'}</li>
              <li><strong>Link:</strong> ${link || 'Not provided'}</li>
            </ul>
            <p>Please log in to the Task Management system for more details.</p>
            <p>Best regards,<br>Task Management Team</p>
          `,
        };
        return transporter.sendMail(mailOptions).catch(err => {
          console.error(`Failed to send email to ${user.email} for updated meeting ${updatedMeeting._id}:`, err.message);
        });
      });
      await Promise.all(emailPromises);
    }

    res.json(updatedMeeting);
  } catch (err) {
    console.error('Error updating meeting:', err);
    res.status(500).send('Failed to update meeting');
  }
});

// Delete meeting
router.delete('/:id', auth, restrictTo('Admin'), async (req, res) => {
  const { id } = req.params;
  try {
    const meeting = await Meeting.findById(id);
    if (!meeting) {
      return res.status(404).json({ message: 'Meeting not found' });
    }
    await Meeting.findByIdAndDelete(id);

    // Create in-app notifications for meeting deletion
    const admins = await User.find({ role: 'Admin' });
    const adminUsers = admins.map(admin => admin.name.toLowerCase());
    const notifications = [
      ...meeting.participants.map(participant => ({
        user: participant.toLowerCase(),
        message: `Meeting "${meeting.title}" has been cancelled`,
        type: 'DELETED_MEETING',
        meetingId: id,
      })),
      ...adminUsers.map(admin => ({
        user: admin,
        message: `Meeting "${meeting.title}" has been cancelled`,
        type: 'DELETED_MEETING',
        meetingId: id,
      }))
    ];
    const savedNotifications = await Notification.insertMany(notifications);
    const io = req.app.get('io');
    savedNotifications.forEach(notification => {
      io.to(notification.user).emit('newNotification', notification);
    });

    // Send email notifications to participants
    if (meeting.participants.length > 0) {
      const participantDocs = await User.find({ name: { $in: meeting.participants.map(p => p.toLowerCase()) } }).select('email name');
      const emailPromises = participantDocs.map(user => {
        const mailOptions = {
          to: user.email,
          from: process.env.SENDGRID_FROM_EMAIL || 'dhruvsawant1811@gmail.com',
          subject: `Meeting Cancelled: ${meeting.title}`,
          html: `
            <h2>Meeting Cancelled</h2>
            <p>Dear ${user.name},</p>
            <p>The following meeting has been cancelled:</p>
            <ul>
              <li><strong>Title:</strong> ${meeting.title}</li>
              <li><strong>Date:</strong> ${meeting.date}</li>
              <li><strong>Time:</strong> ${meeting.time}</li>
            </ul>
            <p>No further action is required.</p>
            <p>Best regards,<br>Task Management Team</p>
          `,
        };
        return transporter.sendMail(mailOptions).catch(err => {
          console.error(`Failed to send email to ${user.email} for cancelled meeting ${id}:`, err.message);
        });
      });
      await Promise.all(emailPromises);
    }

    res.status(200).send('Meeting deleted successfully');
  } catch (err) {
    console.error('Error deleting meeting:', err);
    res.status(500).send('Failed to delete meeting');
  }
});

module.exports = router;