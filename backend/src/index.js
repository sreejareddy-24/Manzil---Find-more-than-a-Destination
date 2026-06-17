require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { logger } = require('./utils/logger');
const { startSchedulers } = require('./jobs/scheduler');

// Routes
const whatsappRoutes = require('./routes/whatsapp');
const resumeRoutes = require('./routes/resume');
const opportunityRoutes = require('./routes/opportunities');
const profileRoutes = require('./routes/profile');
const analyticsRoutes = require('./routes/analytics');
const authRoutes = require('./routes/auth');
const notificationRoutes = require('./routes/notifications');
const mvpRoutes = require('./routes/mvp');

const app = express();
const PORT = process.env.PORT || 5000;

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

// CORS
app.use(cors({
  origin: [process.env.FRONTEND_URL || 'http://localhost:3000', 'https://careermate-ai.vercel.app'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-user-id']
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' }
});

const webhookLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 200,
  message: { error: 'Too many webhook requests' }
});

app.use('/api/', limiter);
app.use('/webhook/', webhookLimiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    service: 'CareerMate AI Backend'
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/resume', resumeRoutes);
app.use('/api/opportunities', opportunityRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/notifications', notificationRoutes);

// MVP Routes
app.use('/', mvpRoutes);

// WhatsApp Webhook
app.use('/webhook/whatsapp', whatsappRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', { error: err.message, stack: err.stack });
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message
  });
});

// Start server
app.listen(PORT, async () => {
  logger.info(`CareerMate AI Backend running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV}`);

  // Start background schedulers
  if (process.env.NODE_ENV !== 'test') {
    startSchedulers();
    logger.info('Background schedulers initialized');
  }
});

module.exports = app;
