const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { getActivityHistory, getActivityStats } = require('../utils/activityLogger');

/**
 * Activity Logging Routes
 * Base path: /api/users/activity
 */

/**
 * Get current user's activity history
 */
router.get('/me', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { limit = 50, skip = 0, action, resource } = req.query;

    const activities = await getActivityHistory(userId, {
      limit: parseInt(limit),
      skip: parseInt(skip),
      action,
      resource
    });

    return res.json({
      success: true,
      data: {
        activities,
        count: activities.length
      }
    });
  } catch (error) {
    console.error('Get activity history error:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch activity history'
      }
    });
  }
});

/**
 * Get activity statistics for current user
 */
router.get('/me/stats', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { startDate, endDate } = req.query;

    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Default: last 30 days
    const end = endDate ? new Date(endDate) : new Date();

    const stats = await getActivityStats(userId, start, end);

    return res.json({
      success: true,
      data: {
        stats,
        period: {
          start,
          end
        }
      }
    });
  } catch (error) {
    console.error('Get activity stats error:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch activity statistics'
      }
    });
  }
});

/**
 * Get activity history for any user (admin only)
 */
router.get('/:userId', authenticate, async (req, res) => {
  try {
    // TODO: Add admin authorization check
    const { userId } = req.params;
    const { limit = 50, skip = 0, action, resource } = req.query;

    const activities = await getActivityHistory(userId, {
      limit: parseInt(limit),
      skip: parseInt(skip),
      action,
      resource
    });

    return res.json({
      success: true,
      data: {
        activities,
        count: activities.length
      }
    });
  } catch (error) {
    console.error('Get user activity history error:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch user activity history'
      }
    });
  }
});

module.exports = router;