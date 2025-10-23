const jwt = require('jsonwebtoken');
const path = require('path');

// Load environment variables from root .env
require('dotenv').config({ path: path.resolve(__dirname, '../../../../.env') });

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
    throw new Error('JWT_SECRET not found in environment variables');
}

/**
 * Authentication Middleware
 * Extracts user from JWT or API Gateway headers
 */
const authenticate = (req, res, next) => {
    try {
        // Check for user info from API Gateway headers (X-User-Id, X-User-Email, X-User-Roles)
        const userId = req.headers['x-user-id'];
        const userEmail = req.headers['x-user-email'];
        const userRoles = req.headers['x-user-roles'];

        if (userId && userEmail) {
            // User authenticated by API Gateway
            req.user = {
                userId,
                email: userEmail,
                roles: userRoles ? JSON.parse(userRoles) : []
            };
            return next();
        }

        // Fallback: Check Authorization header
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                error: {
                    code: 'UNAUTHORIZED',
                    message: 'Authentication required'
                }
            });
        }

        const token = authHeader.substring(7);
        const decoded = jwt.verify(token, JWT_SECRET);

        req.user = {
            userId: decoded.userId,
            email: decoded.email,
            roles: decoded.roles || []
        };

        next();
    } catch (error) {
        return res.status(401).json({
            success: false,
            error: {
                code: 'INVALID_TOKEN',
                message: 'Invalid or expired token'
            }
        });
    }
};

/**
 * Authorization middleware - check roles
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

        next();
    };
};

module.exports = {
    authenticate,
    authorize
};