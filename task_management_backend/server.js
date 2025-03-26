// task-management-backend/server.js
require('dotenv').config(); // Load environment variables
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Atlas Connection
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log('Connected to MongoDB Atlas'))
  .catch(err => console.error('MongoDB Atlas connection error:', err));

// Routes
const tasksRouter = require('./routes/tasks');
const userRoutes = require('./routes/users');

app.use('/api/tasks', tasksRouter);
app.use('/api/users', userRoutes);

// Start Server
app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});