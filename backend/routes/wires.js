const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const wireController = require('../controllers/wireController');

router.get('/', authenticate, wireController.listWires);
router.post('/', authenticate, wireController.createWire);
router.get('/:wireId', authenticate, wireController.getWire);

module.exports = router;
