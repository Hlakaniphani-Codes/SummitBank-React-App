const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const paymentsController = require('../controllers/paymentsController');
const {
  validate,
  payBillRules,
  beneficiaryRules,
  payeeRules,
  billRules,
  supportRules,
} = require('../middleware/validation');

// Payees
router.get('/payees', authenticate, paymentsController.getPayees);
router.post('/payees', authenticate, payeeRules, validate, paymentsController.postPayee);

// Bills
router.get('/bills', authenticate, paymentsController.getBills);
router.post('/bills', authenticate, billRules, validate, paymentsController.postBill);
router.post('/bills/:billId/pay', authenticate, payBillRules, validate, paymentsController.payBill);

// Documents
router.get('/documents', authenticate, paymentsController.getDocuments);
router.post('/documents/statements', authenticate, paymentsController.generateStatement); // No validation needed for now

module.exports = router;