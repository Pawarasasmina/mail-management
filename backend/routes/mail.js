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

router.put('/:id', authRequired, async (req, res) => {
  const { id } = req.params;
  const { email, password, user, status, reason } = req.body;

  const mail = await MailEntry.findById(id);

  if (!mail) {
    return res.status(404).json({ message: 'Mail entry not found.' });
  }

  // Check permissions: admin can edit any, user can only edit their own
  if (req.user.role !== 'admin' && mail.user.toString() !== req.user._id.toString()) {
    return res.status(403).json({ message: 'Access denied.' });
  }

  // Users can only update password
  if (req.user.role !== 'admin') {
    if (password !== undefined) {
      mail.password = password;
    }
  } else {
    // Admin can update all fields
    if (email !== undefined) mail.email = email;
    if (password !== undefined) mail.password = password;
    if (user !== undefined) mail.user = user;
    if (status !== undefined) mail.status = status;
    if (reason !== undefined) mail.reason = reason;
  }

  await mail.save();

  const updatedMail = await MailEntry.findById(id).populate('user', 'username role');

  return res.json({ message: 'Mail entry updated.', entry: updatedMail });
});

router.delete('/:id', authRequired, authorizeRoles('admin'), async (req, res) => {
  const { id } = req.params;

  const mail = await MailEntry.findById(id);

  if (!mail) {
    return res.status(404).json({ message: 'Mail entry not found.' });
  }

  await MailEntry.findByIdAndDelete(id);

  return res.json({ message: 'Mail entry deleted.' });
});

export default router;
