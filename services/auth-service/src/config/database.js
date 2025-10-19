// services/auth-service/src/config/database.js
const { Pool } = require('pg');
const redis = require('redis');

/**
 * PostgreSQL Connection Pool
 */
const pgPool = new Pool({
    host: process.env.POSTGRES_HOST || 'localhost',
    port: process.env.POSTGRES_PORT || 5432,
    user: process.env.POSTGRES_USER || 'erp_admin',
    password:process.env.POSTGRES_PASSWORD || 'erp_secure_password_123',
    database: process.env.POSTGRES_DB || 'erp_database',
    max: parseInt(process.env.POSTGRES_POOL_MAX) || 20,
    min: parseInt(process.env.POSTGRES_POOL_MIN) || 2,
    idleTimeoutMillis: parseInt(process.env.POSTGRES_POOL_IDLE_TIMEOUT) || 10000,
    connectionTimeoutMillis: 2000,
});

// Pool error handler
pgPool.on('error', (err) => {
    console.error('Unexpected PostgreSQL pool error:', err);
});

// Test PostgreSQL connection
pgPool.query('SELECT NOW()', (err, res) => {
    if (err) {
        console.error('❌ PostgreSQL connection failed:', err.message);
    } else {
        console.log('✅ PostgreSQL connected successfully at:', res.rows[0].now);
    }
});

/**
 * Redis Client Configuration
 */
const redisClient = redis.createClient({
    socket: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT, 10) || 6379,
    },
    password: process.env.REDIS_PASSWORD || 'erp_secure_password_123',
    database: parseInt(process.env.REDIS_DB) || 0,
});

// Redis error handler
redisClient.on('error', (err) => {
    console.error('❌ Redis Client Error:', err);
});

// Connect to Redis
(async () => {
    try {
        await redisClient.connect();
        console.log('✅ Redis connected successfully');
    } catch (err) {
        console.error('❌ Redis connection failed:', err.message);
    }
})();

/**
 * Helper function to execute PostgreSQL queries
 * @param {string} text - SQL query
 * @param {Array} params - Query parameters
 * @returns {Promise<Object>}
 */
const query = async (text, params) => {
    const start = Date.now();
    try {
        const res = await pgPool.query(text, params);
        const duration = Date.now() - start;
        console.log('Executed query:', { text, duration, rows: res.rowCount });
        return res;
    } catch (err) {
        console.error('Query error:', { text, error: err.message });
        throw err;
    }
};

/**
 * Helper function to get a client from pool (for transactions)
 * @returns {Promise<Object>}
 */
const getClient = async () => {
    const client = await pgPool.connect();
    return client;
};

/**
 * Redis helper functions
 */
const redisHelpers = {
    /**
     * Set value with expiry
     */
    async set(key, value, expirySeconds = 3600) {
        try {
            await redisClient.setEx(key, expirySeconds, JSON.stringify(value));
            return true;
        } catch (err) {
            console.error('Redis SET error:', err);
            return false;
        }
    },

    /**
     * Get value
     */
    async get(key) {
        try {
            const value = await redisClient.get(key);
            return value ? JSON.parse(value) : null;
        } catch (err) {
            console.error('Redis GET error:', err);
            return null;
        }
    },

    /**
     * Delete value
     */
    async del(key) {
        try {
            await redisClient.del(key);
            return true;
        } catch (err) {
            console.error('Redis DEL error:', err);
            return false;
        }
    },

    /**
     * Check if key exists
     */
    async exists(key) {
        try {
            const exists = await redisClient.exists(key);
            return exists === 1;
        } catch (err) {
            console.error('Redis EXISTS error:', err);
            return false;
        }
    },

    /**
     * Set expiry on existing key
     */
    async expire(key, seconds) {
        try {
            await redisClient.expire(key, seconds);
            return true;
        } catch (err) {
            console.error('Redis EXPIRE error:', err);
            return false;
        }
    }
};

/**
 * Graceful shutdown
 */
const closeConnections = async () => {
    console.log('Closing database connections...');
    await pgPool.end();
    await redisClient.quit();
    console.log('Database connections closed');
};

// Handle process termination
process.on('SIGINT', async () => {
    await closeConnections();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    await closeConnections();
    process.exit(0);
});

module.exports = {
    pool: pgPool,
    query,
    getClient,
    redis: redisClient,
    redisHelpers,
    closeConnections
};