import express from 'express';
import User from '../models/User.js';
import EmailRequest from '../models/EmailRequest.js';
import MailEntry from '../models/MailEntry.js';
import Domain from '../models/Domain.js';
import { authRequired, authorizeRoles } from '../middleware/auth.js';

const router = express.Router();

router.use(authRequired, authorizeRoles('admin'));

router.post('/users', async (req, res) => {
  const { username, name, password, role } = req.body;

  if (!username || !name || !password || !role) {
    return res.status(400).json({ message: 'Username, name, password, and role are required.' });
  }

  if (!['admin', 'user'].includes(role)) {
    return res.status(400).json({ message: 'Role must be admin or user.' });
  }

  const existingUser = await User.findOne({ username });

  if (existingUser) {
    return res.status(400).json({ message: 'Username already exists.' });
  }

  const createdUser = await User.create({ username, name, password, role });

  return res.status(201).json({
    message: 'User created successfully.',
    user: {
      id: createdUser._id,
      username: createdUser.username,
      name: createdUser.name,
      role: createdUser.role,
    },
  });
});

router.get('/users', async (req, res) => {
  const { role } = req.query;
  const filter = role ? { role } : {};

  const users = await User.find(filter).select('username name role').sort({ username: 1 });

  return res.json({ users });
});

router.put('/users/:id', async (req, res) => {
  const { id } = req.params;
  const { username, name, password, role } = req.body;

  if (!username || !name || !role) {
    return res.status(400).json({ message: 'Username, name, and role are required.' });
  }

  if (!['admin', 'user'].includes(role)) {
    return res.status(400).json({ message: 'Role must be admin or user.' });
  }

  const user = await User.findById(id);

  if (!user) {
    return res.status(404).json({ message: 'User not found.' });
  }

  user.username = username;
  user.name = name;
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
      name: user.name,
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
    .populate('user', 'username name')
    .sort({ createdAt: -1 });

  return res.json({ requests });
});

router.put('/requests/:id/approve', async (req, res) => {
  const { id } = req.params;
  const { password, status, createOnServer } = req.body;

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

  // Create on mail server if requested
  if (createOnServer) {
    try {
      const response = await fetch('https://mail.200m.website/api/v1/add/mailbox', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': '0A5997-C30759-19D95B-D583EE-C99A2A'
        },
        body: JSON.stringify({
          local_part: request.username,
          domain: domainDoc.domain,
          password: password,
          password2: password,
          name: request.user.username,
          quota: 2048,
          active: "1"
        })
      });

      console.log('Mail server response status:', response.status);
      console.log('Mail server response headers:', response.headers);

      if (!response.ok) {
        const errorText = await response.text();
        console.log('Mail server error response:', errorText);
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch (e) {
          errorData = { message: errorText };
        }
        return res.status(500).json({ message: 'Failed to create mailbox on server: ' + (errorData.message || 'Unknown error') });
      }
    } catch (error) {
      console.error('Error creating mailbox on server:', error);
      return res.status(500).json({ message: 'Failed to create mailbox on server: ' + error.message });
    }
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

router.put('/requests/:id', async (req, res) => {
  const { id } = req.params;
  const { status, adminReply } = req.body;

  if (!status) {
    return res.status(400).json({ message: 'Status is required.' });
  }

  const request = await EmailRequest.findById(id);

  if (!request) {
    return res.status(404).json({ message: 'Request not found.' });
  }

  if (request.status !== 'pending') {
    return res.status(400).json({ message: 'Request is not pending.' });
  }

  request.status = status;
  if (adminReply) {
    request.adminReply = adminReply;
  }
  await request.save();

  return res.json({
    message: 'Request updated successfully.',
    request,
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

    if (req.query.all === 'true') {
      return res.json({ mailboxes: data });
    }

    // Get domain
    let domainDoc = await Domain.findOne();
    if (!domainDoc) {
      return res.status(400).json({ message: 'Domain not set.' });
    }

    // Get all existing emails in our DB
    const existingMails = await MailEntry.find({}, 'email');
    const existingEmails = new Set(existingMails.map(mail => mail.email.toLowerCase()));

    // Filter out mailboxes that already exist in our DB
    const newMailboxes = data.filter(mailbox => {
      const mailboxEmail = mailbox.username.includes('@') ? mailbox.username.toLowerCase() : `${mailbox.username}@${domainDoc.domain}`.toLowerCase();
      return !existingEmails.has(mailboxEmail);
    });

    return res.json({ mailboxes: newMailboxes });
  } catch (error) {
    console.error('Error fetching mail server mailboxes:', error);
    return res.status(500).json({ message: 'Failed to fetch mail server data' });
  }
});

router.put('/mail-server-mailboxes/:email', async (req, res) => {
  const { email } = req.params;
  const { password, active } = req.body;

  try {
    const updateData = {};
    if (password !== undefined) {
      updateData.password = password;
      updateData.password2 = password;
    }
    if (active !== undefined) {
      updateData.active = active ? "1" : "0";
    }

    const response = await fetch('https://mail.200m.website/api/v1/edit/mailbox', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': 'E89221-33F5A9-CBE537-1EEB59-3F6515'
      },
      body: JSON.stringify({
        items: [email],
        attr: updateData
      })
    });

    if (!response.ok) {
      throw new Error('Failed to update mailbox on server');
    }

    const responseText = await response.text();
    const responseData = JSON.parse(responseText);

    if (responseData[0] && responseData[0].type === 'success') {
      return res.json({ message: 'Mailbox updated successfully on mail server.' });
    } else {
      return res.status(500).json({ message: 'Failed to update mailbox: ' + (responseData[0]?.msg || 'Unknown error') });
    }
  } catch (error) {
    console.error('Error updating mailbox on server:', error);
    return res.status(500).json({ message: 'Failed to update mailbox on server: ' + error.message });
  }
});

