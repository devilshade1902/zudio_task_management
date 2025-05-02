const express = require('express');
const Message = require('../models/Message');
const router = express.Router();

// POST: Save a message to the database
router.post('/:roomId/messages', async (req, res) => {
  const { roomId } = req.params;
  const { username, message } = req.body;

  try {
    const newMessage = new Message({ roomId, username, message });
    await newMessage.save();
    res.status(201).json(newMessage);
  } catch (error) {
    console.error('Error saving message:', error);
    res.status(500).send('Failed to save message');
  }
});

// GET: Retrieve all messages for a specific room
router.get('/:roomId/messages', async (req, res) => {
  const { roomId } = req.params;

  try {
    const messages = await Message.find({ roomId }).sort({ timestamp: 1 });
    res.json(messages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).send('Failed to fetch messages');
  }
});

module.exports = router;