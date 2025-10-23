// services/user-service/src/models/roleModel.js
const { pgPool } = require('../config/database');

/**
 * Role Model
 * Works with existing roles table from global schema
 */
class RoleModel {
  /**
   * Get all roles
   */
  static async findAll() {
    const query = `
      SELECT 
        r.id,
        r.name,
        r.description,
        r.created_at,
        COALESCE(
          json_agg(
            DISTINCT jsonb_build_object(
              'id', p.id,
              'resource', p.resource,
              'action', p.action,
              'description', p.description
            )
          ) FILTER (WHERE p.id IS NOT NULL),
          '[]'
        ) as permissions,
        COUNT(DISTINCT ur.user_id) as user_count
      FROM roles r
      LEFT JOIN role_permissions rp ON r.id = rp.role_id
      LEFT JOIN permissions p ON rp.permission_id = p.id
      LEFT JOIN user_roles ur ON r.id = ur.role_id
      GROUP BY r.id
      ORDER BY r.name
    `;
    
    const result = await pgPool.query(query);
    return result.rows;
  }

  /**
   * Get role by ID
   */
  static async findById(roleId) {
    const query = `
      SELECT 
        r.id,
        r.name,
        r.description,
        r.created_at,
        COALESCE(
          json_agg(
            DISTINCT jsonb_build_object(
              'id', p.id,
              'resource', p.resource,
              'action', p.action,
              'description', p.description
            )
          ) FILTER (WHERE p.id IS NOT NULL),
          '[]'
        ) as permissions
      FROM roles r
      LEFT JOIN role_permissions rp ON r.id = rp.role_id
      LEFT JOIN permissions p ON rp.permission_id = p.id
      WHERE r.id = $1
      GROUP BY r.id
    `;
    
    const result = await pgPool.query(query, [roleId]);
    return result.rows[0] || null;
  }

  /**
   * Get role by name
   */
  static async findByName(name) {
    const query = `SELECT * FROM roles WHERE name = $1`;
    const result = await pgPool.query(query, [name]);
    return result.rows[0] || null;
  }

  /**
   * Create new role
   */
  static async create(roleData) {
    const { name, description } = roleData;
    
    const query = `
      INSERT INTO roles (name, description)
      VALUES ($1, $2)
      RETURNING *
    `;
    
    const result = await pgPool.query(query, [name, description]);
    return result.rows[0];
  }

  /**
   * Update role
   */
  static async update(roleId, updates) {
    const { name, description } = updates;
    
    const query = `
      UPDATE roles
      SET name = COALESCE($2, name),
          description = COALESCE($3, description)
      WHERE id = $1
      RETURNING *
    `;
    
    const result = await pgPool.query(query, [roleId, name, description]);
    return result.rows[0];
  }

  /**
   * Delete role
   */
  static async delete(roleId) {
    const query = `DELETE FROM roles WHERE id = $1 RETURNING *`;
    const result = await pgPool.query(query, [roleId]);
    return result.rows[0];
  }

  /**
   * Assign permission to role
   */
  static async assignPermission(roleId, permissionId) {
    const query = `
      INSERT INTO role_permissions (role_id, permission_id)
      VALUES ($1, $2)
      ON CONFLICT DO NOTHING
      RETURNING *
    `;
    
    const result = await pgPool.query(query, [roleId, permissionId]);
    return result.rows[0];
  }

  /**
   * Remove permission from role
   */
  static async removePermission(roleId, permissionId) {
    const query = `
      DELETE FROM role_permissions
      WHERE role_id = $1 AND permission_id = $2
      RETURNING *
    `;
    
    const result = await pgPool.query(query, [roleId, permissionId]);
    return result.rows[0];
  }

  /**
   * Get all permissions
   */
  static async getAllPermissions() {
    const query = `
      SELECT id, resource, action, description
      FROM permissions
      ORDER BY resource, action
    `;
    
    const result = await pgPool.query(query);
    return result.rows;
  }
}

module.exports = RoleModel;