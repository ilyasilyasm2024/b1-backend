const Joi = require('joi');

const addVocabSchema = Joi.object({
  deutsch: Joi.string().max(150).required().messages({
    'string.max': 'Deutsch field must be at most 150 characters',
    'any.required': 'Deutsch field is required',
  }),
  arabic: Joi.string().max(150).required().messages({
    'string.max': 'Arabic field must be at most 150 characters',
    'any.required': 'Arabic field is required',
  }),
  beispiel: Joi.string().max(150).allow('').default('').messages({
    'string.max': 'Beispiel field must be at most 150 characters',
  }),
});

const updateVocabSchema = Joi.object({
  deutsch: Joi.string().max(150).messages({
    'string.max': 'Deutsch field must be at most 150 characters',
  }),
  arabic: Joi.string().max(150).messages({
    'string.max': 'Arabic field must be at most 150 characters',
  }),
  beispiel: Joi.string().max(150).allow('').messages({
    'string.max': 'Beispiel field must be at most 150 characters',
  }),
  isLearned: Joi.boolean(),
  viewed: Joi.number().integer().min(0),
  repeatNumber: Joi.number().integer().min(0),
}).min(1);

module.exports = { addVocabSchema, updateVocabSchema };
