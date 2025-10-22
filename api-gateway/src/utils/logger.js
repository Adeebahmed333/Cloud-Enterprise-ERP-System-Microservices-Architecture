// api-gateway/src/utils/logger.js
const winston = require('winston');

/**
 * Winston Logger Configuration
 */
const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
    ),
    defaultMeta: { service: 'api-gateway' },
    transports: [
        // Write all logs to console
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.printf(({ timestamp, level, message, ...meta }) => {
                    return `${timestamp} [${level}]: ${message} ${Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''}`;
                })
            )
        })
    ]
});

// Add file transport if enabled
if (process.env.LOG_FILE_ENABLED === 'true') {
    logger.add(
        new winston.transports.File({
            filename: process.env.LOG_FILE_PATH || './logs/gateway.log',
            maxsize: parseInt(process.env.LOG_FILE_MAX_SIZE) || 10485760, // 10MB
            maxFiles: parseInt(process.env.LOG_FILE_MAX_FILES) || 7
        })
    );
}

/**
 * Request logging middleware
 */
const requestLogger = (req, res, next) => {
    const start = Date.now();

    // Log request
    logger.info('Incoming request', {
        method: req.method,
        path: req.path,
        ip: req.ip,
        userAgent: req.get('user-agent'),
        userId: req.user?.userId
    });

    // Log response when finished
    res.on('finish', () => {
        const duration = Date.now() - start;
        const logLevel = res.statusCode >= 400 ? 'warn' : 'info';

        logger[logLevel]('Request completed', {
            method: req.method,
            path: req.path,
            statusCode: res.statusCode,
            duration: `${duration}ms`,
            userId: req.user?.userId
        });
    });

    next();
};

module.exports = {
    logger,
    requestLogger
};