/**
 * Anchor API Server
 * Main Express server with all routes
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const bodyParser = require('body-parser');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3001', 'http://localhost:19000'],
  credentials: true,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute per IP
  message: {
    error: true,
    code: 'RATE_LIMIT_EXCEEDED',
    message: 'Too many requests, please try again later',
  },
});

app.use(limiter);

// Body parsing
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/payment', require('./routes/payment'));
app.use('/api/guardian', require('./routes/guardian'));
app.use('/api/vault', require('./routes/vault'));
app.use('/api/allowance', require('./routes/allowance'));
app.use('/api/patterns', require('./routes/patterns'));
app.use('/api/bills', require('./routes/bills'));
app.use('/api/user', require('./routes/user'));

// Webhook routes (no auth required, signature verification instead)
app.use('/api/webhooks', require('./webhooks/up-bank'));

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: true,
    code: 'NOT_FOUND',
    message: 'Endpoint not found',
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: true,
    code: 'SERVER_ERROR',
    message: 'An unexpected error occurred',
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Anchor API server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);

  // Start cron jobs
  const { startCronJobs } = require('./services/cron-jobs');
  startCronJobs();
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  const { stopCronJobs } = require('./services/cron-jobs');
  stopCronJobs();
  process.exit(0);
});

module.exports = app;
