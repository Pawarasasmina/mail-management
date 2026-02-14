import express from 'express';
import User from '../models/User.js';
import { authRequired, authorizeRoles } from '../middleware/auth.js';

const router = express.Router();

router.use(authRequired, authorizeRoles('admin'));

router.post('/users', async (req, res) => {
  const { username, password, role } = req.body;

  if (!username || !password || !role) {
    return res.status(400).json({ message: 'Username, password, and role are required.' });
  }

  if (!['admin', 'user'].includes(role)) {
    return res.status(400).json({ message: 'Role must be admin or user.' });
  }

  const existingUser = await User.findOne({ username });

  if (existingUser) {
    return res.status(400).json({ message: 'Username already exists.' });
  }

  const createdUser = await User.create({ username, password, role });

  return res.status(201).json({
    message: 'User created successfully.',
    user: {
      id: createdUser._id,
      username: createdUser.username,
      role: createdUser.role,
    },
  });
});

router.get('/users', async (req, res) => {
  const { role } = req.query;
  const filter = role ? { role } : {};

  const users = await User.find(filter).select('username role').sort({ username: 1 });

  return res.json({ users });
});

export default router;
