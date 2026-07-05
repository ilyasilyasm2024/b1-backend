const Joi = require('joi');

const signupSchema = Joi.object({
  username: Joi.string()
    .alphanum()
    .min(3)
    .max(30)
    .required()
    .messages({
      'string.alphanum': 'Username must only contain letters and numbers',
      'string.min': 'Username must be at least 3 characters',
      'string.max': 'Username must be at most 30 characters',
      'any.required': 'Username is required',
    }),
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required',
    }),
  firstName: Joi.string()
    .min(2)
    .max(50)
    .required()
    .messages({
      'string.min': 'First name must be at least 2 characters',
      'string.max': 'First name must be at most 50 characters',
      'any.required': 'First name is required',
    }),
  lastName: Joi.string()
    .min(2)
    .max(50)
    .required()
    .messages({
      'string.min': 'Last name must be at least 2 characters',
      'string.max': 'Last name must be at most 50 characters',
      'any.required': 'Last name is required',
    }),
  password: Joi.string()
    .min(6)
    .max(128)
    .required()
    .messages({
      'string.min': 'Password must be at least 6 characters',
      'string.max': 'Password must be at most 128 characters',
      'any.required': 'Password is required',
    }),
});

const loginSchema = Joi.object({
  identifier: Joi.string()
    .min(3)
    .max(128)
    .required()
    .messages({
      'string.min': 'Email or username must be at least 3 characters',
      'any.required': 'Email or username is required',
    }),
  password: Joi.string()
    .required()
    .messages({
      'any.required': 'Password is required',
    }),
});

module.exports = { signupSchema, loginSchema };
