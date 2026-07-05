const { Router } = require('express');
const userController = require('./user.controller');

const router = Router();

router.get('/me', userController.getProfile);
router.put('/me', userController.update);
router.delete('/me', userController.delete);

module.exports = router;
