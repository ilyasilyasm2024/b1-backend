const Joi = require('joi');

const HEX_COLOR = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

const addNoteSchema = Joi.object({
  type: Joi.string().valid('text', 'tick').default('text').messages({
    'any.only': 'Type must be either "text" or "tick"',
  }),
  title: Joi.string().max(200).allow('').default('').messages({
    'string.max': 'Title must be at most 200 characters',
  }),
  content: Joi.string().max(5000).allow('').default('').messages({
    'string.max': 'Content must be at most 5000 characters',
  }),
  color: Joi.string().pattern(HEX_COLOR).default('#fde68a').messages({
    'string.pattern.base': 'Color must be a valid hex color',
  }),
  dir: Joi.string().valid('ltr', 'rtl').default('ltr').messages({
    'any.only': 'Direction must be either "ltr" or "rtl"',
  }),
  collapsed: Joi.boolean().default(false),
  pinned: Joi.boolean().default(false),
  order: Joi.number().default(0),
  links: Joi.array().items(Joi.string().hex().length(24)).default([]),
  x: Joi.number().default(100),
  y: Joi.number().default(120),
});

const updateNoteSchema = Joi.object({
  type: Joi.string().valid('text', 'tick').messages({
    'any.only': 'Type must be either "text" or "tick"',
  }),
  title: Joi.string().max(200).allow('').messages({
    'string.max': 'Title must be at most 200 characters',
  }),
  content: Joi.string().max(5000).allow('').messages({
    'string.max': 'Content must be at most 5000 characters',
  }),
  color: Joi.string().pattern(HEX_COLOR).messages({
    'string.pattern.base': 'Color must be a valid hex color',
  }),
  dir: Joi.string().valid('ltr', 'rtl').messages({
    'any.only': 'Direction must be either "ltr" or "rtl"',
  }),
  collapsed: Joi.boolean(),
  pinned: Joi.boolean(),
  order: Joi.number(),
  links: Joi.array().items(Joi.string().hex().length(24)),
  x: Joi.number(),
  y: Joi.number(),
}).min(1);

module.exports = { addNoteSchema, updateNoteSchema };
