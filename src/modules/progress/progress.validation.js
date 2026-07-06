const Joi = require('joi');

const moduleIdSchema = Joi.string().max(10).pattern(/^[a-z0-9]+$/).required().messages({
  'string.max': 'Module ID must be at most 10 characters',
  'string.pattern.base': 'Module ID must be lowercase alphanumeric',
  'any.required': 'Module ID is required',
});

const saveProgressSchema = Joi.object({
  sections: Joi.object().pattern(
    Joi.string().max(50),
    Joi.object({
      answers: Joi.array().max(100).required(),
      submitted: Joi.boolean().required(),
    })
  ).default({}),
  texts: Joi.object().pattern(
    Joi.string().max(50),
    Joi.array().items(Joi.string().allow('').max(500)).max(10)
  ).default({}),
  done: Joi.object().pattern(
    Joi.string().max(50),
    Joi.array().items(Joi.boolean()).max(10)
  ).default({}),
  highlights: Joi.array().items(
    Joi.object({
      text: Joi.string().max(500).required(),
      color: Joi.string().max(20).required(),
    }).unknown(true)
  ).max(200).default([]),
});

module.exports = { moduleIdSchema, saveProgressSchema };
