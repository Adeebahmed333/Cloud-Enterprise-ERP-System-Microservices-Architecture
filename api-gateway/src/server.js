// api-gateway/src/server.js
require('dotenv').config({ path: '../.env' });
require('express-async-errors');

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { authenticate } = require('./middleware/auth');
const { smartRateLimiter } = require('./middleware/rateLimiter');
const { serviceProxies, services } = require('./middleware/proxy');
const { logger, requestLogger } = require('./utils/logger');

const app = express();
const PORT = process.env.API_GATEWAY_PORT || 3000;

/**
 * Security Middleware
 */
app.use(helmet());
app.use(cors({
    origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:5173', 'http://localhost:3000'],
    credentials: true
}));

/**
 * Body Parser
 */
/**
 * Request Logging
 */
app.use(requestLogger);

/**
 * Rate Limiting
 */
app.use(smartRateLimiter);

/**
 * Authentication
 */
app.use(authenticate);

/**
 * Health Check
 */
app.get('/health', (req, res) => {
    res.json({
        success: true,
        data: {
            service: 'api-gateway',
            status: 'healthy',
            uptime: process.uptime(),
            timestamp: new Date().toISOString(),
            services: Object.keys(services).reduce((acc, key) => {
                acc[key] = {
                    name: services[key].name,
                    url: services[key].url,
                    prefix: services[key].prefix
                };
                return acc;
            }, {})
        }
    });
});

/**
 * Gateway Info
 */
app.get('/', (req, res) => {
    res.json({
        success: true,
        data: {
            service: 'API Gateway',
            version: '1.0.0',
            status: 'running',
            endpoints: {
                health: '/health',
                auth: '/api/auth/*',
                users: '/api/users/*',
                inventory: '/api/inventory/*',
                orders: '/api/orders/*',
                analytics: '/api/analytics/*'
            },
            services: Object.keys(services).map(key => ({
                name: services[key].name,
                prefix: services[key].prefix,
                url: services[key].url
            }))
        }
    });
});

/**
 * Service Routes - Proxy to microservices
 */
Object.keys(services).forEach(key => {
    const service = services[key];
    app.use(service.prefix, serviceProxies[key]);
    logger.info(`Registered route: ${service.prefix} → ${service.url}`);
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

/**
 * 404 Handler
 */
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: {
            code: 'NOT_FOUND',
            message: `Cannot ${req.method} ${req.path}`,
            availableRoutes: Object.keys(services).map(key => services[key].prefix)
        }
    });
});

/**
 * Global Error Handler
 */
app.use((err, req, res, next) => {
    logger.error('Unhandled error', {
        error: err.message,
        stack: err.stack,
        path: req.path
    });

    res.status(err.statusCode || 500).json({
        success: false,
        error: {
            code: err.code || 'INTERNAL_ERROR',
            message: err.message || 'An unexpected error occurred'
        }
    });
});

/**
 * Start Server
 */
const server = app.listen(PORT, () => {
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║           🚪 API Gateway Started                          ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log(`📍 Gateway running on: http://localhost:${PORT}`);
    console.log(`🏥 Health check: http://localhost:${PORT}/health`);
    console.log('');
    console.log('📡 Registered Services:');
    Object.keys(services).forEach(key => {
        console.log(`   ${services[key].prefix.padEnd(20)} → ${services[key].url}`);
    });
    console.log('');
    console.log(`⏰ Started at: ${new Date().toISOString()}`);
    console.log('════════════════════════════════════════════════════════════');
});

/**
 * Graceful Shutdown
 */
const gracefulShutdown = () => {
    console.log('\n🛑 Shutting down gracefully...');
    server.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
    });

    setTimeout(() => {
        console.error('⚠️  Forcing shutdown');
        process.exit(1);
    }, 10000);
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

module.exports = app;