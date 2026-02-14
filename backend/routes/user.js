import express from 'express';
import User from '../models/User.js';
import { authRequired } from '../middleware/auth.js';

const router = express.Router();

router.put('/me', authRequired, async (req, res) => {
  const { username, password, currentPassword } = req.body;

  if (!username && !password) {
    return res.status(400).json({ message: 'Provide username or password to update.' });
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
      role: currentUser.role,
    },
  });
});

export default router;
