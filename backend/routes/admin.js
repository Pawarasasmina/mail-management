import express from 'express';
import User from '../models/User.js';
import EmailRequest from '../models/EmailRequest.js';
import MailEntry from '../models/MailEntry.js';
import Domain from '../models/Domain.js';
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

router.get('/domain', async (req, res) => {
  let domainDoc = await Domain.findOne();
  if (!domainDoc) {
    domainDoc = await Domain.create({ domain: 'example.com' }); // default
  }
  return res.json({ domain: domainDoc.domain });
});

router.put('/domain', async (req, res) => {
  const { domain } = req.body;

  if (!domain || !domain.trim()) {
    return res.status(400).json({ message: 'Domain is required.' });
  }

  let domainDoc = await Domain.findOne();
  if (!domainDoc) {
    domainDoc = await Domain.create({ domain: domain.trim() });
  } else {
    domainDoc.domain = domain.trim();
    await domainDoc.save();
  }

  return res.json({ message: 'Domain updated successfully.', domain: domainDoc.domain });
});

router.get('/requests', async (req, res) => {
  const requests = await EmailRequest.find({})
    .populate('user', 'username')
    .sort({ createdAt: -1 });

  return res.json({ requests });
});

router.put('/requests/:id/approve', async (req, res) => {
  const { id } = req.params;
  const { password, status } = req.body;

  if (!password || !status) {
    return res.status(400).json({ message: 'Password and status are required.' });
  }

  const request = await EmailRequest.findById(id).populate('user');

  if (!request) {
    return res.status(404).json({ message: 'Request not found.' });
  }

  if (request.status !== 'pending') {
    return res.status(400).json({ message: 'Request is not pending.' });
  }

  // Get domain
  let domainDoc = await Domain.findOne();
  if (!domainDoc) {
    return res.status(400).json({ message: 'Domain not set.' });
  }

  const email = `${request.username}@${domainDoc.domain}`;

  // Check if email already exists
  const existingMail = await MailEntry.findOne({ email });
  if (existingMail) {
    return res.status(400).json({ message: 'Email already exists.' });
  }

  // Create mail entry
  const mailEntry = await MailEntry.create({
    email,
    password,
    user: request.user._id,
    status,
    reason: request.reason,
  });

  // Update request
  request.status = 'approved';
  await request.save();

  return res.json({
    message: 'Request approved and mail created successfully.',
    mail: mailEntry,
  });
});

router.get('/mail-server-mailboxes', async (req, res) => {
  try {
    const response = await fetch('https://mail.200m.website/api/v1/get/mailbox/all', {
      headers: {
        'X-API-Key': 'E89221-33F5A9-CBE537-1EEB59-3F6515'
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch mail server data');
    }

    const data = await response.json();
    return res.json({ mailboxes: data });
  } catch (error) {
    console.error('Error fetching mail server mailboxes:', error);
    return res.status(500).json({ message: 'Failed to fetch mail server data' });
  }
});

export default router;
