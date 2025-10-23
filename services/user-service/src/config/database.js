const { Pool } = require('pg');
const { MongoClient } = require('mongodb');
const redis = require('redis');
const path = require('path');

// Load environment variables from root .env
require('dotenv').config({ path: path.resolve(__dirname, '../../../../.env') });

/**
 * PostgreSQL Connection Pool
 * Uses global DATABASE_URL or individual variables
 */
const pgPool = new Pool({
    connectionString: process.env.DATABASE_URL,
    // Fallback to individual variables
    host: process.env.POSTGRES_HOST,
    port: parseInt(process.env.POSTGRES_PORT) || 5432,
    database: process.env.POSTGRES_DB,
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    min: parseInt(process.env.POSTGRES_POOL_MIN) || 2,
    max: parseInt(process.env.POSTGRES_POOL_MAX) || 20,
    idleTimeoutMillis: parseInt(process.env.POSTGRES_POOL_IDLE_TIMEOUT) || 10000,
    connectionTimeoutMillis: 2000,
});

pgPool.on('connect', () => {
    console.log('✅ PostgreSQL connected (User Service)');
});

pgPool.on('error', (err) => {
    console.error('❌ PostgreSQL connection error:', err);
});

/**
 * MongoDB Connection
 * Uses MONGODB_URI from global .env
 */
let mongoClient;
let mongoDb;

const connectMongo = async () => {
    try {
        const uri = process.env.MONGODB_URI;

        if (!uri) {
            throw new Error('MONGODB_URI not found in environment variables');
        }

        mongoClient = new MongoClient(uri);
        await mongoClient.connect();
        mongoDb = mongoClient.db(process.env.MONGODB_DB || 'erp_audit');

        console.log(`✅ MongoDB connected to ${process.env.MONGODB_DB || 'erp_audit'} database (User Service)`);

        await verifyMongoCollections();

        return mongoDb;
    } catch (err) {
        console.error('❌ MongoDB connection error:', err);
        throw err;
    }
};

/**
 * Verify MongoDB Collections
 */
const verifyMongoCollections = async () => {
    try {
        const collections = await mongoDb.listCollections().toArray();
        const collectionNames = collections.map(c => c.name);

        if (collectionNames.includes('user_activity_logs')) {
            console.log('✅ user_activity_logs collection found');
        } else {
            console.warn('⚠️  user_activity_logs collection not found - will be created on first insert');
        }

        console.log(`📊 Available collections: ${collectionNames.join(', ')}`);
    } catch (err) {
        console.error('MongoDB collection verification error:', err);
    }
};

/**
 * Redis Client
 * Uses REDIS_URL from global .env
 */
const redisClient = redis.createClient({
    url: process.env.REDIS_URL,
    // Fallback to individual variables
    socket: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT) || 6379,
    },
    password: process.env.REDIS_PASSWORD,
    database: parseInt(process.env.REDIS_DB) || 0,
});

redisClient.on('connect', () => {
    console.log('✅ Redis connected (User Service)');
});

redisClient.on('error', (err) => {
    console.error('❌ Redis connection error:', err);
});

redisClient.connect().catch(console.error);

/**
 * Redis Helper Functions
 */
const redisHelpers = {
    get: async (key) => {
        try {
            const value = await redisClient.get(key);
            return value ? JSON.parse(value) : null;
        } catch (err) {
            console.error('Redis GET error:', err);
            return null;
        }
    },

    set: async (key, value, expiryInSeconds = null) => {
        try {
            // Use cache TTL from env or default
            const ttl = expiryInSeconds || parseInt(process.env.CACHE_TTL_LONG) || 3600;
            await redisClient.setEx(key, ttl, JSON.stringify(value));
            return true;
        } catch (err) {
            console.error('Redis SET error:', err);
            return false;
        }
    },

    del: async (key) => {
        try {
            await redisClient.del(key);
            return true;
        } catch (err) {
            console.error('Redis DEL error:', err);
            return false;
        }
    },

    invalidatePattern: async (pattern) => {
        try {
            const keys = await redisClient.keys(pattern);
            if (keys.length > 0) {
                await redisClient.del(keys);
            }
            return true;
        } catch (err) {
            console.error('Redis pattern delete error:', err);
            return false;
        }
    }
};

/**
 * Graceful shutdown
 */
const closeConnections = async () => {
    try {
        await pgPool.end();
        if (mongoClient) await mongoClient.close();
        await redisClient.quit();
        console.log('✅ All database connections closed');
    } catch (err) {
        console.error('Error closing connections:', err);
    }
};

process.on('SIGINT', async () => {
    await closeConnections();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    await closeConnections();
    process.exit(0);
});

module.exports = {
    pgPool,
    connectMongo,
    getMongoDb: () => mongoDb,
    redisClient,
    redisHelpers,
    closeConnections
};
