// services/auth-service/src/middleware/validation.js
const Joi = require('joi');

/**
 * Validation schemas using Joi
 */

/**
 * User registration validation schema
 */
const registerSchema = Joi.object({
    email: Joi.string()
        .email()
        .lowercase()
        .trim()
        .required()
        .messages({
            'string.email': 'Please provide a valid email address',
            'any.required': 'Email is required'
        }),

    password: Joi.string()
        .min(parseInt(process.env.PASSWORD_MIN_LENGTH) || 8)
        .max(128)
        .required()
        .messages({
            'string.min': 'Password must be at least {#limit} characters long',
            'any.required': 'Password is required'
        }),

    confirmPassword: Joi.string()
        .valid(Joi.ref('password'))
        .required()
        .messages({
            'any.only': 'Passwords do not match',
            'any.required': 'Password confirmation is required'
        }),

    firstName: Joi.string()
        .min(2)
        .max(100)
        .trim()
        .required()
        .messages({
            'string.min': 'First name must be at least {#limit} characters',
            'any.required': 'First name is required'
        }),

    lastName: Joi.string()
        .min(2)
        .max(100)
        .trim()
        .required()
        .messages({
            'string.min': 'Last name must be at least {#limit} characters',
            'any.required': 'Last name is required'
        }),

    phone: Joi.string()
        .pattern(/^[0-9+\-() ]+$/)
        .min(10)
        .max(20)
        .allow('', null)
        .messages({
            'string.pattern.base': 'Please provide a valid phone number'
        })
});

/**
 * User login validation schema
 */
const loginSchema = Joi.object({
    email: Joi.string()
        .email()
        .lowercase()
        .trim()
        .required()
        .messages({
            'string.email': 'Please provide a valid email address',
            'any.required': 'Email is required'
        }),

    password: Joi.string()
        .required()
        .messages({
            'any.required': 'Password is required'
        })
});

/**
 * Refresh token validation schema
 */
const refreshTokenSchema = Joi.object({
    refreshToken: Joi.string()
        .required()
        .messages({
            'any.required': 'Refresh token is required'
        })
});

/**
 * Password change validation schema
 */
const changePasswordSchema = Joi.object({
    currentPassword: Joi.string()
        .required()
        .messages({
            'any.required': 'Current password is required'
        }),

    newPassword: Joi.string()
        .min(parseInt(process.env.PASSWORD_MIN_LENGTH) || 8)
        .max(128)
        .required()
        .messages({
            'string.min': 'New password must be at least {#limit} characters long',
            'any.required': 'New password is required'
        }),

    confirmNewPassword: Joi.string()
        .valid(Joi.ref('newPassword'))
        .required()
        .messages({
            'any.only': 'Passwords do not match',
            'any.required': 'Password confirmation is required'
        })
});

/**
 * Validation middleware factory
 */
const validate = (schema) => {
    return (req, res, next) => {
        const { error, value } = schema.validate(req.body, {
            abortEarly: false, // Return all errors, not just the first
            stripUnknown: true // Remove unknown fields
        });

        if (error) {
            const errors = error.details.map(detail => ({
                field: detail.path.join('.'),
                message: detail.message
            }));

            return res.status(400).json({
                success: false,
                data: null,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Validation failed',
                    details: errors
                },
                metadata: {
                    timestamp: new Date().toISOString()
                }
            });
        }

        // Replace req.body with validated and sanitized data
        req.body = value;
        next();
    };
};

module.exports = {
    registerSchema,
    loginSchema,
    refreshTokenSchema,
    changePasswordSchema,
    validate
};