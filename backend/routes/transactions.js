const express = require('express');
const router = express.Router();
const { getTransactions, transfer } = require('../controllers/transactionController');
const authenticate = require('../middleware/auth');
const { validate, transferRules } = require('../middleware/validation');

router.get('/', authenticate, getTransactions);
router.post('/transfer', authenticate, transferRules, validate, transfer);

module.exports = router;