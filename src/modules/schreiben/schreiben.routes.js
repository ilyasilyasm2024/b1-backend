const { Router } = require('express');
const schreibenController = require('./schreiben.controller');

const router = Router();

router.post('/', schreibenController.saveVersion);
router.get('/:moduleId/:aufgabeId', schreibenController.getVersions);
router.delete('/:id', schreibenController.deleteVersion);

module.exports = router;
