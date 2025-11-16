/**
 * Request Validation Middleware
 * Using Joi for schema validation
 */

const Joi = require('joi');

/**
 * Common validation schemas
 */
const schemas = {
  // Amount validation (positive, max 2 decimals)
  amount: Joi.number().positive().precision(2).required(),

  // Australian phone number
  phone: Joi.string().pattern(/^\+61[0-9]{9}$|^0[0-9]{9}$/),

  // Email
  email: Joi.string().email(),

  // UUID v4
  uuid: Joi.string().uuid({ version: 'uuidv4' }),

  // ISO 8601 date
  date: Joi.date().iso(),

  // Payment request
  paymentRequest: Joi.object({
    amount: Joi.number().positive().precision(2).max(10000).required(),
    reason: Joi.string().min(5).max(500).required(),
    is_voice: Joi.boolean().default(false),
  }),

  // Bill/whitelist item
  bill: Joi.object({
    payee_name: Joi.string().min(2).max(100).required(),
    amount: Joi.number().positive().precision(2).optional(),
    frequency: Joi.string().valid('weekly', 'fortnightly', 'monthly', 'once-off').required(),
    priority: Joi.string().valid('critical', 'essential', 'other').required(),
    due_date: Joi.date().iso().optional(),
    notes: Joi.string().max(500).optional(),
  }),

  // Guardian invite
  guardianInvite: Joi.object({
    name: Joi.string().min(2).max(100).required(),
    phone: Joi.string().pattern(/^\+61[0-9]{9}$|^0[0-9]{9}$/).required(),
    email: Joi.string().email().optional(),
    relationship: Joi.string().min(2).max(50).required(),
  }),

  // User onboarding
  onboarding: Joi.object({
    name: Joi.string().min(2).max(100).required(),
    phone: Joi.string().pattern(/^\+61[0-9]{9}$|^0[0-9]{9}$/).required(),
    commitment_period_months: Joi.number().valid(6, 12, 18, 24).required(),
    gambling_type: Joi.array().items(Joi.string()).min(1).required(),
    known_triggers: Joi.array().items(Joi.string()).optional(),
    up_bank_token: Joi.string().required(),
  }),

  // Bill add
  billAdd: Joi.object({
    payee_name: Joi.string().min(2).max(100).required(),
    amount: Joi.number().positive().precision(2).required(),
    frequency: Joi.string().valid('weekly', 'fortnightly', 'monthly', 'quarterly', 'yearly', 'once-off').required(),
    priority: Joi.string().valid('critical', 'essential', 'normal').default('normal'),
    due_date: Joi.date().iso().required(),
    notes: Joi.string().max(500).optional(),
  }),

  // Bill update
  billUpdate: Joi.object({
    payee_name: Joi.string().min(2).max(100).optional(),
    amount: Joi.number().positive().precision(2).optional(),
    frequency: Joi.string().valid('weekly', 'fortnightly', 'monthly', 'quarterly', 'yearly', 'once-off').optional(),
    priority: Joi.string().valid('critical', 'essential', 'normal').optional(),
    due_date: Joi.date().iso().optional(),
    notes: Joi.string().max(500).optional(),
  }).min(1),

  // Guardian emergency trigger
  emergencyTrigger: Joi.object({
    reason: Joi.string().min(10).max(500).required(),
  }),

  // Pattern detection (internal)
  patternDetect: Joi.object({
    user_id: Joi.string().uuid({ version: 'uuidv4' }).required(),
    transaction: Joi.object({
      description: Joi.string().required(),
      amount: Joi.number().required(),
      timestamp: Joi.date().iso().required(),
    }).required(),
  }),

  // Relapse record (internal)
  relapseRecord: Joi.object({
    user_id: Joi.string().uuid({ version: 'uuidv4' }).required(),
    pattern_type: Joi.string().required(),
    transaction_id: Joi.string().optional(),
  }),

  // Waitlist submission
  waitlistSubmit: Joi.object({
    email: Joi.string().email().required(),
    name: Joi.string().min(2).max(100).required(),
    lost_5k: Joi.string().valid('yes', 'no').required(),
    relapsed: Joi.string().valid('yes', 'no').required(),
    up_bank: Joi.string().valid('yes', 'will_switch', 'no').required(),
    guardian: Joi.string().valid('partner', 'parent', 'friend', 'counselor', 'other').required(),
    ready: Joi.string().valid('yes', 'no').required(),
    qualification_tier: Joi.string().valid('priority', 'high', 'standard', 'not_ready').required(),
  }),

  // Query pagination
  pagination: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
  }),
};

/**
 * Validate request body against schema
 */
function validateBody(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
      }));

      return res.status(400).json({
        error: true,
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: errors,
      });
    }

    // Replace body with validated/sanitized value
    req.body = value;
    next();
  };
}

/**
 * Validate query parameters against schema
 */
function validateQuery(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.query, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
      }));

      return res.status(400).json({
        error: true,
        code: 'VALIDATION_ERROR',
        message: 'Query validation failed',
        details: errors,
      });
    }

    req.query = value;
    next();
  };
}

/**
 * Validate route params against schema
 */
function validateParams(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.params, {
      abortEarly: false,
    });

    if (error) {
      return res.status(400).json({
        error: true,
        code: 'VALIDATION_ERROR',
        message: 'Invalid route parameters',
        details: error.details,
      });
    }

    req.params = value;
    next();
  };
}

module.exports = {
  schemas,
  validateBody,
  validateQuery,
  validateParams,
};
