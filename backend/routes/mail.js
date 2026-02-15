import express from 'express';
import MailEntry from '../models/MailEntry.js';
import User from '../models/User.js';
import Domain from '../models/Domain.js';
import { authRequired, authorizeRoles } from '../middleware/auth.js';

const router = express.Router();

router.post('/', authRequired, authorizeRoles('admin'), async (req, res) => {
  const { username, password, user, status, reason, createOnServer } = req.body;

  if (!username || !password || !user || !status || !reason) {
    return res.status(400).json({ message: 'All mail fields are required.' });
  }

  const assignedUser = await User.findOne({ _id: user, role: 'user' });

  if (!assignedUser) {
    return res.status(400).json({ message: 'Assigned user not found.' });
  }

  // Get domain
  let domainDoc = await Domain.findOne();
  if (!domainDoc) {
    return res.status(400).json({ message: 'Domain not set.' });
  }

  const email = `${username}@${domainDoc.domain}`;

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
          local_part: username,
          domain: domainDoc.domain,
          password: password,
          password2: password,
          name: assignedUser.username,
          quota: 2048,
          active: "1"
        })
      });

      console.log('Mail server response status:', response.status);
      console.log('Mail server response headers:', response.headers);

      if (!response.ok) {
        const errorText = await response.text();
        console.log('Mail server error response:', errorText);
        return res.status(500).json({ message: 'Failed to create mailbox on server: HTTP ' + response.status });
      }

      const responseText = await response.text();
      console.log('Mail server create response:', responseText);
      try {
        const responseData = JSON.parse(responseText);
        if (responseData[0] && responseData[0].type === 'success') {
          console.log('Mail server create successful');
        } else {
          console.error('Mail server create failed:', responseData[0]?.msg || 'Unknown error');
          return res.status(500).json({ message: 'Failed to create mailbox on server: ' + (responseData[0]?.msg || 'Unknown error') });
        }
      } catch (e) {
        console.error('Failed to parse create response');
        return res.status(500).json({ message: 'Failed to create mailbox on server: Invalid response' });
      }
    } catch (error) {
      console.error('Error creating mailbox on server:', error);
      return res.status(500).json({ message: 'Failed to create mailbox on server: ' + error.message });
    }
  }

  const entry = await MailEntry.create({ email, password, user, status, reason });

  return res.status(201).json({ message: 'Mail entry created.', entry });
});

router.get('/', authRequired, async (req, res) => {
  const query = req.user.role === 'admin' ? {} : { user: req.user._id };

  const entries = await MailEntry.find(query)
    .populate('user', 'username name role')
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

  // Update on mail server if password changed
  if (password !== undefined) {
    try {
      // Get domain
      let domainDoc = await Domain.findOne();
      if (!domainDoc) {
        // If no domain, skip server update
        console.log('No domain set, skipping mail server update');
      } else {
        const username = mail.email.split('@')[0];
        console.log('Updating mailbox on server for:', username, domainDoc.domain);
        const response = await fetch('https://mail.200m.website/api/v1/edit/mailbox', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': '0A5997-C30759-19D95B-D583EE-C99A2A'
          },
          body: JSON.stringify({
            items: [`${username}@${domainDoc.domain}`],
            attr: {
              password: password,
              password2: password
            }
          })
        });

        console.log('Mail server update response status:', response.status);
        const responseText = await response.text();
        console.log('Mail server update response:', responseText);
        try {
          const responseData = JSON.parse(responseText);
          if (responseData[0] && responseData[0].type === 'success') {
            console.log('Mail server update successful');
          } else {
            console.error('Mail server update failed:', responseData[0]?.msg || 'Unknown error');
          }
        } catch (e) {
          console.error('Failed to parse update response');
        }
      }
    } catch (error) {
      console.error('Error updating mailbox on server:', error);
    }
  }

  const updatedMail = await MailEntry.findById(id).populate('user', 'username name role');

  return res.json({ message: 'Mail entry updated.', entry: updatedMail });
});

router.delete('/:id', authRequired, authorizeRoles('admin'), async (req, res) => {
  const { id } = req.params;

  const mail = await MailEntry.findById(id);

  if (!mail) {
    return res.status(404).json({ message: 'Mail entry not found.' });
  }

  // Delete from mail server
  try {
    let domainDoc = await Domain.findOne();
    if (domainDoc) {
      const username = mail.email.split('@')[0];
      console.log('Deleting mailbox from server for:', username, domainDoc.domain);
      const response = await fetch('https://mail.200m.website/api/v1/delete/mailbox', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': '0A5997-C30759-19D95B-D583EE-C99A2A'
        },
        body: JSON.stringify({
          items: [`${username}@${domainDoc.domain}`]
        })
      });

      console.log('Mail server delete response status:', response.status);
      const responseText = await response.text();
      console.log('Mail server delete response text:', responseText);
      try {
        const responseData = JSON.parse(responseText);
        if (responseData[0] && responseData[0].type === 'success') {
          console.log('Mail server delete successful');
        } else {
          console.error('Mail server delete failed:', responseData[0]?.msg || 'Unknown error');
        }
      } catch (e) {
        console.error('Failed to parse delete response');
      }
    }
  } catch (error) {
    console.error('Error deleting mailbox from server:', error);
  }

  await MailEntry.findByIdAndDelete(id);

  return res.json({ message: 'Mail entry deleted.' });
});

export default router;
