const { Router } = require('express');
const controller = require('./affiliate.controller');
const requireAdmin = require('./admin.middleware');
const authenticateInfluencer = require('./influencer.middleware');

const router = Router();

// --- Public ---
// Validate a referral code (signup page shows discount)
router.get('/validate/:code', controller.validateCode);

// --- Influencer ---
router.post('/login', controller.login);
router.get('/dashboard', authenticateInfluencer, controller.dashboard);

// --- Admin (x-admin-secret header) ---
router.post('/admin/influencers', requireAdmin, controller.createInfluencer);
router.get('/admin/influencers', requireAdmin, controller.listInfluencers);
router.post('/admin/influencers/:influencerId/payout', requireAdmin, controller.payout);

module.exports = router;
