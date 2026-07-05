const { Router } = require('express');
const vocabularyController = require('./vocabulary.controller');

const router = Router();

router.post('/', vocabularyController.add);
router.get('/', vocabularyController.getByUser);
router.put('/:id', vocabularyController.update);
router.delete('/:id', vocabularyController.delete);

module.exports = router;
