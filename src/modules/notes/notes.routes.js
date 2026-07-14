const { Router } = require('express');
const notesController = require('./notes.controller');

const router = Router();

router.post('/', notesController.add);
router.get('/', notesController.getByUser);
router.put('/:id', notesController.update);
router.delete('/:id', notesController.delete);

module.exports = router;
