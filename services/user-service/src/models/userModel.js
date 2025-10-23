// services/user-service/src/models/userModel.js
const { pgPool } = require('../config/database');

/**
 * User Model
 * Works with existing users table from global schema
 */
class UserModel {
  /**
   * Get user by ID
   */
  static async findById(userId) {
    const query = `
      SELECT 
        u.id,
        u.email,
        u.first_name,
        u.last_name,
        u.phone,
        u.is_active,
        u.is_verified,
        u.last_login,
        u.created_at,
        u.updated_at,
        COALESCE(
          json_agg(
            DISTINCT jsonb_build_object(
              'id', r.id,
              'name', r.name,
              'description', r.description
            )
          ) FILTER (WHERE r.id IS NOT NULL),
          '[]'
        ) as roles,
        COALESCE(
          json_agg(
            DISTINCT jsonb_build_object(
              'id', p.id,
              'resource', p.resource,
              'action', p.action
            )
          ) FILTER (WHERE p.id IS NOT NULL),
          '[]'
        ) as permissions
      FROM users u
      LEFT JOIN user_roles ur ON u.id = ur.user_id
      LEFT JOIN roles r ON ur.role_id = r.id
      LEFT JOIN role_permissions rp ON r.id = rp.role_id
      LEFT JOIN permissions p ON rp.permission_id = p.id
      WHERE u.id = $1
      GROUP BY u.id
    `;
    
    const result = await pgPool.query(query, [userId]);
    return result.rows[0] || null;
  }

  /**
   * Get user by email
   */
  static async findByEmail(email) {
    const query = `
      SELECT 
        u.id,
        u.email,
        u.password_hash,
        u.first_name,
        u.last_name,
        u.phone,
        u.is_active,
        u.is_verified,
        u.last_login,
        u.created_at,
        u.updated_at
      FROM users u
      WHERE u.email = $1
    `;
    
    const result = await pgPool.query(query, [email]);
    return result.rows[0] || null;
  }

  /**
   * Get all users with pagination and filters
   */
  static async findAll(options = {}) {
    const {
      page = 1,
      limit = 20,
      search = '',
      status = null,
      role = null,
      sortBy = 'created_at',
      sortOrder = 'DESC'
    } = options;

    const offset = (page - 1) * limit;
    const params = [];
    let paramIndex = 1;
    
    let whereConditions = [];
    
    // Search filter
    if (search) {
      params.push(`%${search}%`);
      whereConditions.push(`(
        u.email ILIKE $${paramIndex} OR 
        u.first_name ILIKE $${paramIndex} OR 
        u.last_name ILIKE $${paramIndex}
      )`);
      paramIndex++;
    }
    
    // Status filter
    if (status !== null) {
      params.push(status);
      whereConditions.push(`u.is_active = $${paramIndex}`);
      paramIndex++;
    }
    
    // Role filter
    if (role) {
      params.push(role);
      whereConditions.push(`r.name = $${paramIndex}`);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 
      ? `WHERE ${whereConditions.join(' AND ')}`
      : '';

    // Count query
    const countQuery = `
      SELECT COUNT(DISTINCT u.id)
      FROM users u
      LEFT JOIN user_roles ur ON u.id = ur.user_id
      LEFT JOIN roles r ON ur.role_id = r.id
      ${whereClause}
    `;
    
    const countResult = await pgPool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count);

    // Data query
    params.push(limit, offset);
    const dataQuery = `
      SELECT 
        u.id,
        u.email,
        u.first_name,
        u.last_name,
        u.phone,
        u.is_active,
        u.is_verified,
        u.last_login,
        u.created_at,
        COALESCE(
          json_agg(
            DISTINCT jsonb_build_object(
              'id', r.id,
              'name', r.name
            )
          ) FILTER (WHERE r.id IS NOT NULL),
          '[]'
        ) as roles
      FROM users u
      LEFT JOIN user_roles ur ON u.id = ur.user_id
      LEFT JOIN roles r ON ur.role_id = r.id
      ${whereClause}
      GROUP BY u.id
      ORDER BY u.${sortBy} ${sortOrder}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    
    const dataResult = await pgPool.query(dataQuery, params);

    return {
      users: dataResult.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Update user
   */
  static async update(userId, updates) {
    const allowedFields = ['first_name', 'last_name', 'phone', 'is_active', 'is_verified'];
    const fields = Object.keys(updates).filter(key => allowedFields.includes(key));
    
    if (fields.length === 0) {
      throw new Error('No valid fields to update');
    }

    const setClauses = fields.map((field, index) => `${field} = $${index + 2}`).join(', ');
    const values = [userId, ...fields.map(field => updates[field])];

    const query = `
      UPDATE users
      SET ${setClauses}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING id, email, first_name, last_name, phone, is_active, is_verified, updated_at
    `;

    const result = await pgPool.query(query, values);
    return result.rows[0];
  }

  /**
   * Delete user (soft delete by setting is_active = false)
   */
  static async delete(userId) {
    const query = `
      UPDATE users
      SET is_active = false, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING id
    `;
    
    const result = await pgPool.query(query, [userId]);
    return result.rows[0];
  }

  /**
   * Assign role to user
   */
  static async assignRole(userId, roleId, assignedBy = null) {
    const query = `
      INSERT INTO user_roles (user_id, role_id, assigned_by)
      VALUES ($1, $2, $3)
      ON CONFLICT (user_id, role_id) DO NOTHING
      RETURNING *
    `;
    
    const result = await pgPool.query(query, [userId, roleId, assignedBy]);
    return result.rows[0];
  }

  /**
   * Remove role from user
   */
  static async removeRole(userId, roleId) {
    const query = `
      DELETE FROM user_roles
      WHERE user_id = $1 AND role_id = $2
      RETURNING *
    `;
    
    const result = await pgPool.query(query, [userId, roleId]);
    return result.rows[0];
  }

  /**
   * Get user's roles
   */
  static async getRoles(userId) {
    const query = `
      SELECT r.id, r.name, r.description, ur.assigned_at
      FROM roles r
      JOIN user_roles ur ON r.id = ur.role_id
      WHERE ur.user_id = $1
    `;
    
    const result = await pgPool.query(query, [userId]);
    return result.rows;
  }

  /**
   * Get user's permissions (combined from roles)
   */
  static async getPermissions(userId) {
    const query = `
      SELECT DISTINCT p.id, p.resource, p.action, p.description
      FROM permissions p
      JOIN role_permissions rp ON p.id = rp.permission_id
      JOIN user_roles ur ON rp.role_id = ur.role_id
      WHERE ur.user_id = $1
    `;
    
    const result = await pgPool.query(query, [userId]);
    return result.rows;
  }

  /**
   * Update last login timestamp
   */
  static async updateLastLogin(userId) {
    const query = `
      UPDATE users
      SET last_login = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING last_login
    `;
    
    const result = await pgPool.query(query, [userId]);
    return result.rows[0];
  }
}

module.exports = UserModel;