const { Router } = require('express');
const sprechenController = require('./sprechen.controller');

const router = Router();

router.post('/', sprechenController.saveRecording);
router.get('/:moduleId/:teil', sprechenController.getRecordings);
router.delete('/:id', sprechenController.deleteRecording);

module.exports = router;
