// shared/types/index.js
// Shared TypeScript-style JSDoc type definitions for all services

/**
 * @typedef {Object} User
 * @property {string} id - UUID
 * @property {string} email
 * @property {string} password_hash
 * @property {string} first_name
 * @property {string} last_name
 * @property {string} [phone]
 * @property {boolean} is_active
 * @property {boolean} is_verified
 * @property {Date} [last_login]
 * @property {Date} created_at
 * @property {Date} updated_at
 */

/**
 * @typedef {Object} Role
 * @property {number} id
 * @property {string} name
 * @property {string} [description]
 * @property {Date} created_at
 */

/**
 * @typedef {Object} Permission
 * @property {number} id
 * @property {string} resource
 * @property {string} action
 * @property {string} [description]
 * @property {Date} created_at
 */

/**
 * @typedef {Object} Product
 * @property {string} id - UUID
 * @property {string} sku
 * @property {string} name
 * @property {string} [description]
 * @property {string} [category]
 * @property {number} unit_price
 * @property {number} cost_price
 * @property {number} reorder_point
 * @property {number} reorder_quantity
 * @property {boolean} is_active
 * @property {Date} created_at
 * @property {Date} updated_at
 * @property {string} [created_by]
 */

/**
 * @typedef {Object} Order
 * @property {string} id - UUID
 * @property {string} order_number
 * @property {string} customer_id - UUID
 * @property {string} status
 * @property {number} subtotal
 * @property {number} tax_amount
 * @property {number} shipping_amount
 * @property {number} total_amount
 * @property {string} payment_status
 * @property {string} [payment_method]
 * @property {string} [shipping_address]
 * @property {string} [billing_address]
 * @property {string} [notes]
 * @property {Date} order_date
 * @property {Date} [confirmed_at]
 * @property {Date} [shipped_at]
 * @property {Date} [delivered_at]
 * @property {Date} [cancelled_at]
 * @property {string} [created_by]
 * @property {Date} updated_at
 */

/**
 * @typedef {Object} OrderItem
 * @property {string} id - UUID
 * @property {string} order_id - UUID
 * @property {string} product_id - UUID
 * @property {number} quantity
 * @property {number} unit_price
 * @property {number} discount
 * @property {number} tax_rate
 * @property {number} total_price
 * @property {Date} created_at
 */

/**
 * @typedef {Object} StockLevel
 * @property {number} id
 * @property {string} product_id - UUID
 * @property {number} warehouse_id
 * @property {number} quantity
 * @property {number} reserved_quantity
 * @property {number} available_quantity
 * @property {Date} last_updated
 */

/**
 * @typedef {Object} APIResponse
 * @property {boolean} success
 * @property {*} [data]
 * @property {Object} [metadata]
 * @property {string} [metadata.requestId]
 * @property {string} [metadata.timestamp]
 * @property {number} [metadata.page]
 * @property {number} [metadata.totalPages]
 * @property {number} [metadata.totalItems]
 * @property {APIError} [error]
 */

/**
 * @typedef {Object} APIError
 * @property {string} code
 * @property {string} message
 * @property {Array<ErrorDetail>} [details]
 */

/**
 * @typedef {Object} ErrorDetail
 * @property {string} field
 * @property {string} message
 */

/**
 * @typedef {Object} JWTPayload
 * @property {string} userId
 * @property {string} email
 * @property {Array<string>} roles
 * @property {Array<string>} permissions
 * @property {number} iat
 * @property {number} exp
 */

/**
 * @typedef {Object} PaginationParams
 * @property {number} page
 * @property {number} limit
 * @property {string} [sortBy]
 * @property {string} [sortOrder]
 */

/**
 * @typedef {Object} FilterParams
 * @property {string} [search]
 * @property {string} [status]
 * @property {Date} [startDate]
 * @property {Date} [endDate]
 * @property {Object} [filters]
 */

module.exports = {
  // Export empty object - types are used via JSDoc comments
};