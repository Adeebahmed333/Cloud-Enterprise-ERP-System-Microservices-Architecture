// services/auth-service/src/controllers/authController.js
const User = require('../models/User');
const RefreshToken = require('../models/RefreshToken');
const { generateTokenPair, verifyRefreshToken, getTokenExpiry } = require('../utils/jwt');
const { redisHelpers } = require('../config/database');

/**
 * Authentication Controller
 */
class AuthController {
    /**
     * Register a new user
     * POST /api/auth/register
     */
    static async register(req, res) {
        try {
            const { email, password, firstName, lastName, phone } = req.body;

            // Check if email already exists
            const emailExists = await User.emailExists(email);
            if (emailExists) {
                return res.status(409).json({
                    success: false,
                    data: null,
                    error: {
                        code: 'EMAIL_EXISTS',
                        message: 'An account with this email already exists'
                    },
                    metadata: {
                        timestamp: new Date().toISOString()
                    }
                });
            }

            // Create user
            const user = await User.create({
                email,
                password,
                firstName,
                lastName,
                phone
            });

            // Generate tokens
            const tokens = generateTokenPair(user);

            // Store refresh token in database
            const refreshTokenExpiry = getTokenExpiry(tokens.refreshToken);
            await RefreshToken.create(user.id, tokens.refreshToken, refreshTokenExpiry);

            // Cache user session in Redis
            await redisHelpers.set(
                `session:${user.id}`,
                { userId: user.id, email: user.email },
                24 * 60 * 60 // 24 hours
            );

            // Remove sensitive data
            const sanitizedUser = User.sanitize(user);

            res.status(201).json({
                success: true,
                data: {
                    user: sanitizedUser,
                    tokens: {
                        accessToken: tokens.accessToken,
                        refreshToken: tokens.refreshToken,
                        expiresIn: process.env.JWT_ACCESS_EXPIRY || '15m'
                    }
                },
                metadata: {
                    timestamp: new Date().toISOString()
                },
                error: null
            });
        } catch (err) {
            console.error('Registration error:', err);
            res.status(500).json({
                success: false,
                data: null,
                error: {
                    code: 'REGISTRATION_FAILED',
                    message: 'Failed to register user. Please try again.'
                },
                metadata: {
                    timestamp: new Date().toISOString()
                }
            });
        }
    }

    /**
     * Login user
     * POST /api/auth/login
     */
    static async login(req, res) {
        try {
            const { email, password } = req.body;

            // Find user by email
            const user = await User.findByEmail(email);
            if (!user) {
                return res.status(401).json({
                    success: false,
                    data: null,
                    error: {
                        code: 'INVALID_CREDENTIALS',
                        message: 'Invalid email or password'
                    },
                    metadata: {
                        timestamp: new Date().toISOString()
                    }
                });
            }

            // Check if user is active
            if (!user.is_active) {
                return res.status(403).json({
                    success: false,
                    data: null,
                    error: {
                        code: 'ACCOUNT_DISABLED',
                        message: 'Your account has been disabled. Please contact support.'
                    },
                    metadata: {
                        timestamp: new Date().toISOString()
                    }
                });
            }

            // Verify password
            const isPasswordValid = await User.verifyPassword(password, user.password_hash);
            if (!isPasswordValid) {
                return res.status(401).json({
                    success: false,
                    data: null,
                    error: {
                        code: 'INVALID_CREDENTIALS',
                        message: 'Invalid email or password'
                    },
                    metadata: {
                        timestamp: new Date().toISOString()
                    }
                });
            }

            // Update last login
            await User.updateLastLogin(user.id);

            // Generate tokens
            const tokens = generateTokenPair(user);

            // Store refresh token in database
            const refreshTokenExpiry = getTokenExpiry(tokens.refreshToken);
            await RefreshToken.create(user.id, tokens.refreshToken, refreshTokenExpiry);

            // Cache user session in Redis
            await redisHelpers.set(
                `session:${user.id}`,
                {
                    userId: user.id,
                    email: user.email,
                    roles: user.roles,
                    permissions: user.permissions
                },
                24 * 60 * 60 // 24 hours
            );

            // Remove sensitive data
            const sanitizedUser = User.sanitize(user);

            res.status(200).json({
                success: true,
                data: {
                    user: sanitizedUser,
                    tokens: {
                        accessToken: tokens.accessToken,
                        refreshToken: tokens.refreshToken,
                        expiresIn: process.env.JWT_ACCESS_EXPIRY || '15m'
                    }
                },
                metadata: {
                    timestamp: new Date().toISOString()
                },
                error: null
            });
        } catch (err) {
            console.error('Login error:', err);
            res.status(500).json({
                success: false,
                data: null,
                error: {
                    code: 'LOGIN_FAILED',
                    message: 'Login failed. Please try again.'
                },
                metadata: {
                    timestamp: new Date().toISOString()
                }
            });
        }
    }

