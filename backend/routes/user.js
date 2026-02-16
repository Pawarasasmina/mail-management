import express from 'express';
import User from '../models/User.js';
import EmailRequest from '../models/EmailRequest.js';
import { authRequired } from '../middleware/auth.js';

const router = express.Router();

router.put('/me', authRequired, async (req, res) => {
  const { username, name, password, currentPassword } = req.body;

  if (!username && !name && !password) {
    return res.status(400).json({ message: 'Provide username, name, or password to update.' });
  }

  const currentUser = await User.findById(req.user._id);

  if (!currentUser) {
    return res.status(404).json({ message: 'User not found.' });
  }

  if (username && username !== currentUser.username) {
    const existing = await User.findOne({ username });
    if (existing) {
      return res.status(400).json({ message: 'Username already exists.' });
    }
    currentUser.username = username;
  }

  if (name) {
    currentUser.name = name;
  }

  if (password) {
    if (!currentPassword) {
      return res.status(400).json({ message: 'Current password is required to change password.' });
    }
    const isMatch = await currentUser.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ message: 'Current password is incorrect.' });
    }
    currentUser.password = password;
  }

  await currentUser.save();

  return res.json({
    message: 'Profile updated.',
    user: {
      id: currentUser._id,
      username: currentUser.username,
      name: currentUser.name,
      role: currentUser.role,
    },
  });
});

router.post('/requests', authRequired, async (req, res) => {
  const { requests } = req.body;

  if (!Array.isArray(requests) || requests.length === 0) {
    return res.status(400).json({ message: 'Requests must be a non-empty array.' });
  }

  const emailRequests = requests.map((request) => ({
    user: req.user._id,
    username: request.username,
    reason: request.reason,
  }));

  const createdRequests = await EmailRequest.insertMany(emailRequests);

  // Populate user for emission
  const populatedRequests = await EmailRequest.find({ _id: { $in: createdRequests.map(r => r._id) } }).populate('user', 'username');

  // Emit to admin clients
  const io = req.app.get('io');
  io.emit('newRequest', { requests: populatedRequests });

  return res.status(201).json({
    message: 'Email requests submitted successfully.',
    requests: createdRequests,
  });
});

router.get('/requests', authRequired, async (req, res) => {
  const requests = await EmailRequest.find({ user: req.user._id })
    .sort({ createdAt: -1 });

  return res.json({ requests });
});

export default router;
