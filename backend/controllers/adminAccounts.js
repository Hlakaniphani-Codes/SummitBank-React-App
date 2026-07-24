const {
  listAllAccounts,
  createAccount,
  updateAccount,
  setAccountStatus,
  deleteAccount,
  getAccountTransactions,
  creditAccount,
  debitAccount,
  setAccountBalance,
  setAccountHold,
  getAccountDetails,
  adjustAvailableBalance,
  adjustLedgerBalance,
  createAuditLog,
} = require('../utils/adminStore');

// GET /api/admin/accounts
exports.getAccounts = async (req, res) => {
  const { search, status, type } = req.query;
  try {
    const accounts = await listAllAccounts({ search, status, type });
    return res.json({ success: true, accounts });
  } catch (error) {
    console.error('List accounts error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/admin/accounts
exports.createAccount = async (req, res) => {
  const { userId, accountType, currency, initialBalance, routingNumber } = req.body;
  const adminId = req.userId;

  if (!userId) {
    return res.status(400).json({ success: false, message: 'userId is required' });
  }

  try {
    const account = await createAccount(userId, { accountType, currency, initialBalance, routingNumber });
    await createAuditLog({
      adminId,
      action: 'create',
      entityType: 'account',
      entityId: account.id,
      description: `Created ${account.account_type} account #${account.account_number} for user ${userId}`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    return res.status(201).json({ success: true, message: 'Account created', account });
  } catch (error) {
    console.error('Create account error:', error);
    return res.status(400).json({ success: false, message: error.message });
  }
};

// PUT /api/admin/accounts/:id
exports.updateAccount = async (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  const adminId = req.userId;

  try {
    const account = await updateAccount(id, updates);
    await createAuditLog({
      adminId,
      action: 'update',
      entityType: 'account',
      entityId: Number(id),
      description: `Updated account #${id} details`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    return res.json({ success: true, message: 'Account updated', account });
  } catch (error) {
    console.error('Update account error:', error);
    return res.status(400).json({ success: false, message: error.message });
  }
};

// POST /api/admin/accounts/:id/credit
exports.creditAccount = async (req, res) => {
  const { id } = req.params;
  const { amount, description } = req.body;
  const adminId = req.userId;

  if (!amount || amount <= 0) {
    return res.status(400).json({ success: false, message: 'Valid amount is required' });
  }

  try {
    const result = await creditAccount(id, amount, description || 'Admin credit', adminId);
    await createAuditLog({
      adminId,
      action: 'credit',
      entityType: 'account',
      entityId: Number(id),
      description: `Credited $${amount} to account #${id}`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    return res.json({ success: true, message: 'Account credited', ...result });
  } catch (error) {
    console.error('Credit account error:', error);
    return res.status(400).json({ success: false, message: error.message });
  }
};

// POST /api/admin/accounts/:id/debit
exports.debitAccount = async (req, res) => {
  const { id } = req.params;
  const { amount, description } = req.body;
  const adminId = req.userId;

  if (!amount || amount <= 0) {
    return res.status(400).json({ success: false, message: 'Valid amount is required' });
  }

  try {
    const result = await debitAccount(id, amount, description || 'Admin debit', adminId);
    await createAuditLog({
      adminId,
      action: 'debit',
      entityType: 'account',
      entityId: Number(id),
      description: `Debited $${amount} from account #${id}`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    return res.json({ success: true, message: 'Account debited', ...result });
  } catch (error) {
    console.error('Debit account error:', error);
    return res.status(400).json({ success: false, message: error.message });
  }
};

// PUT /api/admin/accounts/:id/balance
exports.editBalance = async (req, res) => {
  const { id } = req.params;
  const { newBalance } = req.body;
  const adminId = req.userId;

  if (newBalance === undefined || newBalance < 0) {
    return res.status(400).json({ success: false, message: 'Valid new balance is required' });
  }

  try {
    const result = await setAccountBalance(id, newBalance, adminId);
    await createAuditLog({
      adminId,
      action: 'update',
      entityType: 'account',
      entityId: Number(id),
      description: `Adjusted account #${id} balance from $${result.oldBalance} to $${result.newBalance}`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    return res.json({ success: true, message: 'Balance updated', ...result });
  } catch (error) {
    console.error('Edit balance error:', error);
    return res.status(400).json({ success: false, message: error.message });
  }
};

// POST /api/admin/accounts/:id/activate
exports.activateAccount = async (req, res) => {
  const { id } = req.params;
  const adminId = req.userId;

  try {
    const account = await setAccountStatus(id, 'active');
    await createAuditLog({
      adminId,
      action: 'activate',
      entityType: 'account',
      entityId: Number(id),
      description: `Activated account #${id} (${account.account_number})`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    return res.json({ success: true, message: 'Account activated', account });
  } catch (error) {
    console.error('Activate account error:', error);
    return res.status(400).json({ success: false, message: error.message });
  }
};

// POST /api/admin/accounts/:id/deactivate
exports.deactivateAccount = async (req, res) => {
  const { id } = req.params;
  const adminId = req.userId;

  try {
    const account = await setAccountStatus(id, 'inactive');
    await createAuditLog({
      adminId,
      action: 'deactivate',
      entityType: 'account',
      entityId: Number(id),
      description: `Deactivated account #${id} (${account.account_number})`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    return res.json({ success: true, message: 'Account deactivated', account });
  } catch (error) {
    console.error('Deactivate account error:', error);
    return res.status(400).json({ success: false, message: error.message });
  }
};

// POST /api/admin/accounts/:id/close
exports.closeAccount = async (req, res) => {
  const { id } = req.params;
  const adminId = req.userId;

  try {
    const account = await setAccountStatus(id, 'closed');
    await createAuditLog({
      adminId,
      action: 'deactivate',
      entityType: 'account',
      entityId: Number(id),
      description: `Closed account #${id} (${account.account_number})`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    return res.json({ success: true, message: 'Account closed', account });
  } catch (error) {
    console.error('Close account error:', error);
    return res.status(400).json({ success: false, message: error.message });
  }
};

// POST /api/admin/accounts/:id/reopen
exports.reopenAccount = async (req, res) => {
  const { id } = req.params;
  const adminId = req.userId;

  try {
    const account = await setAccountStatus(id, 'active');
    await createAuditLog({
      adminId,
      action: 'activate',
      entityType: 'account',
      entityId: Number(id),
      description: `Reopened account #${id} (${account.account_number})`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    return res.json({ success: true, message: 'Account reopened', account });
  } catch (error) {
    console.error('Reopen account error:', error);
    return res.status(400).json({ success: false, message: error.message });
  }
};

// POST /api/admin/accounts/:id/freeze
exports.freezeAccount = async (req, res) => {
  const { id } = req.params;
  const adminId = req.userId;

  try {
    const account = await setAccountStatus(id, 'frozen');
    await createAuditLog({
      adminId,
      action: 'block',
      entityType: 'account',
      entityId: Number(id),
      description: `Froze account #${id} (${account.account_number})`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    return res.json({ success: true, message: 'Account frozen', account });
  } catch (error) {
    console.error('Freeze account error:', error);
    return res.status(400).json({ success: false, message: error.message });
  }
};

// POST /api/admin/accounts/:id/unfreeze
exports.unfreezeAccount = async (req, res) => {
  const { id } = req.params;
  const adminId = req.userId;

  try {
    const account = await setAccountStatus(id, 'active');
    await createAuditLog({
      adminId,
      action: 'activate',
      entityType: 'account',
      entityId: Number(id),
      description: `Unfroze account #${id} (${account.account_number})`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    return res.json({ success: true, message: 'Account unfrozen', account });
  } catch (error) {
    console.error('Unfreeze account error:', error);
    return res.status(400).json({ success: false, message: error.message });
  }
};

// POST /api/admin/accounts/:id/hold
exports.holdAccount = async (req, res) => {
  const { id } = req.params;
  const adminId = req.userId;

  try {
    const result = await setAccountHold(id, true);
    await createAuditLog({
      adminId,
      action: 'hold',
      entityType: 'account',
      entityId: Number(id),
      description: `Placed account #${id} (${result.account_number}) on hold`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    return res.json({ success: true, message: 'Account placed on hold', account: result });
  } catch (error) {
    console.error('Hold account error:', error);
    return res.status(400).json({ success: false, message: error.message });
  }
};

// POST /api/admin/accounts/:id/remove-hold
exports.removeHold = async (req, res) => {
  const { id } = req.params;
  const adminId = req.userId;

  try {
    const result = await setAccountHold(id, false);
    await createAuditLog({
      adminId,
      action: 'unhold',
      entityType: 'account',
      entityId: Number(id),
      description: `Removed hold from account #${id} (${result.account_number})`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    return res.json({ success: true, message: 'Hold removed from account', account: result });
  } catch (error) {
    console.error('Remove hold error:', error);
    return res.status(400).json({ success: false, message: error.message });
  }
};

// DELETE /api/admin/accounts/:id
exports.deleteAccount = async (req, res) => {
  const { id } = req.params;
  const adminId = req.userId;

  try {
    const result = await deleteAccount(id);
    await createAuditLog({
      adminId,
      action: 'delete',
      entityType: 'account',
      entityId: Number(id),
      description: `Deleted account #${id}`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    return res.json({ success: true, message: 'Account deleted', ...result });
  } catch (error) {
    console.error('Delete account error:', error);
    return res.status(400).json({ success: false, message: error.message });
  }
};

// GET /api/admin/accounts/:id/transactions
exports.getAccountTransactions = async (req, res) => {
  const { id } = req.params;
  const { type, startDate, endDate } = req.query;

  try {
    const transactions = await getAccountTransactions(id, { type, startDate, endDate });
    return res.json({ success: true, transactions });
  } catch (error) {
    console.error('Get account transactions error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/admin/accounts/:id/details
exports.getAccountDetails = async (req, res) => {
  const { id } = req.params;

  try {
    const details = await getAccountDetails(id);
    return res.json({ success: true, details });
  } catch (error) {
    console.error('Get account details error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// PUT /api/admin/accounts/:id/available-balance
exports.adjustAvailableBalance = async (req, res) => {
  const { id } = req.params;
  const { newBalance } = req.body;
  const adminId = req.userId;

  if (newBalance === undefined || newBalance < 0) {
    return res.status(400).json({ success: false, message: 'Valid new balance is required' });
  }

  try {
    const result = await adjustAvailableBalance(id, newBalance, adminId);
    await createAuditLog({
      adminId,
      action: 'update',
      entityType: 'account',
      entityId: Number(id),
      description: `Adjusted available balance from $${result.oldBalance} to $${result.newBalance}`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    return res.json({ success: true, message: 'Available balance adjusted', ...result });
  } catch (error) {
    console.error('Adjust available balance error:', error);
    return res.status(400).json({ success: false, message: error.message });
  }
};

// PUT /api/admin/accounts/:id/ledger-balance
exports.adjustLedgerBalance = async (req, res) => {
  const { id } = req.params;
  const { newBalance } = req.body;
  const adminId = req.userId;

  if (newBalance === undefined || newBalance < 0) {
    return res.status(400).json({ success: false, message: 'Valid new balance is required' });
  }

  try {
    const result = await adjustLedgerBalance(id, newBalance, adminId);
    await createAuditLog({
      adminId,
      action: 'update',
      entityType: 'account',
      entityId: Number(id),
      description: `Adjusted ledger balance from $${result.oldBalance} to $${result.newBalance}`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    return res.json({ success: true, message: 'Ledger balance adjusted', ...result });
  } catch (error) {
    console.error('Adjust ledger balance error:', error);
    return res.status(400).json({ success: false, message: error.message });
  }
};