    /**
     * Refresh access token
     * POST /api/auth/refresh
     */
    static async refresh(req, res) {
        try {
            const { refreshToken } = req.body;

            // Verify refresh token
            const decoded = verifyRefreshToken(refreshToken);
            if (!decoded) {
                return res.status(401).json({
                    success: false,
                    data: null,
                    error: {
                        code: 'INVALID_TOKEN',
                        message: 'Invalid or expired refresh token'
                    },
                    metadata: {
                        timestamp: new Date().toISOString()
                    }
                });
            }

            // Check if token exists and is valid in database
            const isValid = await RefreshToken.isValid(refreshToken);
            if (!isValid) {
                return res.status(401).json({
                    success: false,
                    data: null,
                    error: {
                        code: 'TOKEN_REVOKED',
                        message: 'Refresh token has been revoked'
                    },
                    metadata: {
                        timestamp: new Date().toISOString()
                    }
                });
            }

            // Get user info
            const user = await User.findById(decoded.userId);
            if (!user || !user.is_active) {
                return res.status(401).json({
                    success: false,
                    data: null,
                    error: {
                        code: 'UNAUTHORIZED',
                        message: 'User not found or inactive'
                    },
                    metadata: {
                        timestamp: new Date().toISOString()
                    }
                });
            }

            // Generate new token pair
            const tokens = generateTokenPair(user);

            // Revoke old refresh token
            await RefreshToken.revoke(refreshToken);

            // Store new refresh token
            const refreshTokenExpiry = getTokenExpiry(tokens.refreshToken);
            await RefreshToken.create(user.id, tokens.refreshToken, refreshTokenExpiry);

            res.status(200).json({
                success: true,
                data: {
                    tokens: {
                        accessToken: tokens.accessToken,
                        refreshToken: tokens.refreshToken,
                        expiresIn: process.env.JWT_ACCESS_EXPIRY || '15m'
                    }
                },
                metadata: {
                    timestamp: new Date().toISOString()
                },
                error: null
            });
        } catch (err) {
            console.error('Token refresh error:', err);
            res.status(500).json({
                success: false,
                data: null,
                error: {
                    code: 'REFRESH_FAILED',
                    message: 'Failed to refresh token. Please login again.'
                },
                metadata: {
                    timestamp: new Date().toISOString()
                }
            });
        }
    }

    /**
     * Logout user
     * POST /api/auth/logout
     */
    static async logout(req, res) {
        try {
            const { refreshToken } = req.body;
            const userId = req.user?.userId; // From auth middleware

            // Revoke refresh token if provided
            if (refreshToken) {
                await RefreshToken.revoke(refreshToken);
            }

            // Clear Redis session
            if (userId) {
                await redisHelpers.del(`session:${userId}`);
            }

            res.status(200).json({
                success: true,
                data: {
                    message: 'Logged out successfully'
                },
                metadata: {
                    timestamp: new Date().toISOString()
                },
                error: null
            });
        } catch (err) {
            console.error('Logout error:', err);
            res.status(500).json({
                success: false,
                data: null,
                error: {
                    code: 'LOGOUT_FAILED',
                    message: 'Logout failed. Please try again.'
                },
                metadata: {
                    timestamp: new Date().toISOString()
                }
            });
        }
    }

    /**
     * Verify token (check if user is authenticated)
     * GET /api/auth/verify
     */
    static async verify(req, res) {
        try {
            // User info is already attached by auth middleware
            const user = await User.findById(req.user.userId);

            if (!user || !user.is_active) {
                return res.status(401).json({
                    success: false,
                    data: null,
                    error: {
                        code: 'UNAUTHORIZED',
                        message: 'Invalid or expired token'
                    },
                    metadata: {
                        timestamp: new Date().toISOString()
                    }
                });
            }

            const sanitizedUser = User.sanitize(user);

            res.status(200).json({
                success: true,
                data: {
                    user: sanitizedUser,
                    authenticated: true
                },
                metadata: {
                    timestamp: new Date().toISOString()
                },
                error: null
            });
        } catch (err) {
            console.error('Token verification error:', err);
            res.status(500).json({
                success: false,
                data: null,
                error: {
                    code: 'VERIFICATION_FAILED',
                    message: 'Token verification failed'
                },
                metadata: {
                    timestamp: new Date().toISOString()
                }
            });
        }
    }

    /**
     * Get current user profile
     * GET /api/auth/me
     */
    static async getCurrentUser(req, res) {
        try {
            const user = await User.findById(req.user.userId);

            if (!user) {
                return res.status(404).json({
                    success: false,
                    data: null,
                    error: {
                        code: 'USER_NOT_FOUND',
                        message: 'User not found'
                    },
                    metadata: {
                        timestamp: new Date().toISOString()
                    }
                });
            }

            const sanitizedUser = User.sanitize(user);

            res.status(200).json({
                success: true,
                data: {
                    user: sanitizedUser
                },
                metadata: {
                    timestamp: new Date().toISOString()
                },
                error: null
            });
        } catch (err) {
            console.error('Get current user error:', err);
            res.status(500).json({
                success: false,
                data: null,
                error: {
                    code: 'FETCH_FAILED',
                    message: 'Failed to fetch user data'
                },
                metadata: {
                    timestamp: new Date().toISOString()
                }
            });
        }
    }
}

module.exports = AuthController;