const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');

// Load environment variables from root .env
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });

const { connectMongo, closeConnections } = require('./config/database');
const userRoutes = require('./routes/userRoutes');
const activityRoutes = require('./routes/activityRoutes');
const logger = require('./utils/logger');

const app = express();
const PORT = parseInt(process.env.USER_SERVICE_PORT) || 3002;

// Middleware
if (process.env.HELMET_ENABLED !== 'false') {
  app.use(helmet());
}

// CORS configuration from global .env
const corsOptions = {
  origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : '*',
  credentials: process.env.CORS_CREDENTIALS === 'true',
  methods: process.env.CORS_METHODS ? process.env.CORS_METHODS.split(',') : ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']
};
app.use(cors(corsOptions));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
  const startTime = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    logger.info('Request completed', {
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip
    });
  });
  
  next();
});

// Health check endpoints
const healthCheckPath = process.env.HEALTH_CHECK_PATH || '/health';

app.get(healthCheckPath, (req, res) => {
  res.json({
    status: 'healthy',
    service: 'user-service',
    version: process.env.APP_VERSION || '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

app.get(`/api${healthCheckPath}`, (req, res) => {
  res.json({
    status: 'healthy',
    service: 'user-service',
    version: process.env.APP_VERSION || '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// API Routes
const apiBasePath = process.env.API_BASE_PATH || '/api';
app.use(`${apiBasePath}/users`, userRoutes);
app.use(`${apiBasePath}/users/activity`, activityRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'Route not found'
    }
  });
});

// Global error handler
app.use((err, req, res, next) => {
  logger.error('Global error handler', {
    error: err.message,
    stack: err.stack,
    path: req.path
  });
  
  res.status(err.status || 500).json({
    success: false,
    error: {
      code: err.code || 'INTERNAL_ERROR',
      message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
    }
  });
});

// Start server
const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectMongo();
    
    app.listen(PORT, () => {
      console.log('\n╔════════════════════════════════════════════════════════════╗');
      console.log('║           👥 User Service Started                        ║');
      console.log('╚════════════════════════════════════════════════════════════╝');
      console.log(`📍 Service: http://localhost:${PORT}`);
      console.log(`🏥 Health: http://localhost:${PORT}${healthCheckPath}`);
      console.log(`📡 API: http://localhost:${PORT}${apiBasePath}/users`);
      console.log(`📊 Activity: http://localhost:${PORT}${apiBasePath}/users/activity`);
      console.log(`🗄️  PostgreSQL: ${process.env.POSTGRES_DB}`);
      console.log(`🗄️  MongoDB: ${process.env.MONGODB_DB}`);
      console.log(`⚙️  Environment: ${process.env.NODE_ENV}`);
      console.log(`📝 Log Level: ${process.env.LOG_LEVEL}`);
      console.log('\n✅ Ready to handle requests!\n');
      
      logger.info('User Service started successfully', {
        port: PORT,
        environment: process.env.NODE_ENV,
        version: process.env.APP_VERSION
      });
    });
  } catch (error) {
    logger.error('Failed to start server', { error: error.message });
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Graceful shutdown
const shutdown = async (signal) => {
  logger.info(`${signal} received, shutting down gracefully`);
  console.log(`\n⚠️  ${signal} received, shutting down gracefully...`);
  
  await closeConnections();
  
  process.exit(0);
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

// Unhandled promise rejection
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection', { reason, promise });
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

startServer();