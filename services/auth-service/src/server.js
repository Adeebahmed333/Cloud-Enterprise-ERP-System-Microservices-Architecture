// services/auth-service/src/server.js
require('dotenv').config({ path: '../../.env' });
require('express-async-errors'); // Automatic async error handling

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const authRoutes = require('./routes/authRoutes');

const app = express();
const PORT = process.env.AUTH_SERVICE_PORT || 3001;

/**
 * Security Middleware
 */
app.use(helmet()); // Security headers
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true
}));

/**
 * Body Parser Middleware
 */
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

/**
 * Request Logging Middleware (Simple)
 */
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`);
  });
  next();
});

/**
 * Health Check Endpoint
 */
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      service: 'auth-service',
      status: 'healthy',
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    },
    error: null
  });
});

/**
 * Root Endpoint
 */
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      service: 'Authentication Service',
      version: '1.0.0',
      status: 'running',
      endpoints: {
        health: '/health',
        register: 'POST /api/auth/register',
        login: 'POST /api/auth/login',
        refresh: 'POST /api/auth/refresh',
        logout: 'POST /api/auth/logout',
        verify: 'GET /api/auth/verify',
        me: 'GET /api/auth/me'
      }
    },
    error: null
  });
});

/**
 * API Routes
 */
app.use('/api/auth', authRoutes);

/**
 * 404 Handler
 */
app.use((req, res) => {
  res.status(404).json({
    success: false,
    data: null,
    error: {
      code: 'NOT_FOUND',
      message: `Cannot ${req.method} ${req.path}`
    },
    metadata: {
      timestamp: new Date().toISOString()
    }
  });
});

/**
 * Global Error Handler
 */
app.use((err, req, res, next) => {
  console.error('Global error handler:', err);

  // Database errors
  if (err.code === '23505') {
    return res.status(409).json({
      success: false,
      data: null,
      error: {
        code: 'DUPLICATE_ENTRY',
        message: 'A record with this value already exists'
      },
      metadata: {
        timestamp: new Date().toISOString()
      }
    });
  }

  if (err.code === '23503') {
    return res.status(400).json({
      success: false,
      data: null,
      error: {
        code: 'INVALID_REFERENCE',
        message: 'Referenced record does not exist'
      },
      metadata: {
        timestamp: new Date().toISOString()
      }
    });
  }

  // Default error
  res.status(err.statusCode || 500).json({
    success: false,
    data: null,
    error: {
      code: err.code || 'INTERNAL_ERROR',
      message: err.message || 'An unexpected error occurred'
    },
    metadata: {
      timestamp: new Date().toISOString()
    }
  });
});

/**
 * Start Server
 */
const server=app.listen(PORT, () => {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║        🔐 Authentication Service Started                  ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log(`📍 Server running on: http://localhost:${PORT}`);
  console.log(`🏥 Health check: http://localhost:${PORT}/health`);
  console.log(`📚 Endpoints: http://localhost:${PORT}/`);
  console.log(`⏰ Started at: ${new Date().toISOString()}`);
  console.log('════════════════════════════════════════════════════════════');
});

/**
 * Graceful Shutdown
 */
const gracefulShutdown = () => {
  console.log('\n🛑 Shutting down gracefully...');
  server.close(() => {
    console.log('✅ HTTP server closed');
    process.exit(0);
  });

  // Force shutdown after 10 seconds
  setTimeout(() => {
    console.error('⚠️  Forcing shutdown');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

module.exports = app;