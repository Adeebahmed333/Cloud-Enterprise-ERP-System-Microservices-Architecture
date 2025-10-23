const Joi = require('joi');
const path = require('path');

// Load environment variables from root .env
require('dotenv').config({ path: path.resolve(__dirname, '../../../../.env') });

// Get password policy from env
const PASSWORD_MIN_LENGTH = parseInt(process.env.PASSWORD_MIN_LENGTH) || 8;

/**
 * Validation schemas using global password policy
 */
const schemas = {
    updateUser: Joi.object({
        first_name: Joi.string().min(1).max(100),
        last_name: Joi.string().min(1).max(100),
        phone: Joi.string().pattern(/^[+]?[0-9]{10,20}$/),
        is_active: Joi.boolean(),
        is_verified: Joi.boolean()
    }).min(1),

    assignRole: Joi.object({
        roleId: Joi.number().integer().positive().required()
    }),

    // For future password update feature
    changePassword: Joi.object({
        oldPassword: Joi.string().required(),
        newPassword: Joi.string().min(PASSWORD_MIN_LENGTH).required(),
        confirmPassword: Joi.string().valid(Joi.ref('newPassword')).required()
    })
};

/**
 * Validation middleware factory
 */
const validate = (schema) => {
    return (req, res, next) => {
        const { error } = schema.validate(req.body);

        if (error) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: error.details[0].message,
                    details: error.details
                }
            });
        }

        next();
    };
};

module.exports = {
    validateUpdateUser: validate(schemas.updateUser),
    validateAssignRole: validate(schemas.assignRole),
    validateChangePassword: validate(schemas.changePassword)
};
