// api-gateway/src/config/services.js
/**
 * Microservices Configuration
 * Maps routes to backend services
 */

const services = {
    auth: {
        url: process.env.AUTH_SERVICE_URL || 'http://localhost:3001',
        prefix: '/api/auth',
        name: 'Auth Service',
        healthCheck: '/health'
    },
    users: {
        url: process.env.USER_SERVICE_URL || 'http://localhost:3002',
        prefix: '/api/users',
        name: 'User Service',
        healthCheck: '/health'
    },
    inventory: {
        url: process.env.INVENTORY_SERVICE_URL || 'http://localhost:3003',
        prefix: '/api/inventory',
        name: 'Inventory Service',
        healthCheck: '/health'
    },
    orders: {
        url: process.env.ORDER_SERVICE_URL || 'http://localhost:3004',
        prefix: '/api/orders',
        name: 'Order Service',
        healthCheck: '/health'
    },
    analytics: {
        url: process.env.ANALYTICS_SERVICE_URL || 'http://localhost:3005',
        prefix: '/api/analytics',
        name: 'Analytics Service',
        healthCheck: '/health'
    }
};

/**
 * Public routes that don't require authentication
 */
const publicRoutes = [
    '/api/auth/register',
    '/api/auth/login',
    '/api/auth/refresh',
    '/health',
    '/api/health'
];

/**
 * Rate limit configurations per route
 */
const rateLimits = {
    default: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 100 // 100 requests per window
    },
    auth: {
        windowMs: 15 * 60 * 1000,
        max: 5 // 5 login attempts per 15 minutes
    },
    api: {
        windowMs: 1 * 60 * 1000, // 1 minute
        max: 60 // 60 requests per minute
    }
};

module.exports = {
    services,
    publicRoutes,
    rateLimits
};