import express from 'express';
import MailEntry from '../models/MailEntry.js';
import User from '../models/User.js';
import { authRequired, authorizeRoles } from '../middleware/auth.js';

const router = express.Router();

router.post('/', authRequired, authorizeRoles('admin'), async (req, res) => {
  const { email, password, user, status, reason } = req.body;

  if (!email || !password || !user || !status || !reason) {
    return res.status(400).json({ message: 'All mail fields are required.' });
  }

  const assignedUser = await User.findOne({ _id: user, role: 'user' });

  if (!assignedUser) {
    return res.status(400).json({ message: 'Assigned user not found.' });
  }

  const entry = await MailEntry.create({ email, password, user, status, reason });

  return res.status(201).json({ message: 'Mail entry created.', entry });
});

router.get('/', authRequired, async (req, res) => {
  const query = req.user.role === 'admin' ? {} : { user: req.user._id };

  const entries = await MailEntry.find(query)
    .populate('user', 'username role')
    .sort({ createdAt: -1 });

  return res.json({ entries });
});

export default router;
