require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const winston = require('winston');
const path = require('path');   // <-- added for static file serving

const authRoutes = require('./routes/auth');
const dashboardRoutes = require('./routes/dashboard');
const transactionsRoutes = require('./routes/transactions');
const cardsRoutes = require('./routes/cards');
const beneficiariesRoutes = require('./routes/beneficiaries');
const paymentsRoutes = require('./routes/payments');
const sessionsRoutes = require('./routes/sessions');
const userRoutes = require('./routes/user');
const notificationsRoutes = require('./routes/notifications');
const supportRoutes = require('./routes/support');

const app = express();
const isProduction = process.env.NODE_ENV === 'production';

// ----- Security Middleware -----
app.use(helmet());

// ----- CORS: permissive in dev, restricted in prod -----
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : [];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (!isProduction || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`CORS blocked: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));

// Logging
app.use(morgan('combined'));

// Rate limiting
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { success: false, message: 'Too many requests from this IP, please try again later.' },
});
app.use('/api', globalLimiter);

// Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ----- API Routes (must come before static and catch-all) -----
app.get('/api/test', (_req, res) => res.status(200).json({ success: true, message: 'API is working' }));

app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/transactions', transactionsRoutes);
app.use('/api/cards', cardsRoutes);
app.use('/api/beneficiaries', beneficiariesRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/sessions', sessionsRoutes);
app.use('/api/user', userRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/support', supportRoutes);

// Application endpoint
app.post('/api/apply', (req, res) => {
  const { full_name, email, phone, product_interested_in, message } = req.body;
  if (!full_name || !email || !phone || !product_interested_in) {
    return res.status(400).json({ success: false, message: 'Please complete the required fields.' });
  }
  return res.status(200).json({
    success: true,
    message: 'Application submitted successfully',
    data: { full_name, email, phone, product_interested_in, message: message || null },
  });
});

// ----- Serve React static files (from the frontend build) -----
// The build is at ../summit-shares/dist relative to this file (backend/server.js)
const buildPath = path.join(__dirname, '../summit-shares/dist');
app.use(express.static(buildPath));

// ----- Catch-all: serve index.html for any non-API request (SPA routing) -----
app.get('*', (req, res) => {
  res.sendFile(path.join(buildPath, 'index.html'));
});

// ----- 404 handler for API routes that weren't matched -----
app.use((req, res) => {
  if (req.path.startsWith('/api')) {
    res.status(404).json({ success: false, message: 'API route not found' });
  }
  // For any other path, the catch-all already handled it.
});

// Logger
const logger = winston.createLogger({
  level: 'error',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
  ],
});
if (!isProduction) {
  logger.add(new winston.transports.Console({ format: winston.format.simple() }));
}

// Global error handler
app.use((err, req, res, _next) => {
  logger.error(err.stack);
  const status = err.status || 500;
  res.status(status).json({ success: false, message: err.message || 'Internal server error' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));