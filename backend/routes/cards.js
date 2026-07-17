const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const cardsController = require('../controllers/cardsController');
const { validate, cardActionRules } = require('../middleware/validation');

// Existing routes (using POST – fine)
router.post('/:cardId/view', authenticate, cardActionRules, validate, cardsController.viewCard);
router.post('/:cardId/block', authenticate, cardActionRules, validate, cardsController.blockCard);
router.post('/:cardId/activate', authenticate, cardActionRules, validate, cardsController.activateCard);

// NEW: Request a new card – no specific validation yet, but we can add if needed
router.post('/', authenticate, cardsController.requestNewCard);

module.exports = router;