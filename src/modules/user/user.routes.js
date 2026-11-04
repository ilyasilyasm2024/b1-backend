const { Router } = require('express');
const userController = require('./user.controller');

const router = Router();

router.get('/me', userController.getProfile);
router.get('/me/plan', userController.getPlan);
// Changing your own plan without paying: only for tests/dev (ALLOW_SELF_SUBSCRIBE=true).
// Paid plans are otherwise only activated through promo codes (billing has been removed).
const allowSelfSubscribe = (req, res, next) =>
  process.env.ALLOW_SELF_SUBSCRIBE === 'true' ? next() : res.status(403).json({ error: 'Plans are activated after payment' });
router.post('/me/subscribe', allowSelfSubscribe, userController.subscribe);
router.put('/me', userController.update);
router.delete('/me', userController.delete);
router.post('/me/tour-completed', userController.completeTour);

module.exports = router;
