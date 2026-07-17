const express = require('express');
const router = express.Router();
const supportController = require('../controllers/supportController');
const authenticate = require('../middleware/auth');
const { validate, supportRules } = require('../middleware/validation');

router.post('/', authenticate, supportRules, validate, supportController.submitTicket);

module.exports = router;