// api-gateway/src/middleware/auth.js
const jwt = require('jsonwebtoken');
const { publicRoutes } = require('../config/services');

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production-min-32-chars';

/**
 * Authentication Middleware
 * Verifies JWT tokens for protected routes
 */
const authenticate = (req, res, next) => {
    // Check if route is public
    const isPublicRoute = publicRoutes.some(route => {
        if (route.includes('*')) {
            const pattern = route.replace('*', '');
            return req.path.startsWith(pattern);
        }
        return req.path === route || req.path.startsWith(route);
    });

    if (isPublicRoute) {
        return next();  // ✅ This next() is correct
    }

    // Extract token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).json({
            success: false,
            error: {
                code: 'NO_TOKEN',
                message: 'No authentication token provided'
            }
        });
    }

    // Check Bearer format
    if (!authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
            success: false,
            error: {
                code: 'INVALID_TOKEN_FORMAT',
                message: 'Token must be in Bearer format'
            }
        });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    try {
        // Verify JWT token
        const decoded = jwt.verify(token, JWT_SECRET);

        // Attach user info to request
        req.user = {
            userId: decoded.userId,
            email: decoded.email,
            roles: decoded.roles || []
        };

        next();  // ⚠️ THIS IS THE MISSING next() CALL!

    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                error: {
                    code: 'TOKEN_EXPIRED',
                    message: 'Token has expired'
                }
            });
        }

        return res.status(401).json({
            success: false,
            error: {
                code: 'INVALID_TOKEN',
                message: 'Invalid token'
            }
        });
    }
};

/**
 * Optional Authentication
 * Attaches user if valid token exists, but doesn't block
 */
const optionalAuth = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return next();  // ✅ Continue without user
    }

    const token = authHeader.substring(7);

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = {
            userId: decoded.userId,
            email: decoded.email,
            roles: decoded.roles || []
        };
    } catch (err) {
        // Silently continue without user
    }

    next();  // ✅ Always continue
};

/**
 * Role-based Authorization
 */
const authorize = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: {
                    code: 'UNAUTHORIZED',
                    message: 'Authentication required'
                }
            });
        }

        const userRoles = req.user.roles || [];
        const hasRole = allowedRoles.some(role => userRoles.includes(role));

        if (!hasRole) {
            return res.status(403).json({
                success: false,
                error: {
                    code: 'FORBIDDEN',
                    message: 'Insufficient permissions'
                }
            });
        }

        next();  // ✅ User authorized
    };
};

module.exports = {
    authenticate,
    optionalAuth,
    authorize
};