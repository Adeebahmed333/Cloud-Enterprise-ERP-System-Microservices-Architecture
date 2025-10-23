const { getMongoDb } = require('../config/database');

/**
 * Log user activity to MongoDB (erp_audit.user_activity_logs)
 * Matches your MongoDB schema structure
 */
const logActivity = async (userId, action, resource, resourceId, metadata = {}) => {
    try {
        const db = getMongoDb();
        if (!db) {
            console.error('MongoDB not connected');
            return;
        }

        // Match your schema structure for user_activity_logs
        const activityLog = {
            user_id: userId,
            action: action,
            resource: resource || null,
            resource_id: resourceId || null,
            timestamp: new Date(),
            details: metadata.details || {},
            metadata: {
                ip_address: metadata.ip || null,
                user_agent: metadata.userAgent || null,
                session_id: metadata.sessionId || null,
                service: 'user-service'
            }
        };

        // Insert into user_activity_logs collection (from your schema)
        await db.collection('user_activity_logs').insertOne(activityLog);

        console.log(`📝 Activity logged: ${userId} - ${action} on ${resource}`);
    } catch (error) {
        console.error('Activity logging error:', error);
        // Don't throw - logging should not break the main flow
    }
};

/**
 * Get user activity history
 */
const getActivityHistory = async (userId, options = {}) => {
    try {
        const { limit = 50, skip = 0, action = null, resource = null } = options;

        const db = getMongoDb();
        if (!db) {
            return [];
        }

        // Build query filter
        const filter = { user_id: userId };
        if (action) filter.action = action;
        if (resource) filter.resource = resource;

        const activities = await db.collection('user_activity_logs')
            .find(filter)
            .sort({ timestamp: -1 })
            .limit(limit)
            .skip(skip)
            .toArray();

        return activities;
    } catch (error) {
        console.error('Get activity history error:', error);
        return [];
    }
};

/**
 * Get activity statistics for a user
 */
const getActivityStats = async (userId, startDate, endDate) => {
    try {
        const db = getMongoDb();
        if (!db) {
            return null;
        }

        const pipeline = [
            {
                $match: {
                    user_id: userId,
                    timestamp: {
                        $gte: startDate,
                        $lte: endDate
                    }
                }
            },
            {
                $group: {
                    _id: '$action',
                    count: { $sum: 1 }
                }
            },
            {
                $sort: { count: -1 }
            }
        ];

        const stats = await db.collection('user_activity_logs')
            .aggregate(pipeline)
            .toArray();

        return stats;
    } catch (error) {
        console.error('Get activity stats error:', error);
        return null;
    }
};

/**
 * Log system event to system_logs collection
 */
const logSystemEvent = async (level, service, message, metadata = {}) => {
    try {
        const db = getMongoDb();
        if (!db) {
            console.error('MongoDB not connected');
            return;
        }

        const systemLog = {
            level: level, // 'error', 'warn', 'info', 'debug'
            service: service,
            message: message,
            timestamp: new Date(),
            error_stack: metadata.stack || null,
            metadata: metadata
        };

        await db.collection('system_logs').insertOne(systemLog);
    } catch (error) {
        console.error('System logging error:', error);
    }
};

module.exports = {
    logActivity,
    getActivityHistory,
    getActivityStats,
    logSystemEvent
};
