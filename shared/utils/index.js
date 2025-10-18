// shared/utils/index.js
// Common utility functions used across all microservices

const crypto = require('crypto');

/**
 * API Response formatter
 */
class ResponseFormatter {
  /**
   * Success response
   * @param {*} data 
   * @param {Object} metadata 
   * @returns {Object}
   */
  static success(data, metadata = {}) {
    return {
      success: true,
      data,
      metadata: {
        timestamp: new Date().toISOString(),
        ...metadata
      },
      error: null
    };
  }

  /**
   * Error response
   * @param {string} message 
   * @param {string} code 
   * @param {Array} details 
   * @returns {Object}
   */
  static error(message, code = 'INTERNAL_ERROR', details = []) {
    return {
      success: false,
      data: null,
      error: {
        code,
        message,
        details
      },
      metadata: {
        timestamp: new Date().toISOString()
      }
    };
  }

  /**
   * Paginated response
   * @param {Array} data 
   * @param {number} page 
   * @param {number} limit 
   * @param {number} total 
   * @returns {Object}
   */
  static paginated(data, page, limit, total) {
    return this.success(data, {
      page: parseInt(page),
      limit: parseInt(limit),
      totalItems: total,
      totalPages: Math.ceil(total / limit),
      hasNextPage: page * limit < total,
      hasPreviousPage: page > 1
    });
  }
}

/**
 * Validation utilities
 */
