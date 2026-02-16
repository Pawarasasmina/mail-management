import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { authRequired } from '../middleware/auth.js';

const router = express.Router();

const signToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '1d' });

router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password are required.' });
  }

  const user = await User.findOne({ username });

  if (!user) {
    return res.status(401).json({ message: 'Invalid credentials.' });
  }

  const isMatch = await user.comparePassword(password);

  if (!isMatch) {
    return res.status(401).json({ message: 'Invalid credentials.' });
  }

  const token = signToken(user._id);

  return res.json({
    token,
    user: {
      id: user._id,
      username: user.username,
      name: user.name,
      role: user.role,
    },
  });
});

router.get('/me', authRequired, (req, res) => {
  return res.json({
    user: {
      id: req.user._id,
      username: req.user.username,
      name: req.user.name,
      role: req.user.role,
    },
  });
});

export default router;
