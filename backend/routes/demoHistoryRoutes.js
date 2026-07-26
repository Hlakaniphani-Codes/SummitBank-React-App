// backend/routes/demoHistoryRoutes.js
const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const requireAdmin = require('../middleware/adminAuth');
const {
  generateCustomerHistory,
  generateCustomerHistoryStream
} = require('../controllers/demoHistoryController');

// All routes require admin authentication
router.use(authenticate);
router.use(requireAdmin);

// Generate demo history
router.post('/customers/:id/generate-history', generateCustomerHistory);

// Generate demo history with streaming progress
router.post('/customers/:id/generate-history/stream', generateCustomerHistoryStream);

module.exports = router;