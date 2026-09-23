import 'dotenv/config';
import express from 'express';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT || 3000);
const isProduction = process.env.NODE_ENV === 'production';

if (!process.env.MONGODB_URI) {
  console.error('MONGODB_URI belum diisi. Buat .env berdasarkan .env.example.');
  process.exit(1);
}

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  console.error('JWT_SECRET wajib ada dan minimal 32 karakter.');
  process.exit(1);
}

app.disable('x-powered-by');
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));
app.use(express.json({ limit: '16kb' }));
app.use(express.urlencoded({ extended: false, limit: '16kb' }));
app.use(cookieParser());

const authLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Terlalu banyak percobaan. Coba lagi beberapa menit lagi.'
  }
});

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    trim: true,
    minlength: 3,
    maxlength: 24,
    unique: true,
    index: true
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    maxlength: 120,
    unique: true,
    index: true
  },
  passwordHash: {
    type: String,
    required: true,
    select: false
  }
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

function normalizeUsername(value) {
  return String(value || '').trim().toLowerCase();
}

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function validUsername(username) {
  return /^[a-zA-Z0-9_]{3,24}$/.test(username);
}

function validEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) && email.length <= 120;
}

function createAuthToken(user) {
  return jwt.sign(
    { sub: user._id.toString(), username: user.username },
    process.env.JWT_SECRET,
    { expiresIn: '7d', issuer: 'igneel-restapi' }
  );
}

function setAuthCookie(res, token) {
  res.cookie('igneel_auth', token, {
    httpOnly: true,
    sameSite: 'strict',
    secure: isProduction,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/'
  });
}

function requireAuth(req, res, next) {
  try {
    const token = req.cookies.igneel_auth;
    if (!token) {
      return res.status(401).json({ success: false, message: 'Belum login.' });
    }

    const payload = jwt.verify(token, process.env.JWT_SECRET, { issuer: 'igneel-restapi' });
    req.user = payload;
    next();
  } catch {
    res.clearCookie('igneel_auth', { httpOnly: true, sameSite: 'strict', secure: isProduction, path: '/' });
    return res.status(401).json({ success: false, message: 'Sesi tidak valid atau sudah berakhir.' });
  }
}

app.post('/api/auth/register', authLimiter, async (req, res) => {
  try {
    const username = normalizeUsername(req.body.username);
    const email = normalizeEmail(req.body.email);
    const password = String(req.body.password || '');

    if (!validUsername(username)) {
      return res.status(400).json({ success: false, message: 'Username 3-24 karakter: huruf, angka, dan underscore saja.' });
    }
    if (!validEmail(email)) {
      return res.status(400).json({ success: false, message: 'Format email tidak valid.' });
    }
    if (password.length < 8 || password.length > 128) {
      return res.status(400).json({ success: false, message: 'Password harus 8-128 karakter.' });
    }

    const duplicate = await User.findOne({ $or: [{ username }, { email }] }).lean();
    if (duplicate) {
      const sameUsername = duplicate.username === username;
      return res.status(409).json({
        success: false,
        message: sameUsername ? 'Username sudah dipakai.' : 'Email sudah terdaftar.'
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({ username, email, passwordHash });

    return res.status(201).json({
      success: true,
      message: 'Registrasi berhasil.',
      user: { username: user.username, email: user.email }
    });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({ success: false, message: 'Username atau email sudah digunakan.' });
    }
    console.error('REGISTER_ERROR', error);
    return res.status(500).json({ success: false, message: 'Server sedang bermasalah.' });
  }
});

app.post('/api/auth/login', authLimiter, async (req, res) => {
  try {
    const identity = String(req.body.identity || '').trim().toLowerCase();
    const password = String(req.body.password || '');

    if (!identity || !password) {
      return res.status(400).json({ success: false, message: 'Username/email dan password wajib diisi.' });
    }

    const user = await User.findOne({ $or: [{ username: identity }, { email: identity }] }).select('+passwordHash');
    if (!user) {
      return res.status(401).json({ success: false, message: 'Username/email atau password salah.' });
    }

    const passwordOk = await bcrypt.compare(password, user.passwordHash);
    if (!passwordOk) {
      return res.status(401).json({ success: false, message: 'Username/email atau password salah.' });
    }

    setAuthCookie(res, createAuthToken(user));

    return res.json({
      success: true,
      message: `Login berhasil. Selamat datang, ${user.username}!`,
      user: { username: user.username, email: user.email }
    });
  } catch (error) {
    console.error('LOGIN_ERROR', error);
    return res.status(500).json({ success: false, message: 'Server sedang bermasalah.' });
  }
});

app.get('/api/auth/me', requireAuth, async (req, res) => {
  const user = await User.findById(req.user.sub).lean();
  if (!user) {
    return res.status(401).json({ success: false, message: 'Akun tidak ditemukan.' });
  }
  res.json({ success: true, user: { username: user.username, email: user.email } });
});

app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('igneel_auth', { httpOnly: true, sameSite: 'strict', secure: isProduction, path: '/' });
  res.json({ success: true, message: 'Berhasil logout.' });
});

app.get('/api/health', (req, res) => {
  res.json({ success: true, app: 'igneel-restapi', database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected' });
});

app.use(express.static(path.join(__dirname, 'public'), {
  extensions: ['html']
}));

app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Endpoint tidak ditemukan.' });
});

async function bootstrap() {
  await mongoose.connect(process.env.MONGODB_URI, {
    dbName: process.env.MONGODB_DB_NAME || undefined
  });
  console.log(`MongoDB connected: ${mongoose.connection.host}`);

  const server = app.listen(PORT, () => {
    console.log(`Igneel RestAPI running at http://localhost:${PORT}`);
  });

  const shutdown = async (signal) => {
    console.log(`${signal} received. Shutting down...`);
    server.close(async () => {
      await mongoose.connection.close();
      process.exit(0);
    });
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

bootstrap().catch((error) => {
  console.error('BOOT_ERROR', error);
  process.exit(1);
});
