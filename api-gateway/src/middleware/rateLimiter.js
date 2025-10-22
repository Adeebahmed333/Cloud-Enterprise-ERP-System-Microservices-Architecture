// api-gateway/src/middleware/rateLimiter.js
const rateLimit = require('express-rate-limit');
const { rateLimits } = require('../config/services');

/**
 * Create rate limiter with custom configuration
 */
const createRateLimiter = (config = rateLimits.default) => {
    return rateLimit({
        windowMs: config.windowMs,
        max: config.max,
        message: {
            success: false,
            error: {
                code: 'RATE_LIMIT_EXCEEDED',
                message: 'Too many requests, please try again later'
            }
        },
        standardHeaders: true,
        legacyHeaders: false,
        // Use user ID if authenticated, otherwise IP
        keyGenerator: (req) => {
            return req.user?.userId || req.ip;
        },
        handler: (req, res) => {
            console.warn(`Rate limit exceeded for ${req.user?.userId || req.ip}`);
            res.status(429).json({
                success: false,
                error: {
                    code: 'RATE_LIMIT_EXCEEDED',
                    message: `Too many requests. Please try again in ${Math.ceil(config.windowMs / 60000)} minutes.`
                }
            });
        }
    });
};

/**
 * Default rate limiter for all routes
 */
const defaultLimiter = createRateLimiter(rateLimits.default);

/**
 * Strict rate limiter for auth routes
 */
const authLimiter = createRateLimiter(rateLimits.auth);

/**
 * API rate limiter
 */
const apiLimiter = createRateLimiter(rateLimits.api);

/**
 * Apply appropriate rate limiter based on route
 */
const smartRateLimiter = (req, res, next) => {
    // Auth routes - strict limiting
    if (req.path.startsWith('/api/auth/login') || req.path.startsWith('/api/auth/register')) {
        return authLimiter(req, res, next);
    }

    // API routes - moderate limiting
    if (req.path.startsWith('/api/')) {
        return apiLimiter(req, res, next);
    }

    // Default limiting
    return defaultLimiter(req, res, next);
};

module.exports = {
    defaultLimiter,
    authLimiter,
    apiLimiter,
    smartRateLimiter
};