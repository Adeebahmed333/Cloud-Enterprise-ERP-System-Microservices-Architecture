const winston = require('winston');
const path = require('path');

// Load environment variables from root .env
require('dotenv').config({ path: path.resolve(__dirname, '../../../../.env') });

const LOG_LEVEL = process.env.LOG_LEVEL || 'info';
const LOG_FILE_ENABLED = process.env.LOG_FILE_ENABLED === 'true';
const LOG_FILE_PATH = process.env.LOG_FILE_PATH || './logs/user-service.log';
const LOG_FILE_MAX_SIZE = parseInt(process.env.LOG_FILE_MAX_SIZE) || 10485760;
const LOG_FILE_MAX_FILES = parseInt(process.env.LOG_FILE_MAX_FILES) || 7;

/**
 * Winston Logger Configuration
 */
const transports = [
  new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.timestamp(),
      winston.format.printf(({ timestamp, level, message, ...meta }) => {
        return `${timestamp} [${level}]: ${message} ${
          Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''
        }`;
      })
    )
  })
];

// Add file transport if enabled
if (LOG_FILE_ENABLED) {
  transports.push(
    new winston.transports.File({
      filename: LOG_FILE_PATH,
      maxsize: LOG_FILE_MAX_SIZE,
      maxFiles: LOG_FILE_MAX_FILES,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      )
    })
  );
}

const logger = winston.createLogger({
  level: LOG_LEVEL,
  format: winston.format.json(),
  defaultMeta: { service: 'user-service' },
  transports
});

module.exports = logger;