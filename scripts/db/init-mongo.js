// MongoDB Initialization Script for Enterprise ERP System
// This script creates collections, indexes, and initial data

// Switch to ERP audit database
db = db.getSiblingDB('erp_audit');

// ============================================================================
// CREATE COLLECTIONS
// ============================================================================

// Order History Collection (Complete audit trail for orders)
db.createCollection('order_history', {
    validator: {
        $jsonSchema: {
            bsonType: 'object',
            required: ['order_id', 'event_type', 'timestamp', 'user_id'],
            properties: {
                order_id: {
                    bsonType: 'string',
                    description: 'UUID of the order'
                },
                event_type: {
                    bsonType: 'string',
                    enum: ['created', 'updated', 'status_changed', 'payment_updated', 'shipped', 'delivered', 'cancelled'],
                    description: 'Type of event that occurred'
                },
                timestamp: {
                    bsonType: 'date',
                    description: 'When the event occurred'
                },
                user_id: {
                    bsonType: 'string',
                    description: 'UUID of user who triggered the event'
                },
                changes: {
                    bsonType: 'object',
                    properties: {
                        before: {
                            bsonType: 'object'
                        },
                        after: {
                            bsonType: 'object'
                        }
                    }
                },
                metadata: {
                    bsonType: 'object',
                    properties: {
                        ip_address: { bsonType: 'string' },
                        user_agent: { bsonType: 'string' },
                        session_id: { bsonType: 'string' }
                    }
                }
            }
        }
    }
});

// User Activity Logs
db.createCollection('user_activity_logs', {
    validator: {
        $jsonSchema: {
            bsonType: 'object',
            required: ['user_id', 'action', 'timestamp'],
            properties: {
                user_id: {
                    bsonType: 'string',
                    description: 'UUID of the user'
                },
                action: {
                    bsonType: 'string',
                    description: 'Action performed by user'
                },
                resource: {
                    bsonType: 'string',
                    description: 'Resource accessed'
                },
                resource_id: {
                    bsonType: 'string',
                    description: 'ID of the resource'
                },
                timestamp: {
                    bsonType: 'date'
                },
                details: {
                    bsonType: 'object'
                },
                metadata: {
                    bsonType: 'object'
                }
            }
        }
    }
});

// System Logs
db.createCollection('system_logs', {
    validator: {
        $jsonSchema: {
            bsonType: 'object',
            required: ['level', 'message', 'timestamp'],
            properties: {
                level: {
                    bsonType: 'string',
                    enum: ['error', 'warn', 'info', 'debug'],
                    description: 'Log level'
                },
                service: {
                    bsonType: 'string',
                    description: 'Microservice that generated the log'
                },
                message: {
                    bsonType: 'string',
                    description: 'Log message'
                },
                timestamp: {
                    bsonType: 'date'
                },
                error_stack: {
                    bsonType: 'string'
                },
                metadata: {
                    bsonType: 'object'
                }
            }
        }
    }
});

// Analytics Cache
db.createCollection('analytics_cache', {
    validator: {
        $jsonSchema: {
            bsonType: 'object',
            required: ['cache_key', 'data', 'created_at', 'expires_at'],
            properties: {
                cache_key: {
                    bsonType: 'string',
                    description: 'Unique cache key'
                },
                data: {
                    bsonType: 'object',
                    description: 'Cached analytics data'
                },
                created_at: {
                    bsonType: 'date'
                },
                expires_at: {
                    bsonType: 'date'
                },
                metadata: {
                    bsonType: 'object'
                }
            }
        }
    }
});

