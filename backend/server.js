import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import User from './models/User.js';
import authRoutes from './routes/auth.js';
import adminRoutes from './routes/admin.js';
import mailRoutes from './routes/mail.js';
import userRoutes from './routes/user.js';

dotenv.config();

const app = express();
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

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server', error);
    process.exit(1);
  }
};

start();
