const { Router } = require('express');
const controller = require('./affiliate.controller');
const requireAdmin = require('./admin.middleware');
const authenticateInfluencer = require('./influencer.middleware');
const authenticate = require('../../middlewares/auth.middleware');

const router = Router();

// --- Public ---
router.get('/validate/:code', controller.validateCode);

// --- Influencer ---
router.post('/login', controller.login);
router.get('/dashboard', authenticateInfluencer, controller.dashboard);
router.post('/promo/generate', authenticateInfluencer, controller.generatePromo);
router.get('/promo/list', authenticateInfluencer, controller.listPromos);

// --- User (redeem promo code — requires normal user auth) ---
router.post('/promo/redeem', authenticate, controller.redeemPromo);

// --- Admin (x-admin-secret header) ---
router.post('/admin/influencers', requireAdmin, controller.createInfluencer);
router.get('/admin/influencers', requireAdmin, controller.listInfluencers);
router.post('/admin/influencers/:influencerId/payout', requireAdmin, controller.payout);

module.exports = router;
