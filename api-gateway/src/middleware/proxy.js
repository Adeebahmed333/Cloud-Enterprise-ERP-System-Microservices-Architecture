// api-gateway/src/middleware/proxy.js
const { createProxyMiddleware } = require('http-proxy-middleware');
const { services } = require('../config/services');

/**
 * Create proxy middleware for a service
 */
const createServiceProxy = (serviceConfig) => {
    return createProxyMiddleware({
        target: serviceConfig.url,
        changeOrigin: true,
        // DON'T rewrite path - services expect full path
        onProxyReq: (proxyReq, req) => {
            // Log the proxied request
            console.log(`[PROXY] ${req.method} ${req.path} → ${serviceConfig.url}${req.path}`);

            // Forward user information if authenticated
            if (req.user) {
                proxyReq.setHeader('X-User-Id', req.user.userId);
                proxyReq.setHeader('X-User-Email', req.user.email);
                proxyReq.setHeader('X-User-Roles', JSON.stringify(req.user.roles));
            }

            // Forward original IP
            proxyReq.setHeader('X-Forwarded-For', req.ip);
            proxyReq.setHeader('X-Real-IP', req.ip);
        },
        onProxyRes: (proxyRes, req, res) => {
            // Log the response
            console.log(`[PROXY] ${req.method} ${req.path} ← ${proxyRes.statusCode}`);
        },
        onError: (err, req, res) => {
            console.error(`[PROXY ERROR] ${serviceConfig.name}:`, err.message);

            res.status(503).json({
                success: false,
                error: {
                    code: 'SERVICE_UNAVAILABLE',
                    message: `${serviceConfig.name} is currently unavailable. Please try again later.`,
                    service: serviceConfig.name
                }
            });
        }
    });
};

/**
 * Create all service proxies
 */
const serviceProxies = {};

Object.keys(services).forEach(key => {
    serviceProxies[key] = createServiceProxy(services[key]);
});

module.exports = {
    serviceProxies,
    services
};