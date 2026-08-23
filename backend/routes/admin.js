const express = require('express');
const router = express.Router();
const { requireAdmin } = require('../middleware/adminAuth');
const authenticate = require('../middleware/auth');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');

const {
  getCustomers,
  getCustomer,
  updateCustomer,
  activateCustomer,
  deactivateCustomer,
  suspendCustomer,
  reinstateCustomer,
  deleteCustomer,
  getCustomerActivity,
  getApplications,
  getApplicationDetails,
  approveApplication,
  rejectApplication,
  reviewApplication,
  sendCustomerEmail,
  fixUserApprovalStatus,
  updateCreditScore,
} = require('../controllers/adminCustomers');

const {
  getAccounts,
  createAccount,
  updateAccount,
  creditAccount,
  debitAccount,
  editBalance,
  activateAccount,
  deactivateAccount,
  closeAccount,
  reopenAccount,
  freezeAccount,
  unfreezeAccount,
  holdAccount,
  removeHold,
  deleteAccount,
  getAccountTransactions,
  getAccountDetails,
  adjustAvailableBalance,
  adjustLedgerBalance,
} = require('../controllers/adminAccounts');

const {
  getCards,
  activateCard,
  deactivateCard,
  blockCard,
  unblockCard,
  toggleVisibility,
  approveCard,
  rejectCard,
  replaceCard,
  cancelCard,
} = require('../controllers/adminCards');

const {
  getTransfers,
  approveTransfer,
  blockTransfer,
  holdTransfer,
  markSent,
  markCompleted,
  markFailed,
  rejectTransfer,
  unblockTransfer,
  removeTransferHold,
  setErrorMessage,
  notifyCustomer,
} = require('../controllers/adminTransfers');

const {
  sendPopup,
  emailCustomer,
  broadcast,
  getEmailLog,
  retryEmailNotification,
} = require('../controllers/adminNotifications');

const {
  getLoginHistory,
  getUserActivity,
  getAdminActivity,
  getAuditLogs,
} = require('../controllers/adminAudit');

const {
  generateCustomerHistory,
  generateCustomerHistoryStream,
} = require('../controllers/demoHistoryController');

const {
  getAdminDashboardStats,
  createAuditLog,
  // NEW functions from adminStore
  listPendingApplications,
  approveApplication: approveApp,
  rejectApplication: rejectApp,
  createAccount: createAccountAdmin,
  issueCard,
  approveTransfer: approveTransferAdmin,
  blockTransfer: blockTransferAdmin,
} = require('../utils/adminStore');

// Build JWT token for admin
const buildAdminToken = (user) => {
  const secret = process.env.JWT_SECRET || 'dev-secret';
  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
      firstName: user.first_name || user.firstName,
      lastName: user.last_name || user.lastName,
      role: user.role || 'admin',
    },
    secret,
    { expiresIn: '7d' }
  );
};

// ============================================================
// ADMIN AUTH
// ============================================================