class Validator {
  /**
   * Validate email format
   * @param {string} email 
   * @returns {boolean}
   */
  static isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate password strength
   * @param {string} password 
   * @returns {Object}
   */
  static validatePassword(password) {
    const minLength = parseInt(process.env.PASSWORD_MIN_LENGTH) || 8;
    const errors = [];

    if (password.length < minLength) {
      errors.push(`Password must be at least ${minLength} characters`);
    }

    if (process.env.PASSWORD_REQUIRE_UPPERCASE === 'true' && !/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (process.env.PASSWORD_REQUIRE_LOWERCASE === 'true' && !/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (process.env.PASSWORD_REQUIRE_NUMBER === 'true' && !/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    if (process.env.PASSWORD_REQUIRE_SPECIAL === 'true' && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate UUID format
   * @param {string} uuid 
   * @returns {boolean}
   */
  static isValidUUID(uuid) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }

  /**
   * Sanitize input string
   * @param {string} input 
   * @returns {string}
   */
  static sanitize(input) {
    if (typeof input !== 'string') return input;
    
    return input
      .trim()
      .replace(/[<>]/g, '') // Remove potential XSS characters
      .substring(0, 1000); // Limit length
  }
}

/**
 * Date utilities
 */
class DateUtils {
  /**
   * Format date to ISO string
   * @param {Date} date 
   * @returns {string}
   */
  static toISO(date) {
    return date instanceof Date ? date.toISOString() : new Date(date).toISOString();
  }

  /**
   * Add days to date
   * @param {Date} date 
   * @param {number} days 
   * @returns {Date}
   */
  static addDays(date, days) {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

  /**
   * Add hours to date
   * @param {Date} date 
   * @param {number} hours 
   * @returns {Date}
   */
  static addHours(date, hours) {
    const result = new Date(date);
    result.setHours(result.getHours() + hours);
    return result;
  }

  /**
   * Check if date is expired
   * @param {Date} date 
   * @returns {boolean}
   */
  static isExpired(date) {
    return new Date(date) < new Date();
  }

  /**
   * Get date range for filters
   * @param {string} range - 'today', 'week', 'month', 'year'
   * @returns {Object}
   */
  static getDateRange(range) {
    const now = new Date();
    const startOfDay = new Date(now.setHours(0, 0, 0, 0));
    
    switch (range) {
      case 'today':
        return {
          startDate: startOfDay,
          endDate: new Date(now.setHours(23, 59, 59, 999))
        };
      case 'week':
        const startOfWeek = new Date(startOfDay);
        startOfWeek.setDate(startOfDay.getDate() - startOfDay.getDay());
        return {
          startDate: startOfWeek,
          endDate: this.addDays(startOfWeek, 7)
        };
      case 'month':
        return {
          startDate: new Date(now.getFullYear(), now.getMonth(), 1),
          endDate: new Date(now.getFullYear(), now.getMonth() + 1, 0)
        };
      case 'year':
        return {
          startDate: new Date(now.getFullYear(), 0, 1),
          endDate: new Date(now.getFullYear(), 11, 31)
        };
      default:
        return { startDate: startOfDay, endDate: new Date() };
    }
  }
}

/**
 * Token generator utilities
 */
class TokenUtils {
  /**
   * Generate random token
   * @param {number} length 
   * @returns {string}
   */
  static generateToken(length = 32) {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Generate request ID
   * @returns {string}
   */
  static generateRequestId() {
    return `req_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
  }

  /**
   * Generate order number
   * @returns {string}
   */
  static generateOrderNumber() {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const random = crypto.randomBytes(3).toString('hex').toUpperCase();
    return `ORD-${dateStr}-${random}`;
  }
}

/**
 * Error handling utilities
 */
class ErrorHandler {
  /**
   * Create a custom error
   * @param {string} message 
   * @param {number} statusCode 
   * @param {string} code 
   * @returns {Error}
   */
  static createError(message, statusCode = 500, code = 'INTERNAL_ERROR') {
    const error = new Error(message);
    error.statusCode = statusCode;
    error.code = code;
    return error;
  }

  /**
   * Handle database errors
   * @param {Error} error 
   * @returns {Object}
   */
  static handleDatabaseError(error) {
    console.error('Database Error:', error);

    if (error.code === '23505') { // Unique constraint violation
      return {
        statusCode: 409,
        message: 'A record with this value already exists',
        code: 'DUPLICATE_ENTRY'
      };
    }

    if (error.code === '23503') { // Foreign key violation
      return {
        statusCode: 400,
        message: 'Referenced record does not exist',
        code: 'FOREIGN_KEY_VIOLATION'
      };
    }

    if (error.code === '23502') { // Not null violation
      return {
        statusCode: 400,
        message: 'Required field is missing',
        code: 'REQUIRED_FIELD_MISSING'
      };
    }

    return {
      statusCode: 500,
      message: 'Database operation failed',
      code: 'DATABASE_ERROR'
    };
  }
}

/**
 * Pagination utilities
 */
class PaginationUtils {
  /**
   * Get pagination params from query
   * @param {Object} query 
   * @returns {Object}
   */
  static getPaginationParams(query) {
    const page = Math.max(1, parseInt(query.page) || 1);
    const limit = Math.min(
      parseInt(process.env.MAX_PAGE_SIZE) || 100,
      Math.max(1, parseInt(query.limit) || parseInt(process.env.DEFAULT_PAGE_SIZE) || 20)
    );
    const offset = (page - 1) * limit;

    return {
      page,
      limit,
      offset,
      sortBy: query.sortBy || 'created_at',
      sortOrder: query.sortOrder?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC'
    };
  }
}

/**
 * String utilities
 */
class StringUtils {
  /**
   * Convert to slug
   * @param {string} text 
   * @returns {string}
   */
  static slugify(text) {
    return text
      .toString()
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^\w\-]+/g, '')
      .replace(/\-\-+/g, '-');
  }

  /**
   * Capitalize first letter
   * @param {string} text 
   * @returns {string}
   */
  static capitalize(text) {
    return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
  }

  /**
   * Truncate text
   * @param {string} text 
   * @param {number} length 
   * @returns {string}
   */
  static truncate(text, length = 100) {
    if (text.length <= length) return text;
    return text.substring(0, length) + '...';
  }
}

/**
 * Logger utility
 */
class Logger {
  /**
   * Log info
   * @param {string} message 
   * @param {Object} metadata 
   */
  static info(message, metadata = {}) {
    console.log(JSON.stringify({
      level: 'info',
      message,
      timestamp: new Date().toISOString(),
      ...metadata
    }));
  }

  /**
   * Log error
   * @param {string} message 
   * @param {Error} error 
   * @param {Object} metadata 
   */
  static error(message, error, metadata = {}) {
    console.error(JSON.stringify({
      level: 'error',
      message,
      error: {
        message: error.message,
        stack: error.stack,
        code: error.code
      },
      timestamp: new Date().toISOString(),
      ...metadata
    }));
  }

  /**
   * Log warning
   * @param {string} message 
   * @param {Object} metadata 
   */
  static warn(message, metadata = {}) {
    console.warn(JSON.stringify({
      level: 'warn',
      message,
      timestamp: new Date().toISOString(),
      ...metadata
    }));
  }

  /**
   * Log debug
   * @param {string} message 
   * @param {Object} metadata 
   */
  static debug(message, metadata = {}) {
    if (process.env.DEBUG_MODE === 'true') {
      console.debug(JSON.stringify({
        level: 'debug',
        message,
        timestamp: new Date().toISOString(),
        ...metadata
      }));
    }
  }
}

module.exports = {
  ResponseFormatter,
  Validator,
  DateUtils,
  TokenUtils,
  ErrorHandler,
  PaginationUtils,
  StringUtils,
  Logger
};