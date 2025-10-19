// services/auth-service/src/models/User.js
const bcrypt = require('bcryptjs');
const { query, getClient } = require('../config/database');

/**
 * User Model - Handles all user-related database operations
 */
class User {
    /**
     * Create a new user
     * @param {Object} userData - User registration data
     * @returns {Promise<Object>} Created user
     */
    static async create(userData) {
        const { email, password, firstName, lastName, phone } = userData;

        // Hash password
        const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 10;
        const passwordHash = await bcrypt.hash(password, saltRounds);

        const sql = `
      INSERT INTO users (email, password_hash, first_name, last_name, phone, is_active, is_verified)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, email, first_name, last_name, phone, is_active, is_verified, created_at
    `;

        const values = [
            email.toLowerCase(),
            passwordHash,
            firstName,
            lastName,
            phone || null,
            true,
            false
        ];

        const result = await query(sql, values);
        return result.rows[0];
    }

    /**
     * Find user by email
     * @param {string} email - User email
     * @returns {Promise<Object|null>} User object or null
     */
    static async findByEmail(email) {
        const sql = `
      SELECT 
        u.id, u.email, u.password_hash, u.first_name, u.last_name, 
        u.phone, u.is_active, u.is_verified, u.last_login, 
        u.created_at, u.updated_at,
        array_agg(DISTINCT r.name) FILTER (WHERE r.name IS NOT NULL) as roles,
        array_agg(DISTINCT p.resource || ':' || p.action) FILTER (WHERE p.resource IS NOT NULL) as permissions
      FROM users u
      LEFT JOIN user_roles ur ON u.id = ur.user_id
      LEFT JOIN roles r ON ur.role_id = r.id
      LEFT JOIN role_permissions rp ON r.id = rp.role_id
      LEFT JOIN permissions p ON rp.permission_id = p.id
      WHERE u.email = $1
      GROUP BY u.id
    `;

        const result = await query(sql, [email.toLowerCase()]);
        return result.rows[0] || null;
    }

    /**
     * Find user by ID
     * @param {string} userId - User UUID
     * @returns {Promise<Object|null>} User object or null
     */
    static async findById(userId) {
        const sql = `
      SELECT 
        u.id, u.email, u.first_name, u.last_name, u.phone, 
        u.is_active, u.is_verified, u.last_login, 
        u.created_at, u.updated_at,
        array_agg(DISTINCT r.name) FILTER (WHERE r.name IS NOT NULL) as roles,
        array_agg(DISTINCT p.resource || ':' || p.action) FILTER (WHERE p.resource IS NOT NULL) as permissions
      FROM users u
      LEFT JOIN user_roles ur ON u.id = ur.user_id
      LEFT JOIN roles r ON ur.role_id = r.id
      LEFT JOIN role_permissions rp ON r.id = rp.role_id
      LEFT JOIN permissions p ON rp.permission_id = p.id
      WHERE u.id = $1
      GROUP BY u.id
    `;

        const result = await query(sql, [userId]);
        return result.rows[0] || null;
    }

    /**
     * Update user's last login time
     * @param {string} userId - User UUID
     * @returns {Promise<void>}
     */
    static async updateLastLogin(userId) {
        const sql = `
      UPDATE users 
      SET last_login = CURRENT_TIMESTAMP 
      WHERE id = $1
    `;

        await query(sql, [userId]);
    }

    /**
     * Verify user's password
     * @param {string} plainPassword - Plain text password
     * @param {string} hashedPassword - Hashed password from database
     * @returns {Promise<boolean>} True if password matches
     */
    static async verifyPassword(plainPassword, hashedPassword) {
        return bcrypt.compare(plainPassword, hashedPassword);
    }

    /**
     * Check if email exists
     * @param {string} email - Email to check
     * @returns {Promise<boolean>} True if email exists
     */
    static async emailExists(email) {
        const sql = 'SELECT id FROM users WHERE email = $1';
        const result = await query(sql, [email.toLowerCase()]);
        return result.rows.length > 0;
    }

    /**
     * Update user password
     * @param {string} userId - User UUID
     * @param {string} newPassword - New plain text password
     * @returns {Promise<void>}
     */
    static async updatePassword(userId, newPassword) {
        const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 10;
        const passwordHash = await bcrypt.hash(newPassword, saltRounds);

        const sql = 'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2';
        await query(sql, [passwordHash, userId]);
    }

    /**
     * Verify user email
     * @param {string} userId - User UUID
     * @returns {Promise<void>}
     */
    static async verifyEmail(userId) {
        const sql = 'UPDATE users SET is_verified = true, updated_at = CURRENT_TIMESTAMP WHERE id = $1';
        await query(sql, [userId]);
    }

    /**
     * Deactivate user
     * @param {string} userId - User UUID
     * @returns {Promise<void>}
     */
    static async deactivate(userId) {
        const sql = 'UPDATE users SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1';
        await query(sql, [userId]);
    }

    /**
     * Activate user
     * @param {string} userId - User UUID
     * @returns {Promise<void>}
     */
    static async activate(userId) {
        const sql = 'UPDATE users SET is_active = true, updated_at = CURRENT_TIMESTAMP WHERE id = $1';
        await query(sql, [userId]);
    }

    /**
     * Get user with minimal info (for token payload)
     * @param {string} userId - User UUID
     * @returns {Promise<Object|null>}
     */
    static async getMinimalUserInfo(userId) {
        const sql = `
      SELECT 
        u.id, u.email, u.first_name, u.last_name,
        array_agg(DISTINCT r.name) FILTER (WHERE r.name IS NOT NULL) as roles
      FROM users u
      LEFT JOIN user_roles ur ON u.id = ur.user_id
      LEFT JOIN roles r ON ur.role_id = r.id
      WHERE u.id = $1 AND u.is_active = true
      GROUP BY u.id
    `;

        const result = await query(sql, [userId]);
        return result.rows[0] || null;
    }

    /**
     * Remove sensitive fields from user object
     * @param {Object} user - User object
     * @returns {Object} User without sensitive fields
     */
    static sanitize(user) {
        if (!user) return null;

        const sanitized = { ...user };
        delete sanitized.password_hash;
        return sanitized;
    }
}

module.exports = User;