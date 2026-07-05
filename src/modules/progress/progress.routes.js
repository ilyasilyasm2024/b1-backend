const { Router } = require('express');
const progressController = require('./progress.controller');

const router = Router();

// Get all modules progress for the user
router.get('/', progressController.getAll);

// Get progress for a specific module
router.get('/:moduleId', progressController.get);

// Save/update progress for a specific module
router.put('/:moduleId', progressController.save);

module.exports = router;
