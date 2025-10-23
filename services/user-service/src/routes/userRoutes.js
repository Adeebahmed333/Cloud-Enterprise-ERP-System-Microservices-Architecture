
const express = require('express');
const router = express.Router();
const UserController = require('../controllers/userController');
const { authenticate } = require('../middleware/auth');
const { validateUpdateUser, validateAssignRole } = require('../middleware/validation');

/**
 * User Routes
 * Base path: /api/users
 */

// Public routes (will be authenticated by API Gateway)
router.get('/profile', authenticate, UserController.getProfile);
router.put('/profile', authenticate, validateUpdateUser, UserController.updateProfile);

// Admin routes - require admin role
router.get('/', authenticate, UserController.getAllUsers);
router.get('/:id', authenticate, UserController.getUserById);
router.put('/:id', authenticate, validateUpdateUser, UserController.updateUser);
router.delete('/:id', authenticate, UserController.deleteUser);

// Role management
router.post('/:id/roles', authenticate, validateAssignRole, UserController.assignRole);
router.delete('/:id/roles/:roleId', authenticate, UserController.removeRole);
router.get('/:id/roles', authenticate, UserController.getUserRoles);
router.get('/:id/permissions', authenticate, UserController.getUserPermissions);

module.exports = router;