// POST /api/admin/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const { rows } = await pool.query(
      "SELECT id, first_name, last_name, email, password_hash, role, is_active FROM users WHERE email = $1 AND role IN ('admin', 'super_admin')",
      [email]
    );

    if (rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid admin credentials' });
    }

    const user = rows[0];
    if (!user.is_active) {
      return res.status(401).json({ success: false, message: 'Admin account is deactivated' });
    }

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ success: false, message: 'Invalid admin credentials' });
    }

    const token = buildAdminToken(user);
    await createAuditLog({
      userId: user.id,
      action: 'login',
      entityType: 'auth',
      description: `Admin login: ${user.email}`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return res.json({
      success: true,
      message: 'Admin login successful',
      token,
      user: {
        id: user.id,
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Admin login error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ============================================================
// ALL ADMIN ROUTES BELOW REQUIRE AUTHENTICATION
// ============================================================

router.use(requireAdmin);

// ============================================================
// ADMIN DASHBOARD
// ============================================================

// GET /api/admin/dashboard
router.get('/dashboard', async (req, res) => {
  try {
    const stats = await getAdminDashboardStats();
    return res.json({ success: true, ...stats });
  } catch (error) {
    console.error('Admin dashboard error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================================
// CUSTOMER MANAGEMENT
// ============================================================

router.get('/customers', getCustomers);
router.get('/customers/:id', getCustomer);
router.put('/customers/:id', updateCustomer);
router.post('/customers/:id/activate', activateCustomer);
router.post('/customers/:id/deactivate', deactivateCustomer);
router.post('/customers/:id/suspend', suspendCustomer);
router.post('/customers/:id/reinstate', reinstateCustomer);
router.delete('/customers/:id', deleteCustomer);
router.get('/customers/:id/activity', getCustomerActivity);

// ============================================================
// DEMO FINANCIAL HISTORY GENERATION
// ============================================================
router.post('/customers/:id/generate-history', generateCustomerHistory);
router.post('/customers/:id/generate-history/stream', generateCustomerHistoryStream);

// ============================================================
// APPLICATION MANAGEMENT
// ============================================================
router.get('/applications', getApplications);
router.get('/applications/:id', getApplicationDetails);  // <-- NEW route
router.post('/applications/:id/approve', approveApplication);
router.post('/applications/:id/reject', rejectApplication);
router.post('/applications/:id/review', reviewApplication);
router.post('/customers/:id/send-email', sendCustomerEmail);
router.post('/customers/:id/credit-score', updateCreditScore);

// ============================================================
// FIX ENDPOINT – Fix user approval status for users approved by old buggy code
// ============================================================
router.post('/applications/fix-status/:userId', fixUserApprovalStatus);

// ============================================================
// ACCOUNT MANAGEMENT
// ============================================================

router.get('/accounts', getAccounts);
router.post('/accounts', createAccount);
router.put('/accounts/:id', updateAccount);
router.post('/accounts/:id/credit', creditAccount);
router.post('/accounts/:id/debit', debitAccount);
router.put('/accounts/:id/balance', editBalance);
router.post('/accounts/:id/activate', activateAccount);
router.post('/accounts/:id/deactivate', deactivateAccount);
router.post('/accounts/:id/close', closeAccount);
router.post('/accounts/:id/reopen', reopenAccount);
router.post('/accounts/:id/freeze', freezeAccount);
router.post('/accounts/:id/unfreeze', unfreezeAccount);
router.post('/accounts/:id/hold', holdAccount);
router.post('/accounts/:id/remove-hold', removeHold);
router.delete('/accounts/:id', deleteAccount);
router.get('/accounts/:id/transactions', getAccountTransactions);
router.get('/accounts/:id/details', getAccountDetails);
router.put('/accounts/:id/available-balance', adjustAvailableBalance);
router.put('/accounts/:id/ledger-balance', adjustLedgerBalance);

// ============================================================
// CARD MANAGEMENT
// ============================================================

router.get('/cards', getCards);
router.post('/cards/:id/activate', activateCard);
router.post('/cards/:id/deactivate', deactivateCard);
router.post('/cards/:id/block', blockCard);
router.post('/cards/:id/unblock', unblockCard);
router.put('/cards/:id/visibility', toggleVisibility);
router.post('/cards/:id/approve', approveCard);
router.post('/cards/:id/reject', rejectCard);
router.post('/cards/:id/replace', replaceCard);
router.post('/cards/:id/cancel', cancelCard);

// ============================================================
// TRANSFER MANAGEMENT
// ============================================================

router.get('/transfers', getTransfers);
router.post('/transfers/:id/approve', approveTransfer);
router.post('/transfers/:id/block', blockTransfer);
router.post('/transfers/:id/hold', holdTransfer);
router.post('/transfers/:id/reject', rejectTransfer);
router.post('/transfers/:id/unblock', unblockTransfer);
router.post('/transfers/:id/remove-hold', removeTransferHold);
router.post('/transfers/:id/mark-sent', markSent);
router.post('/transfers/:id/mark-completed', markCompleted);
router.post('/transfers/:id/mark-failed', markFailed);
router.post('/transfers/:id/error-message', setErrorMessage);
router.post('/transfers/:id/notify', notifyCustomer);

// ============================================================
// NOTIFICATIONS
// ============================================================

router.post('/notifications/popup', sendPopup);
router.post('/notifications/email', emailCustomer);
router.post('/notifications/broadcast', broadcast);
router.get('/notifications/email-log', getEmailLog);
router.post('/notifications/email/retry/:id', retryEmailNotification);

// ============================================================
// AUDIT & SECURITY
// ============================================================

router.get('/audit/login-history', getLoginHistory);
router.get('/audit/user-activity', getUserActivity);
router.get('/audit/admin-activity', getAdminActivity);
router.get('/audit/logs', getAuditLogs);

// ============================================================
// NEW ADMIN ENDPOINTS – Application Management (alternative paths)
// ============================================================

// GET /api/admin/applications/pending
router.get('/applications/pending', async (req, res) => {
  try {
    const applications = await listPendingApplications();
    return res.json({ success: true, applications });
  } catch (error) {
    console.error('List pending applications error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/admin/applications/:id/approve (already exists above, but keeping if needed)
// POST /api/admin/applications/:id/reject (already exists above)

// ============================================================
// NEW ADMIN ENDPOINTS – Account Creation (override existing)
// ============================================================

// POST /api/admin/accounts (override the existing one to use our admin-aware createAccount)
router.post('/accounts', async (req, res) => {
  const { userId, accountType, currency, initialBalance, routingNumber } = req.body;
  const adminId = req.userId;

  if (!userId) {
    return res.status(400).json({ success: false, message: 'userId is required' });
  }

  try {
    const account = await createAccountAdmin(userId, { accountType, currency, initialBalance, routingNumber }, adminId);
    return res.status(201).json({ success: true, message: 'Account created', account });
  } catch (error) {
    console.error('Create account error:', error);
    return res.status(400).json({ success: false, message: error.message });
  }
});

// ============================================================
// NEW ADMIN ENDPOINTS – Card Issuance
// ============================================================

// POST /api/admin/cards
router.post('/cards', async (req, res) => {
  const { userId, accountId, cardType, cardNetwork, cardholderName } = req.body;
  const adminId = req.userId;

  if (!userId || !accountId) {
    return res.status(400).json({ success: false, message: 'userId and accountId are required' });
  }

  try {
    const card = await issueCard(userId, accountId, { cardType, cardNetwork, cardholderName }, adminId);
    return res.status(201).json({ success: true, message: 'Card issued', card });
  } catch (error) {
    console.error('Issue card error:', error);
    return res.status(400).json({ success: false, message: error.message });
  }
});

// ============================================================
// NEW ADMIN ENDPOINTS – Transfer Control (override existing)
// ============================================================

// POST /api/admin/transfers/:id/approve
router.post('/transfers/:id/approve', async (req, res) => {
  const { id } = req.params;
  const adminId = req.userId;
  try {
    const transfer = await approveTransferAdmin(id, adminId);
    return res.json({ success: true, message: 'Transfer approved', transfer });
  } catch (error) {
    console.error('Approve transfer error:', error);
    return res.status(400).json({ success: false, message: error.message });
  }
});

// POST /api/admin/transfers/:id/block
router.post('/transfers/:id/block', async (req, res) => {
  const { id } = req.params;
  const adminId = req.userId;
  try {
    const transfer = await blockTransferAdmin(id, adminId);
    return res.json({ success: true, message: 'Transfer blocked', transfer });
  } catch (error) {
    console.error('Block transfer error:', error);
    return res.status(400).json({ success: false, message: error.message });
  }
});

module.exports = router;