// Notifications Queue
db.createCollection('notifications_queue', {
    validator: {
        $jsonSchema: {
            bsonType: 'object',
            required: ['user_id', 'type', 'message', 'status', 'created_at'],
            properties: {
                user_id: {
                    bsonType: 'string'
                },
                type: {
                    bsonType: 'string',
                    enum: ['email', 'sms', 'push', 'in_app'],
                    description: 'Notification type'
                },
                message: {
                    bsonType: 'string'
                },
                subject: {
                    bsonType: 'string'
                },
                status: {
                    bsonType: 'string',
                    enum: ['pending', 'sent', 'failed', 'read'],
                    description: 'Notification status'
                },
                created_at: {
                    bsonType: 'date'
                },
                sent_at: {
                    bsonType: 'date'
                },
                read_at: {
                    bsonType: 'date'
                },
                metadata: {
                    bsonType: 'object'
                }
            }
        }
    }
});

// API Request Logs (for monitoring and analytics)
db.createCollection('api_request_logs', {
    validator: {
        $jsonSchema: {
            bsonType: 'object',
            required: ['method', 'path', 'status_code', 'timestamp'],
            properties: {
                request_id: { bsonType: 'string' },
                method: { bsonType: 'string' },
                path: { bsonType: 'string' },
                status_code: { bsonType: 'int' },
                response_time: { bsonType: 'int' },
                user_id: { bsonType: 'string' },
                ip_address: { bsonType: 'string' },
                user_agent: { bsonType: 'string' },
                timestamp: { bsonType: 'date' },
                error_message: { bsonType: 'string' }
            }
        }
    }
});

// ============================================================================
// CREATE INDEXES
// ============================================================================

print('Creating indexes...');

// Order History Indexes
db.order_history.createIndex({ order_id: 1, timestamp: -1 });
db.order_history.createIndex({ event_type: 1 });
db.order_history.createIndex({ user_id: 1 });
db.order_history.createIndex({ timestamp: -1 });

// User Activity Logs Indexes
db.user_activity_logs.createIndex({ user_id: 1, timestamp: -1 });
db.user_activity_logs.createIndex({ action: 1 });
db.user_activity_logs.createIndex({ resource: 1 });
db.user_activity_logs.createIndex({ timestamp: -1 });

// System Logs Indexes
db.system_logs.createIndex({ level: 1, timestamp: -1 });
db.system_logs.createIndex({ service: 1, timestamp: -1 });
db.system_logs.createIndex({ timestamp: -1 });

// Analytics Cache Indexes
db.analytics_cache.createIndex({ cache_key: 1 }, { unique: true });
db.analytics_cache.createIndex({ expires_at: 1 }, { expireAfterSeconds: 0 });

// Notifications Queue Indexes
db.notifications_queue.createIndex({ user_id: 1, status: 1 });
db.notifications_queue.createIndex({ status: 1 });
db.notifications_queue.createIndex({ created_at: -1 });

// API Request Logs Indexes
db.api_request_logs.createIndex({ timestamp: -1 });
db.api_request_logs.createIndex({ path: 1, method: 1 });
db.api_request_logs.createIndex({ status_code: 1 });
db.api_request_logs.createIndex({ user_id: 1, timestamp: -1 });

// ============================================================================
// INSERT INITIAL DATA
// ============================================================================

print('Inserting initial data...');

// Insert sample system log
db.system_logs.insertOne({
    level: 'info',
    service: 'init_script',
    message: 'MongoDB initialization completed successfully',
    timestamp: new Date(),
    metadata: {
        database: 'erp_audit',
        version: '1.0.0'
    }
});

// Insert welcome notification for admin
db.notifications_queue.insertOne({
    user_id: 'system',
    type: 'in_app',
    subject: 'Welcome to Enterprise ERP System',
    message: 'MongoDB database initialized successfully. All collections and indexes are ready.',
    status: 'pending',
    created_at: new Date(),
    metadata: {
        priority: 'low',
        category: 'system'
    }
});

// ============================================================================
// CREATE VIEWS (Aggregation Pipelines)
// ============================================================================

// Note: MongoDB doesn't have traditional views like SQL, but we can create
// saved aggregation pipelines or use $merge for materialized views

print('MongoDB initialization completed successfully!');
print('Collections created: ' + db.getCollectionNames().length);
print('Database: erp_audit is ready for use');