router.delete('/mail-server-mailboxes/:email', async (req, res) => {
  const { email } = req.params;

  try {
    const response = await fetch('https://mail.200m.website/api/v1/delete/mailbox', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': 'E89221-33F5A9-CBE537-1EEB59-3F6515'
      },
      body: JSON.stringify({
        items: [email]
      })
    });

    if (!response.ok) {
      throw new Error('Failed to delete mailbox from server');
    }

    const responseText = await response.text();
    const responseData = JSON.parse(responseText);

    if (responseData[0] && responseData[0].type === 'success') {
      return res.json({ message: 'Mailbox deleted successfully from mail server.' });
    } else {
      return res.status(500).json({ message: 'Failed to delete mailbox: ' + (responseData[0]?.msg || 'Unknown error') });
    }
  } catch (error) {
    console.error('Error deleting mailbox from server:', error);
    return res.status(500).json({ message: 'Failed to delete mailbox from server: ' + error.message });
  }
});

router.post('/import-mailbox', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required.' });
  }

  // Get the domain
  let domainDoc = await Domain.findOne();
  if (!domainDoc) {
    return res.status(500).json({ message: 'Domain not configured.' });
  }
  const fullEmail = email.includes('@') ? email.toLowerCase() : `${email}@${domainDoc.domain}`.toLowerCase();

  // Check if already exists
  const existingMail = await MailEntry.findOne({ email: fullEmail });
  if (existingMail) {
    return res.status(400).json({ message: 'Mailbox already exists in the system.' });
  }

  // Use the Company user
  const companyUser = await User.findOne({ username: 'Company' });
  if (!companyUser) {
    return res.status(500).json({ message: 'Company user not found.' });
  }

  const mailEntry = await MailEntry.create({
    email: fullEmail,
    password,
    user: companyUser._id,
    status: 'active',
    reason: 'Imported from mail server',
  });

  return res.status(201).json({
    message: 'Mailbox imported successfully.',
    mail: mailEntry,
  });
});

export default router;
