const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const sessionsController = require('../controllers/sessionsController');

router.get('/', authenticate, sessionsController.getSessions);
router.post('/:sessionId/signout', authenticate, sessionsController.signOut);


module.exports = router;