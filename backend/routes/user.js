const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authenticate = require('../middleware/auth');
const { validate, profileUpdateRules } = require('../middleware/validation');

router.use(authenticate);

router.get('/profile', userController.getProfile);
router.put('/profile', profileUpdateRules, validate, userController.updateProfile);
router.post('/profile/change-password', userController.changePassword); // validation handled inside controller (or add rules if needed)

module.exports = router;