// services/auth-service/src/models/RefreshToken.js
const { query } = require('../config/database');

/**
 * RefreshToken Model - Manages refresh tokens in database
 */
class RefreshToken {
    /**
     * Store refresh token
     * @param {string} userId - User UUID
     * @param {string} token - Refresh token
     * @param {Date} expiresAt - Expiry date
     * @returns {Promise<Object>} Created token record
     */
    static async create(userId, token, expiresAt) {
        const sql = `
      INSERT INTO refresh_tokens (user_id, token, expires_at, revoked)
      VALUES ($1, $2, $3, $4)
      RETURNING id, user_id, token, expires_at, created_at, revoked
    `;

        const values = [userId, token, expiresAt, false];
        const result = await query(sql, values);
        return result.rows[0];
    }

    /**
     * Find refresh token
     * @param {string} token - Refresh token
     * @returns {Promise<Object|null>} Token record or null
     */
    static async findByToken(token) {
        const sql = `
      SELECT id, user_id, token, expires_at, created_at, revoked
      FROM refresh_tokens
      WHERE token = $1
    `;

        const result = await query(sql, [token]);
        return result.rows[0] || null;
    }

    /**
     * Check if token is valid
     * @param {string} token - Refresh token
     * @returns {Promise<boolean>} True if valid
     */
    static async isValid(token) {
        const sql = `
      SELECT id
      FROM refresh_tokens
      WHERE token = $1 
        AND revoked = false 
        AND expires_at > CURRENT_TIMESTAMP
    `;

        const result = await query(sql, [token]);
        return result.rows.length > 0;
    }

    /**
     * Revoke refresh token
     * @param {string} token - Refresh token
     * @returns {Promise<void>}
     */
    static async revoke(token) {
        const sql = `
      UPDATE refresh_tokens
      SET revoked = true
      WHERE token = $1
    `;

        await query(sql, [token]);
    }

    /**
     * Revoke all tokens for a user
     * @param {string} userId - User UUID
     * @returns {Promise<void>}
     */
    static async revokeAllForUser(userId) {
        const sql = `
      UPDATE refresh_tokens
      SET revoked = true
      WHERE user_id = $1 AND revoked = false
    `;

        await query(sql, [userId]);
    }

    /**
     * Delete expired tokens (cleanup)
     * @returns {Promise<number>} Number of deleted tokens
     */
    static async deleteExpired() {
        const sql = `
      DELETE FROM refresh_tokens
      WHERE expires_at < CURRENT_TIMESTAMP
    `;

        const result = await query(sql);
        return result.rowCount;
    }

    /**
     * Get all active tokens for user
     * @param {string} userId - User UUID
     * @returns {Promise<Array>} Array of token records
     */
    static async getActiveTokensForUser(userId) {
        const sql = `
      SELECT id, token, expires_at, created_at
      FROM refresh_tokens
      WHERE user_id = $1 
        AND revoked = false 
        AND expires_at > CURRENT_TIMESTAMP
      ORDER BY created_at DESC
    `;

        const result = await query(sql, [userId]);
        return result.rows;
    }
}

module.exports = RefreshToken;