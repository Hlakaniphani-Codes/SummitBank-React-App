const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const beneficiaryController = require('../controllers/beneficiaryController');
const { validate, beneficiaryRules } = require('../middleware/validation');

router.get('/', authenticate, beneficiaryController.getBeneficiaries);
router.post('/', authenticate, beneficiaryRules, validate, beneficiaryController.postBeneficiary);
router.delete('/:beneficiaryId', authenticate, beneficiaryController.deleteBeneficiary);

module.exports = router;