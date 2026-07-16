const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');
// express-mongo-sanitize removed — incompatible with Express 5 (req.query is read-only)
// Using custom sanitization below instead
const morgan = require('morgan');
const userRoutes = require('./modules/user/user.routes');
const vocabularyRoutes = require('./modules/vocabulary/vocabulary.routes');
const progressRoutes = require('./modules/progress/progress.routes');
const schreibenRoutes = require('./modules/schreiben/schreiben.routes');
const sprechenRoutes = require('./modules/sprechen/sprechen.routes');
const notesRoutes = require('./modules/notes/notes.routes');
const affiliateRoutes = require('./modules/affiliate/affiliate.routes');
const authRoutes = require('./modules/auth/auth.routes');
const authenticate = require('./middlewares/auth.middleware');

const app = express();

// Ensure DB is connected before handling any request (serverless support)
app.use(async (req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    try {
      await mongoose.connect(process.env.MONGO_DB_URL);
    } catch (err) {
      console.error('MongoDB connection error:', err.message);
      return res.status(503).json({ error: 'Database connection failed' });
    }
  }
  next();
});

// Trust proxy (needed for Vercel/reverse proxies + rate limiting)
app.set('trust proxy', 1);

// 9. Logging & Monitoring
app.use(morgan('combined'));

// 5. Security Misconfiguration - security headers
app.use(helmet());

// 1. Broken Access Control - CORS
const corsOrigins = (process.env.CORS_ORIGIN || '*').split(',').map(s => s.trim());
app.use(cors({
  origin: corsOrigins.length === 1 && corsOrigins[0] === '*' ? '*' : corsOrigins,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-admin-secret'],
}));

// 7. Auth Failures - Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 700,
  message: { error: 'Too many requests, please try again later' },
});
app.use(limiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many login attempts, please try again later' },
});

// Body parser with size limit (prevents DoS)
app.use(express.json({ limit: '50kb' }));

// 3. Injection - sanitize MongoDB operators from user input ($ and . in keys)
function sanitizeMongo(obj) {
  if (obj && typeof obj === 'object') {
    for (const key of Object.keys(obj)) {
      if (key.startsWith('$') || key.includes('.')) {
        delete obj[key];
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        sanitizeMongo(obj[key]);
      }
    }
  }
  return obj;
}

app.use((req, res, next) => {
  if (req.body) sanitizeMongo(req.body);
  if (req.params) sanitizeMongo(req.params);
  next();
});

// 8. Data Integrity - strip HTML/script tags from string inputs.
// Notes support rich text, so they are exempt here and sanitized with an
// allowlist inside the notes module instead.
app.use((req, res, next) => {
  if (req.path.startsWith('/notes')) return next();
  if (req.body && typeof req.body === 'object') {
    sanitizeObject(req.body);
  }
  next();
});

function sanitizeObject(obj) {
  for (const key of Object.keys(obj)) {
    if (typeof obj[key] === 'string') {
      obj[key] = obj[key].replace(/<[^>]*>/g, '');
    } else if (typeof obj[key] === 'object' && obj[key] !== null) {
      sanitizeObject(obj[key]);
    }
  }
}

app.get('/', (req, res) => {
  res.json({ message: 'Hello from Express!' });
});

// Public routes
app.use('/auth', authLimiter, authRoutes);

// Affiliate routes (self-managed auth: public / influencer JWT / admin secret)
app.use('/affiliate', affiliateRoutes);

// Protected routes - require valid JWT
app.use('/users', authenticate, userRoutes);
app.use('/vocabulary', authenticate, vocabularyRoutes);
app.use('/progress', authenticate, progressRoutes);
app.use('/schreiben', authenticate, schreibenRoutes);
app.use('/sprechen', authenticate, sprechenRoutes);
app.use('/notes', authenticate, notesRoutes);

// Global error handler - prevents leaking stack traces
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong' });
});

module.exports = app;
