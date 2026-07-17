const express = require('express');
const router = express.Router();
const notificationsController = require('../controllers/notificationsController');
const authenticate = require('../middleware/auth');

router.use(authenticate);

router.get('/', notificationsController.getNotifications);
router.put('/:id/read', notificationsController.markRead);

module.exports = router;