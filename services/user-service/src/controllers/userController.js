const UserModel = require('../models/userModel');
const { redisHelpers } = require('../config/database');
const { logActivity } = require('../utils/activityLogger');

class UserController {
  /**
   * Get current user profile
   */
  static async getProfile(req, res) {
    try {
      const userId = req.user.userId;
      
      // Try cache first
      const cacheKey = `user:${userId}`;
      let user = await redisHelpers.get(cacheKey);
      
      if (!user) {
        user = await UserModel.findById(userId);
        if (!user) {
          return res.status(404).json({
            success: false,
            error: {
              code: 'USER_NOT_FOUND',
              message: 'User not found'
            }
          });
        }
        
        // Cache for 1 hour
        await redisHelpers.set(cacheKey, user, 3600);
      }
      
      // Remove sensitive data
      delete user.password_hash;
      
      return res.json({
        success: true,
        data: { user }
      });
    } catch (error) {
      console.error('Get profile error:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch user profile'
        }
      });
    }
  }

  /**
   * Get user by ID (admin only)
   */
  static async getUserById(req, res) {
    try {
      const { id } = req.params;
      
      const cacheKey = `user:${id}`;
      let user = await redisHelpers.get(cacheKey);
      
      if (!user) {
        user = await UserModel.findById(id);
        if (!user) {
          return res.status(404).json({
            success: false,
            error: {
              code: 'USER_NOT_FOUND',
              message: 'User not found'
            }
          });
        }
        
        await redisHelpers.set(cacheKey, user, 3600);
      }
      
      delete user.password_hash;
      
      return res.json({
        success: true,
        data: { user }
      });
    } catch (error) {
      console.error('Get user error:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch user'
        }
      });
    }
  }

  /**
   * Get all users with pagination
   */
  static async getAllUsers(req, res) {
    try {
      const {
        page = 1,
        limit = 20,
        search = '',
        status = null,
        role = null,
        sortBy = 'created_at',
        sortOrder = 'DESC'
      } = req.query;

      const result = await UserModel.findAll({
        page: parseInt(page),
        limit: Math.min(parseInt(limit), 100),
        search,
        status: status === 'true' ? true : status === 'false' ? false : null,
        role,
        sortBy,
        sortOrder
      });

      return res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Get users error:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch users'
        }
      });
    }
  }

  /**
   * Update user profile
   */
  static async updateProfile(req, res) {
    try {
      const userId = req.user.userId;
      const updates = req.body;

      const updatedUser = await UserModel.update(userId, updates);
      
      if (!updatedUser) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found'
          }
        });
      }

      // Invalidate cache
      await redisHelpers.del(`user:${userId}`);
      
      // Log activity
      await logActivity(userId, 'UPDATE_PROFILE', 'user', userId, updates);

      return res.json({
        success: true,
        data: { user: updatedUser },
        message: 'Profile updated successfully'
      });
    } catch (error) {
      console.error('Update profile error:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update profile'
        }
      });
    }
  }

  /**
   * Update user (admin only)
   */
  static async updateUser(req, res) {
    try {
      const { id } = req.params;
      const updates = req.body;

      const updatedUser = await UserModel.update(id, updates);
      
      if (!updatedUser) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found'
          }
        });
      }

      // Invalidate cache
      await redisHelpers.del(`user:${id}`);
      
      // Log activity
      await logActivity(req.user.userId, 'UPDATE_USER', 'user', id, updates);

      return res.json({
        success: true,
        data: { user: updatedUser },
        message: 'User updated successfully'
      });
    } catch (error) {
      console.error('Update user error:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update user'
        }
      });
    }
  }

  /**
   * Delete user (admin only)
   */
  static async deleteUser(req, res) {
    try {
      const { id } = req.params;

      const deleted = await UserModel.delete(id);
      
      if (!deleted) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found'
          }
        });
      }

      // Invalidate cache
      await redisHelpers.del(`user:${id}`);
      
      // Log activity
      await logActivity(req.user.userId, 'DELETE_USER', 'user', id);

      return res.json({
        success: true,
        message: 'User deleted successfully'
      });
    } catch (error) {
      console.error('Delete user error:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to delete user'
        }
      });
    }
  }

  /**
   * Assign role to user
   */
  static async assignRole(req, res) {
    try {
      const { id } = req.params;
      const { roleId } = req.body;

      const assigned = await UserModel.assignRole(id, roleId, req.user.userId);
      
      if (!assigned) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'ROLE_ASSIGNMENT_FAILED',
            message: 'Failed to assign role'
          }
        });
      }

      // Invalidate user cache
      await redisHelpers.del(`user:${id}`);
      
      // Log activity
      await logActivity(req.user.userId, 'ASSIGN_ROLE', 'user', id, { roleId });

      return res.json({
        success: true,
        message: 'Role assigned successfully',
        data: assigned
      });
    } catch (error) {
      console.error('Assign role error:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to assign role'
        }
      });
    }
  }

  /**
   * Remove role from user
   */
  static async removeRole(req, res) {
    try {
      const { id, roleId } = req.params;

      const removed = await UserModel.removeRole(id, roleId);
      
      if (!removed) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'ROLE_NOT_FOUND',
            message: 'Role assignment not found'
          }
        });
      }

      // Invalidate user cache
      await redisHelpers.del(`user:${id}`);
      
      // Log activity
      await logActivity(req.user.userId, 'REMOVE_ROLE', 'user', id, { roleId });

      return res.json({
        success: true,
        message: 'Role removed successfully'
      });
    } catch (error) {
      console.error('Remove role error:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to remove role'
        }
      });
    }
  }

  /**
   * Get user roles
   */
  static async getUserRoles(req, res) {
    try {
      const { id } = req.params;

      const roles = await UserModel.getRoles(id);

      return res.json({
        success: true,
        data: { roles }
      });
    } catch (error) {
      console.error('Get user roles error:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch user roles'
        }
      });
    }
  }

  /**
   * Get user permissions
   */
  static async getUserPermissions(req, res) {
    try {
      const { id } = req.params;

      const permissions = await UserModel.getPermissions(id);

      return res.json({
        success: true,
        data: { permissions }
      });
    } catch (error) {
      console.error('Get user permissions error:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch user permissions'
        }
      });
    }
  }
}

module.exports = UserController;