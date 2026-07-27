const { Router } = require('express');
const billingController = require('./billing.controller');
const authenticate = require('../../middlewares/auth.middleware');

const router = Router();

// Create a PayPal order (for JS SDK flow)
router.post('/create-order', authenticate, billingController.createOrder);

// Capture a PayPal order (for JS SDK flow)
router.post('/capture', authenticate, billingController.captureOrder);

// Direct card payment — processes card via PayPal server-side (no SDK needed).
router.post('/pay-card', authenticate, billingController.payWithCard);

module.exports = router;
