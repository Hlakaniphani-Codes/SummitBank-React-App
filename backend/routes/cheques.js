const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const upload = require('../middleware/upload');
const chequeController = require('../controllers/chequeController');

router.get('/', authenticate, chequeController.listDeposits);
router.post('/deposit', authenticate, upload.fields([
  { name: 'front', maxCount: 1 },
  { name: 'back', maxCount: 1 },
]), chequeController.depositCheque);

module.exports = router;
