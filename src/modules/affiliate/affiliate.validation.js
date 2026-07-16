const Joi = require('joi');

const createInfluencerSchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).max(100).required(),
  referralCode: Joi.string().alphanum().min(3).max(20).uppercase().optional(),
  discountPercent: Joi.number().min(0).max(100).optional(),
  commissionPercent: Joi.number().min(0).max(100).optional(),
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

module.exports = { createInfluencerSchema, loginSchema };
