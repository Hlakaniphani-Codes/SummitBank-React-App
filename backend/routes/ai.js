const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');
const authenticate = require('../middleware/auth');

router.post('/chat', authenticate, aiController.chat);
router.get('/history', authenticate, aiController.history);

module.exports = router;
