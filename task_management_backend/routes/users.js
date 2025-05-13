const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const sendgridTransport = require('nodemailer-sendgrid-transport');
const multer = require('multer');
const path = require('path');
const speakeasy = require('speakeasy');
const qrcode = require('qrcode');
const User = require('../models/User');
const Activity = require('../models/Activity');
const Task = require('../models/Task');
const Notification = require('../models/Notification');
const { auth, restrictTo } = require('../middleware/auth');

// Base URL for the backend
const BACKEND_URL = 'http://localhost:5001';

// Multer setup for profile picture upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'Uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, `${req.user.id}-${Date.now()}${path.extname(file.originalname)}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);
    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Images only (jpeg, jpg, png)'));
    }
  },
});

// Email transporter setup (SendGrid) for password reset
const transporter = nodemailer.createTransport(
  sendgridTransport({
    auth: {
      api_key: process.env.SENDGRID_API_KEY,
    },
  })
);

// Signup route
router.post('/signup', async (req, res) => {
  const { name, email, password } = req.body;

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const user = new User({
      name,
      email,
      password,
    });

    await user.save();

    const token = jwt.sign(
      { id: user._id, name: user.name, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    await new Activity({
      userId: user._id,
      action: 'Signed up',
    }).save();

    res.status(201).json({ token, user: { id: user._id, name, email, role: user.role } });
  } catch (err) {
    console.error('Error in signup:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// Login route
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    if (user.twoFAEnabled) {
      return res.json({ requires2FA: true, email: user.email, message: 'Enter your 2FA code' });
    }

    const token = jwt.sign(
      { id: user._id, name: user.name, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '15m' }
    );

    await new Activity({
      userId: user._id,
      action: 'Logged in',
    }).save();

    res.json({
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    console.error('Error in login:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// Verify TOTP for login
router.post('/verify-totp-login', async (req, res) => {
  const { email, token } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user || !user.twoFASecret) {
      return res.status(400).json({ message: '2FA not set up' });
    }

    const verified = speakeasy.totp.verify({
      secret: user.twoFASecret,
      encoding: 'base32',
      token,
    });

    if (!verified) {
      return res.status(400).json({ message: 'Invalid 2FA code' });
    }

    const jwtToken = jwt.sign(
      { id: user._id, name: user.name, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '15m' }
    );

    await new Activity({
      userId: user._id,
      action: 'Logged in with 2FA',
    }).save();

    res.json({
      token: jwtToken,
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    console.error('Error in verify TOTP login:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// Forgot password route
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.json({ exists: false, message: 'Email does not exist' });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.otp = otp;
    user.otpExpires = Date.now() + 10 * 60 * 1000;
    await user.save();

    const mailOptions = {
      to: user.email,
      from: process.env.SENDGRID_FROM_EMAIL || 'dhruvsawant1811@gmail.com',
      subject: 'Password Reset OTP',
      html: `
        <h2>Password Reset OTP</h2>
        <p>Your One-Time Password (OTP) for password reset is:</p>
        <h3>${otp}</h3>
        <p>This OTP is valid for 10 minutes. Enter it on the verification page to reset your password.</p>
        <p>If you did not request this, please ignore this email.</p>
      `,
    };

    await transporter.sendMail(mailOptions);
    res.json({ exists: true, message: 'OTP sent to your email' });
  } catch (err) {
    console.error('Error in forgot-password:', err.message);
    res.status(500).json({ message: 'Failed to send OTP' });
  }
});

// Verify OTP and reset password route
router.post('/verify-otp', async (req, res) => {
  const { email, otp, password } = req.body;

  try {
    const user = await User.findOne({
      email,
      otp,
      otpExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    user.password = password;
    user.otp = undefined;
    user.otpExpires = undefined;
    await user.save();

    res.json({ message: 'Password reset successfully' });
  } catch (err) {
    console.error('Error in verify-otp:', err.message);
    res.status(500).json({ message: 'Failed to reset password' });
  }
});

// Get user profile
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('name email profilePicture twoFAEnabled');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    console.log(`Fetched profile for user ${user._id}:`, user);
    res.json({
      name: user.name,
      email: user.email,
      profilePicture: user.profilePicture ? `${BACKEND_URL}${user.profilePicture}` : null,
      twoFAEnabled: user.twoFAEnabled,
    });
  } catch (err) {
    console.error('Error in get profile:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update user profile
router.put('/me', auth, async (req, res) => {
  const { name, email } = req.body;

  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (email && email !== user.email) {
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ message: 'Email already in use' });
      }
    }

    const oldName = user.name;
    user.name = name || user.name;
    user.email = email || user.email;
    await user.save();

    // If name changed, update tasks and notifications
    if (name && name !== oldName) {
      // Update assignedUsers in tasks
      await Task.updateMany(
        { assignedUsers: oldName.toLowerCase() },
        { $set: { 'assignedUsers.$': name.toLowerCase() } }
      );

      // Update user in notifications
      await Notification.updateMany(
        { user: oldName.toLowerCase() },
        { $set: { user: name.toLowerCase() } }
      );

      // Notify via Socket.IO about name change
      const io = req.app.get('io');
      io.to(oldName.toLowerCase()).emit('nameChanged', {
        oldName: oldName.toLowerCase(),
        newName: name.toLowerCase(),
      });
    }

    await new Activity({
      userId: user._id,
      action: 'Updated profile information',
    }).save();

    res.json({
      name: user.name,
      email: user.email,
      profilePicture: user.profilePicture ? `${BACKEND_URL}${user.profilePicture}` : null,
      twoFAEnabled: user.twoFAEnabled,
    });
  } catch (err) {
    console.error('Error in update profile:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// Upload profile picture
router.post('/picture', auth, upload.single('profilePicture'), async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const profilePicturePath = `/Uploads/${req.file.filename}`;
    user.profilePicture = profilePicturePath;
    await user.save();

    console.log(`Profile picture saved for user ${user._id}: ${BACKEND_URL}${profilePicturePath}`);

    await new Activity({
      userId: user._id,
      action: 'Updated profile picture',
    }).save();

    res.json({ profilePicture: `${BACKEND_URL}${profilePicturePath}` });
  } catch (err) {
    console.error('Error in upload picture:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// Change password
router.put('/password', auth, async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    user.password = newPassword;
    await user.save();

    await new Activity({
      userId: user._id,
      action: 'Changed password',
    }).save();

    res.json({ message: 'Password updated' });
  } catch (err) {
    console.error('Error in change password:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// Toggle 2FA (generate TOTP secret and QR code)
router.put('/2fa', auth, async (req, res) => {
  const { enabled } = req.body;

  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (enabled === user.twoFAEnabled) {
      return res.status(400).json({ message: `2FA is already ${enabled ? 'enabled' : 'disabled'}` });
    }

    if (enabled) {
      const secret = speakeasy.generateSecret({
        name: `TaskManagement:${user.email}`,
      });
      user.twoFASecret = secret.base32;
      await user.save();

      const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url);
      res.json({ qrCodeUrl, message: 'Scan this QR code with your authenticator app' });
    } else {
      user.twoFAEnabled = false;
      user.twoFASecret = null;
      await user.save();

      await new Activity({
        userId: user._id,
        action: '2FA disabled',
      }).save();

      res.json({ twoFAEnabled: user.twoFAEnabled });
    }
  } catch (err) {
    console.error('Error in toggle 2FA:', err.message);
    res.status(500).json({ message: 'Failed to toggle 2FA' });
  }
});

// Verify TOTP for enabling 2FA
router.post('/verify-totp', auth, async (req, res) => {
  const { token } = req.body;

  try {
    const user = await User.findById(req.user.id);
    if (!user || !user.twoFASecret) {
      return res.status(400).json({ message: '2FA not set up' });
    }

    const verified = speakeasy.totp.verify({
      secret: user.twoFASecret,
      encoding: 'base32',
      token,
    });

    if (!verified) {
      return res.status(400).json({ message: 'Invalid 2FA code' });
    }

    user.twoFAEnabled = true;
    await user.save();

    await new Activity({
      userId: user._id,
      action: '2FA enabled',
    }).save();

    res.json({ twoFAEnabled: user.twoFAEnabled, message: '2FA enabled successfully' });
  } catch (err) {
    console.error('Error in verify TOTP:', err.message);
    res.status(500).json({ message: 'Failed to verify 2FA' });
  }
});

// Get recent activities
router.get('/activity', auth, async (req, res) => {
  try {
    const activities = await Activity.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .limit(5);
    res.json({ activities });
  } catch (err) {
    console.error('Error in get activities:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete user account
router.delete('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    await Task.updateMany(
      { assignedUsers: user.name.toLowerCase() },
      { $pull: { assignedUsers: user.name.toLowerCase() } }
    );

    await Notification.deleteMany({ user: user.name.toLowerCase() });

    await new Activity({
      userId: user._id,
      action: 'Deleted account',
    }).save();

    await user.deleteOne();

    res.json({ message: 'Account deleted' });
  } catch (err) {
    console.error('Error in delete account:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all users (admin-only)
router.get('/', auth, restrictTo('Admin'), async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.json(users);
  } catch (err) {
    console.error('Error in get all users:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update user role (admin-only)
router.put('/:id/role', auth, restrictTo('Admin'), async (req, res) => {
  const { role } = req.body;

  if (!['User', 'Admin'].includes(role)) {
    return res.status(400).json({ message: 'Invalid role' });
  }

  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user._id.equals(req.user.id) && role !== 'Admin') {
      return res.status(403).json({ message: 'Cannot change your own role' });
    }

    user.role = role;
    await user.save();

    res.json({
      message: 'Role updated',
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    console.error('Error in update role:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete user (admin-only)
router.delete('/:id', auth, restrictTo('Admin'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user._id.equals(req.user.id)) {
      return res.status(403).json({ message: 'Cannot delete your own account' });
    }

    await User.deleteOne({ _id: req.params.id });
    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    console.error('Error in delete user:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (err) {
    console.error('Error in get user by ID:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user email by ID
router.get('/by-id/:id', auth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('email');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) {
    console.error('Error in get user email by ID:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user by email or username
router.get('/by-email/:identifier', auth, async (req, res) => {
  try {
    const { identifier } = req.params;

    const user = await User.findOne({
      $or: [{ email: identifier.toLowerCase()}, { name: identifier }],
    }).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (err) {
    console.error('Error in get user by email/username:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;