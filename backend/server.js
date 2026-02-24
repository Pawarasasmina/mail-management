import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import { createServer } from 'http';
import { Server } from 'socket.io';
import User from './models/User.js';
import Domain from './models/Domain.js';
import MailEntry from './models/MailEntry.js';
import { getMailServerReadApiKey, getMailServerUrl } from './utils/mailServerConfig.js';
import authRoutes from './routes/auth.js';
import adminRoutes from './routes/admin.js';
import mailRoutes from './routes/mail.js';
import userRoutes from './routes/user.js';

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // In production, specify your frontend URL
    methods: ["GET", "POST"]
  }
});
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/mails', mailRoutes);
app.use('/api/users', userRoutes);

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ message: 'Internal server error.' });
});

// Make io available to routes
app.set('io', io);

// Socket connection
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Poll for new mailboxes and emit real-time updates
let previousNewMailboxes = [];
setInterval(async () => {
  try {
    // Fetch domain
    let domainDoc = await Domain.findOne();
    if (!domainDoc) return;

    // Fetch all mailboxes from mail server
    const response = await fetch(getMailServerUrl('/api/v1/get/mailbox/all'), {
      headers: {
        'X-API-Key': getMailServerReadApiKey()
      }
    });

    if (!response.ok) return;

    const data = await response.json();

    // Get existing emails in DB
    const existingMails = await MailEntry.find({}, 'email');
    const existingEmails = new Set(existingMails.map(mail => mail.email.toLowerCase()));

    // Filter new mailboxes
    const newMailboxes = data.filter(mailbox => {
      const mailboxEmail = mailbox.username.includes('@') ? mailbox.username.toLowerCase() : `${mailbox.username}@${domainDoc.domain}`.toLowerCase();
      return !existingEmails.has(mailboxEmail);
    });

    // Find truly new ones
    const newOnes = newMailboxes.filter(mail => !previousNewMailboxes.some(prev => prev.username === mail.username));

    if (newOnes.length > 0) {
      io.emit('newMailboxes', { newMailboxes: newOnes });
    }

    previousNewMailboxes = newMailboxes;
  } catch (error) {
    console.error('Error polling mailboxes:', error);
  }
}, 30000); // Poll every 30 seconds

const ensureDefaultAdmin = async () => {
  const username = process.env.DEFAULT_ADMIN_USERNAME;
  const password = process.env.DEFAULT_ADMIN_PASSWORD;

  if (!username || !password) {
    return;
  }

  const existing = await User.findOne({ username });

  if (!existing) {
    await User.create({ username, password, role: 'admin' });
    console.log(`Default admin created: ${username}`);
  }
};

const start = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    await ensureDefaultAdmin();

    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server', error);
    process.exit(1);
  }
};

start();
