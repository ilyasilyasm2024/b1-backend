const { Router } = require('express');
const userController = require('./user.controller');

const router = Router();

router.get('/me', userController.getProfile);
router.get('/me/plan', userController.getPlan);
router.post('/me/subscribe', userController.subscribe);
router.put('/me', userController.update);
router.delete('/me', userController.delete);
router.post('/me/tour-completed', userController.completeTour);

module.exports = router;
