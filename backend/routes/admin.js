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

router.put('/users/:id', async (req, res) => {
  const { id } = req.params;
  const { username, password, role } = req.body;

  if (!username || !role) {
    return res.status(400).json({ message: 'Username and role are required.' });
  }

  if (!['admin', 'user'].includes(role)) {
    return res.status(400).json({ message: 'Role must be admin or user.' });
  }

  const user = await User.findById(id);

  if (!user) {
    return res.status(404).json({ message: 'User not found.' });
  }

  user.username = username;
  user.role = role;
  if (password) {
    user.password = password;
  }

  await user.save();

  return res.json({
    message: 'User updated successfully.',
    user: {
      id: user._id,
      username: user.username,
      role: user.role,
    },
  });
});

router.delete('/users/:id', async (req, res) => {
  const { id } = req.params;

  const user = await User.findById(id);

  if (!user) {
    return res.status(404).json({ message: 'User not found.' });
  }

  await User.findByIdAndDelete(id);

  return res.json({ message: 'User deleted successfully.' });
});

export default router;
