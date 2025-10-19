// services/auth-service/src/utils/jwt.js
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

/**
 * JWT Configuration
 */
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production-min-32-chars';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-super-secret-refresh-key-change-this-in-production-min-32-chars';
const JWT_ACCESS_EXPIRY = process.env.JWT_ACCESS_EXPIRY || '15m';
const JWT_REFRESH_EXPIRY = process.env.JWT_REFRESH_EXPIRY || '7d';

/**
 * Generate Access Token (Short-lived)
 * @param {Object} payload - User data to encode
 * @returns {string} JWT access token
 */
const generateAccessToken = (payload) => {
    const tokenPayload = {
        userId: payload.userId,
        email: payload.email,
        roles: payload.roles || [],
        permissions: payload.permissions || [],
        type: 'access'
    };

    return jwt.sign(tokenPayload, JWT_SECRET, {
        expiresIn: JWT_ACCESS_EXPIRY,
        issuer: 'erp-auth-service',
        audience: 'erp-services'
    });
};

/**
 * Generate Refresh Token (Long-lived)
 * @param {Object} payload - User data to encode
 * @returns {string} JWT refresh token
 */
const generateRefreshToken = (payload) => {
    const tokenPayload = {
        userId: payload.userId,
        email: payload.email,
        type: 'refresh',
        tokenId: crypto.randomBytes(16).toString('hex') // Unique token ID
    };

    return jwt.sign(tokenPayload, JWT_REFRESH_SECRET, {
        expiresIn: JWT_REFRESH_EXPIRY,
        issuer: 'erp-auth-service',
        audience: 'erp-services'
    });
};

/**
 * Generate both access and refresh tokens
 * @param {Object} user - User object
 * @returns {Object} { accessToken, refreshToken }
 */
const generateTokenPair = (user) => {
    const payload = {
        userId: user.id,
        email: user.email,
        roles: user.roles || [],
        permissions: user.permissions || []
    };

    return {
        accessToken: generateAccessToken(payload),
        refreshToken: generateRefreshToken(payload)
    };
};

/**
 * Verify Access Token
 * @param {string} token - JWT access token
 * @returns {Object|null} Decoded payload or null
 */
const verifyAccessToken = (token) => {
    try {
        const decoded = jwt.verify(token, JWT_SECRET, {
            issuer: 'erp-auth-service',
            audience: 'erp-services'
        });

        // Verify it's an access token
        if (decoded.type !== 'access') {
            throw new Error('Invalid token type');
        }

        return decoded;
    } catch (err) {
        console.error('Access token verification failed:', err.message);
        return null;
    }
};

/**
 * Verify Refresh Token
 * @param {string} token - JWT refresh token
 * @returns {Object|null} Decoded payload or null
 */
const verifyRefreshToken = (token) => {
    try {
        const decoded = jwt.verify(token, JWT_REFRESH_SECRET, {
            issuer: 'erp-auth-service',
            audience: 'erp-services'
        });

        // Verify it's a refresh token
        if (decoded.type !== 'refresh') {
            throw new Error('Invalid token type');
        }

        return decoded;
    } catch (err) {
        console.error('Refresh token verification failed:', err.message);
        return null;
    }
};

/**
 * Decode token without verification (for debugging)
 * @param {string} token - JWT token
 * @returns {Object|null} Decoded payload or null
 */
const decodeToken = (token) => {
    try {
        return jwt.decode(token, { complete: true });
    } catch (err) {
        console.error('Token decode failed:', err.message);
        return null;
    }
};

/**
 * Get token expiry time
 * @param {string} token - JWT token
 * @returns {Date|null} Expiry date or null
 */
const getTokenExpiry = (token) => {
    try {
        const decoded = jwt.decode(token);
        if (decoded && decoded.exp) {
            return new Date(decoded.exp * 1000);
        }
        return null;
    } catch (err) {
        console.error('Get token expiry failed:', err.message);
        return null;
    }
};

/**
 * Check if token is expired
 * @param {string} token - JWT token
 * @returns {boolean}
 */
const isTokenExpired = (token) => {
    const expiry = getTokenExpiry(token);
    if (!expiry) return true;
    return expiry < new Date();
};

/**
 * Extract token from Authorization header
 * @param {string} authHeader - Authorization header value
 * @returns {string|null} Token or null
 */
const extractTokenFromHeader = (authHeader) => {
    if (!authHeader) return null;

    // Check for "Bearer <token>" format
    const parts = authHeader.split(' ');
    if (parts.length === 2 && parts[0] === 'Bearer') {
        return parts[1];
    }

    return null;
};

/**
 * Generate random token (for password reset, etc.)
 * @param {number} length - Token length
 * @returns {string} Random token
 */
const generateRandomToken = (length = 32) => {
    return crypto.randomBytes(length).toString('hex');
};

/**
 * Hash token (for storing reset tokens, etc.)
 * @param {string} token - Token to hash
 * @returns {string} Hashed token
 */
const hashToken = (token) => {
    return crypto.createHash('sha256').update(token).digest('hex');
};

module.exports = {
    generateAccessToken,
    generateRefreshToken,
    generateTokenPair,
    verifyAccessToken,
    verifyRefreshToken,
    decodeToken,
    getTokenExpiry,
    isTokenExpired,
    extractTokenFromHeader,
    generateRandomToken,
    hashToken
};