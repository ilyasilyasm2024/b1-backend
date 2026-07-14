const Joi = require('joi');

const HEX_COLOR = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

const addNoteSchema = Joi.object({
  type: Joi.string().valid('text', 'tick').default('text').messages({
    'any.only': 'Type must be either "text" or "tick"',
  }),
  content: Joi.string().max(5000).allow('').default('').messages({
    'string.max': 'Content must be at most 5000 characters',
  }),
  color: Joi.string().pattern(HEX_COLOR).default('#fde68a').messages({
    'string.pattern.base': 'Color must be a valid hex color',
  }),
});

const updateNoteSchema = Joi.object({
  type: Joi.string().valid('text', 'tick').messages({
    'any.only': 'Type must be either "text" or "tick"',
  }),
  content: Joi.string().max(5000).allow('').messages({
    'string.max': 'Content must be at most 5000 characters',
  }),
  color: Joi.string().pattern(HEX_COLOR).messages({
    'string.pattern.base': 'Color must be a valid hex color',
  }),
}).min(1);

module.exports = { addNoteSchema, updateNoteSchema };
