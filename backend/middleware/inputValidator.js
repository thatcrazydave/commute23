const Logger = require('../utils/logger');

const RULES = {
  username: {
    minLength: 3,
    maxLength: 30,
    pattern: /^[a-zA-Z0-9_-]+$/,
    description: 'Username must be 3-30 chars, letters/numbers/underscore/hyphen only',
  },
  email: {
    minLength: 3,
    maxLength: 254,
    pattern: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
    description: 'Invalid email format',
  },
  password: { minLength: 8, maxLength: 72 },
  fullname: {
    minLength: 2,
    maxLength: 80,
    pattern: /^[\p{L}\p{M}\s'.-]+$/u,
    description: 'Name contains invalid characters',
  },
  firstName: {
    minLength: 1,
    maxLength: 40,
    pattern: /^[\p{L}\p{M}\s'.-]+$/u,
    description: 'First name contains invalid characters',
  },
  lastName: {
    minLength: 1,
    maxLength: 40,
    pattern: /^[\p{L}\p{M}\s'.-]+$/u,
    description: 'Last name contains invalid characters',
  },
};

const NOSQL_OPERATOR = /^\$/;

const validateString = (value, fieldName, rules = {}) => {
  if (typeof value !== 'string') {
    return `${fieldName} must be a string`;
  }
  // Reject if contains a top-level NoSQL operator (basic guard)
  const trimmed = value.trim();
  if (NOSQL_OPERATOR.test(trimmed)) {
    return `${fieldName} contains invalid characters`;
  }
  if (rules.minLength != null && trimmed.length < rules.minLength) {
    return `${fieldName} must be at least ${rules.minLength} characters`;
  }
  if (rules.maxLength != null && trimmed.length > rules.maxLength) {
    return `${fieldName} must not exceed ${rules.maxLength} characters`;
  }
  if (rules.pattern && !rules.pattern.test(trimmed)) {
    return rules.description || `${fieldName} format is invalid`;
  }
  return null;
};

const buildValidator = (schema) => (req, res, next) => {
  const errors = [];
  for (const [field, rules] of Object.entries(schema)) {
    const value = req.body?.[field];
    if (rules.required && (value === undefined || value === null || value === '')) {
      errors.push(`${field} is required`);
      continue;
    }
    if (value !== undefined && value !== null && value !== '') {
      const err = validateString(value, field, rules);
      if (err) errors.push(err);
    }
  }

  if (errors.length) {
    Logger.warn('Input validation failed', { path: req.path, errors });
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: errors },
    });
  }
  next();
};

const validateSignup = buildValidator({
  email: { required: true, ...RULES.email },
  username: { required: true, ...RULES.username },
  password: { required: true, ...RULES.password },
  firstName: { required: true, ...RULES.firstName },
  lastName: { required: true, ...RULES.lastName },
});

const validateLogin = buildValidator({
  emailOrUsername: { required: true, minLength: 3, maxLength: 254 },
  password: { required: true, ...RULES.password },
});

const validateForgotPassword = buildValidator({
  email: { required: true, ...RULES.email },
});

module.exports = {
  buildValidator,
  validateSignup,
  validateLogin,
  validateForgotPassword,
};
