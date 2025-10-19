// services/auth-service/src/middleware/auth.js
const { verifyAccessToken, extractTokenFromHeader } = require('../utils/jwt');
const { redisHelpers } = require('../config/database');

/**
 * Authentication Middleware
 * Verifies JWT token and attaches user info to request
 */
const authenticate = async (req, res, next) => {
    try {
        // Extract token from Authorization header
        const authHeader = req.headers.authorization;
        const token = extractTokenFromHeader(authHeader);

        if (!token) {
            return res.status(401).json({
                success: false,
                data: null,
                error: {
                    code: 'NO_TOKEN',
                    message: 'No authentication token provided'
                },
                metadata: {
                    timestamp: new Date().toISOString()
                }
            });
        }

        // Verify token
        const decoded = verifyAccessToken(token);
        if (!decoded) {
            return res.status(401).json({
                success: false,
                data: null,
                error: {
                    code: 'INVALID_TOKEN',
                    message: 'Invalid or expired token'
                },
                metadata: {
                    timestamp: new Date().toISOString()
                }
            });
        }

        // Check if session exists in Redis (optional fast check)
        const session = await redisHelpers.get(`session:${decoded.userId}`);
        if (!session) {
            // Session might have expired in Redis, but token is still valid
            // This is okay - we'll just attach the user from token
            console.log('Session not found in Redis for user:', decoded.userId);
        }

        // Attach user info to request
        req.user = {
            userId: decoded.userId,
            email: decoded.email,
            roles: decoded.roles || [],
            permissions: decoded.permissions || []
        };

        next();
    } catch (err) {
        console.error('Authentication middleware error:', err);
        return res.status(500).json({
            success: false,
            data: null,
            error: {
                code: 'AUTH_ERROR',
                message: 'Authentication failed'
            },
            metadata: {
                timestamp: new Date().toISOString()
            }
        });
    }
};

/**
 * Optional Authentication Middleware
 * Attaches user if token is valid, but doesn't block request
 */
const optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        const token = extractTokenFromHeader(authHeader);

        if (token) {
            const decoded = verifyAccessToken(token);
            if (decoded) {
                req.user = {
                    userId: decoded.userId,
                    email: decoded.email,
                    roles: decoded.roles || [],
                    permissions: decoded.permissions || []
                };
            }
        }

        next();
    } catch (err) {
        // Silently continue without user
        next();
    }
};

/**
 * Role-based authorization middleware
 * @param {Array<string>} allowedRoles - Array of role names
 */
const authorize = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                data: null,
                error: {
                    code: 'UNAUTHORIZED',
                    message: 'Authentication required'
                },
                metadata: {
                    timestamp: new Date().toISOString()
                }
            });
        }

        const userRoles = req.user.roles || [];
        const hasRole = allowedRoles.some(role => userRoles.includes(role));

        if (!hasRole) {
            return res.status(403).json({
                success: false,
                data: null,
                error: {
                    code: 'FORBIDDEN',
                    message: 'You do not have permission to access this resource'
                },
                metadata: {
                    timestamp: new Date().toISOString()
                }
            });
        }

        next();
    };
};

/**
 * Permission-based authorization middleware
 * @param {string} permission - Permission in format "resource:action"
 */
const requirePermission = (permission) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                data: null,
                error: {
                    code: 'UNAUTHORIZED',
                    message: 'Authentication required'
                },
                metadata: {
                    timestamp: new Date().toISOString()
                }
            });
        }

        const userPermissions = req.user.permissions || [];
        const hasPermission = userPermissions.includes(permission);

        if (!hasPermission) {
            return res.status(403).json({
                success: false,
                data: null,
                error: {
                    code: 'INSUFFICIENT_PERMISSIONS',
                    message: `You need '${permission}' permission to access this resource`
                },
                metadata: {
                    timestamp: new Date().toISOString()
                }
            });
        }

        next();
    };
};

module.exports = {
    authenticate,
    optionalAuth,
    authorize,
    requirePermission
};