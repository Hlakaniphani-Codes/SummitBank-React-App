 const pool = require('../config/db');
const crypto = require('crypto');
const { sendProfileApprovedEmail, sendAdminActionEmail } = require('../services/emailService');
const { emitToUser, emitToAdmins, emitToAll, emitBalanceUpdate, emitNotification, emitTransaction } = require('../services/eventEmitter');

// ============================================================
// AUDIT LOGGING
// ============================================================
const createAuditLog = async ({ userId = null, adminId = null, action, entityType, entityId = null, description = '', metadata = {}, ipAddress = '', userAgent = '' }) => {
  const result = await pool.query(
    `INSERT INTO audit_logs (user_id, admin_id, action, entity_type, entity_id, description, metadata, ip_address, user_agent)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
    [userId, adminId, action, entityType, entityId, description, JSON.stringify(metadata), ipAddress, userAgent]
  );
  return { id: result.rows[0].id };
};

// ============================================================
// ADMIN DASHBOARD STATS
// ============================================================
const getAdminDashboardStats = async () => {
  const [customerCount, appCount, transferCount, cardReqCount, accountCount] = await Promise.all([
    pool.query("SELECT COUNT(*) AS count FROM users WHERE role = 'customer'"),
    pool.query("SELECT COUNT(*) AS count FROM applications WHERE status = 'pending'"),
    pool.query("SELECT COUNT(*) AS count FROM wire_transfers WHERE status = 'pending'"),
    pool.query("SELECT COUNT(*) AS count FROM cards WHERE status = 'pending'"),
    pool.query('SELECT COUNT(*) AS count FROM accounts'),
  ]);

  const recentLogs = await pool.query(
    `SELECT al.*, u.first_name, u.last_name, u.email
     FROM audit_logs al
     LEFT JOIN users u ON u.id = al.admin_id
     ORDER BY al.created_at DESC
     LIMIT 20`
  );

  return {
    totalCustomers: Number(customerCount.rows[0]?.count || 0),
    pendingApplications: Number(appCount.rows[0]?.count || 0),
    pendingTransfers: Number(transferCount.rows[0]?.count || 0),
    pendingCardRequests: Number(cardReqCount.rows[0]?.count || 0),
    totalAccounts: Number(accountCount.rows[0]?.count || 0),
    recentActivity: recentLogs.rows,
  };
};

// ============================================================
// CUSTOMER MANAGEMENT
// ============================================================
const listCustomers = async (filters = {}) => {
  let sql = "SELECT id, first_name, last_name, email, phone, is_active, email_verified, role, created_at, last_login_at, status, login_enabled, credit_score FROM users WHERE role = 'customer'";
  const params = [];
  let idx = 1;

  if (filters.search) {
    sql += ` AND (first_name ILIKE $${idx} OR last_name ILIKE $${idx} OR email ILIKE $${idx} OR phone ILIKE $${idx})`;
    params.push(`%${filters.search}%`);
    idx++;
  }

  if (filters.status) {
    if (filters.status === 'active') {
      sql += ' AND is_active = true';
    } else if (filters.status === 'inactive') {
      sql += ' AND is_active = false';
    }
  }

  sql += ' ORDER BY created_at DESC LIMIT 100';
  const result = await pool.query(sql, params);
  return result.rows;
};

const getCustomerDetails = async (customerId) => {
  const customer = await pool.query(
    "SELECT id, first_name, middle_name, last_name, date_of_birth, email, phone, street, apartment, city, state, zip, country, occupation, employer, income_range, source_of_funds, doc_type, email_verified, phone_verified, is_active, role, status, login_enabled, created_at, updated_at, last_login_at FROM users WHERE id = $1",
    [customerId]
  );
  if (customer.rows.length === 0) return null;

  const [accounts, cards, transactions, applications, notifications] = await Promise.all([
    pool.query('SELECT id, account_number, account_type, currency, balance, routing_number, status, created_at FROM accounts WHERE user_id = $1 ORDER BY created_at DESC', [customerId]),
    pool.query('SELECT id, card_type, card_network, last4, expiry_month, expiry_year, status, is_visible, created_at FROM cards WHERE user_id = $1 ORDER BY created_at DESC', [customerId]),
    pool.query('SELECT transaction_id, amount, description, type, status, transaction_date, created_at FROM transactions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20', [customerId]),
    pool.query('SELECT id, application_type, status, reviewed_by, reviewed_at, review_notes, created_at FROM applications WHERE user_id = $1 ORDER BY created_at DESC', [customerId]),
    pool.query('SELECT id, title, description, is_read, created_at FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 10', [customerId]),
  ]);

  return {
    ...customer.rows[0],
    accounts: accounts.rows,
    cards: cards.rows,
    transactions: transactions.rows,
    applications: applications.rows,
    notifications: notifications.rows,
  };
};

// ============================================================
// APPLICATION MANAGEMENT – NEW
// ============================================================
const listPendingApplications = async () => {
  const result = await pool.query(
    `SELECT a.*, u.first_name, u.last_name, u.email, u.phone, u.created_at as user_created
     FROM applications a
     JOIN users u ON u.id = a.user_id
     WHERE a.status = 'pending'
     ORDER BY a.created_at ASC`
  );
  return result.rows;
};

const approveApplication = async (applicationId, adminId, notes = '') => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // First, try to get the application regardless of its current status
    const appCheck = await client.query(
      `SELECT id, user_id, application_type, status FROM applications WHERE id = $1`,
      [applicationId]
    );
    if (appCheck.rows.length === 0) throw new Error('Application not found');
    
    const app = appCheck.rows[0];
    const { user_id } = app;

    // Update application status (works even if already approved)
    await client.query(
      `UPDATE applications
       SET status = 'approved', reviewed_by = $1, reviewed_at = CURRENT_TIMESTAMP, review_notes = $2
       WHERE id = $3`,
      [adminId, notes, applicationId]
    );

    // CRITICAL: Update user record (this is what was missing before!)
    await client.query(
      `UPDATE users
       SET status = 'approved', login_enabled = true, is_active = true,
           approved_by = $1, approved_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [adminId, user_id]
    );

    // Create notification
    await client.query(
      `INSERT INTO notifications (user_id, title, description)
       VALUES ($1, 'Application Approved', 'Your application has been approved. You can now log in and start banking.')`,
      [user_id]
    );

    await client.query('COMMIT');

    const approvedCustomer = await getCustomerDetails(user_id);
    if (approvedCustomer) {
      await sendProfileApprovedEmail(approvedCustomer, {
        userId: user_id,
        eventType: 'profile_approved',
        referenceId: applicationId,
      });
    }

    // Emit real-time notification to the user
    emitToUser(user_id, 'new-notification', {
      id: Date.now(),
      title: 'Application Approved',
      description: 'Your application has been approved. You can now log in and start banking.',
      is_read: false,
      created_at: new Date().toISOString()
    });
    
    return { userId: user_id, applicationId, status: 'approved' };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

const rejectApplication = async (applicationId, adminId, reason = '') => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // First, get the application regardless of its current status
    const appCheck = await client.query(
      `SELECT id, user_id, application_type, status FROM applications WHERE id = $1`,
      [applicationId]
    );
    if (appCheck.rows.length === 0) throw new Error('Application not found');
    
    const { user_id } = appCheck.rows[0];

    // Update application status
    await client.query(
      `UPDATE applications
       SET status = 'rejected', reviewed_by = $1, reviewed_at = CURRENT_TIMESTAMP, review_notes = $2
       WHERE id = $3`,
      [adminId, reason, applicationId]
    );

    // Update user
    await client.query(
      `UPDATE users SET status = 'rejected', rejected_reason = $1 WHERE id = $2`,
      [reason, user_id]
    );

    // Create notification
    await client.query(
      `INSERT INTO notifications (user_id, title, description)
       VALUES ($1, 'Application Not Approved', 'We regret to inform you that your application was not approved at this time.')`,
      [user_id]
    );

    await client.query('COMMIT');
    
    // Emit real-time notification to the user
    emitToUser(user_id, 'new-notification', {
      id: Date.now(),
      title: 'Application Not Approved',
      description: 'We regret to inform you that your application was not approved at this time.',
      is_read: false,
      created_at: new Date().toISOString()
    });
    
    return { userId: user_id, applicationId, status: 'rejected' };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

// ============================================================
// ACCOUNT MANAGEMENT – ADMIN ONLY (with audit)
// ============================================================
const createAccount = async (userId, accountData, adminId) => {
  const { accountType = 'checking', currency = 'USD', initialBalance = 0, routingNumber = '' } = accountData;
  const accountNumber = `ACCT-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const userCheck = await client.query('SELECT id FROM users WHERE id = $1', [userId]);
    if (userCheck.rows.length === 0) throw new Error('User not found');

    const result = await client.query(
      `INSERT INTO accounts (user_id, account_number, account_type, currency, balance, routing_number, status, opened_at)
       VALUES ($1, $2, $3, $4, $5, $6, 'active', CURRENT_DATE)
       RETURNING id, account_number, account_type, balance, currency, status, created_at`,
      [userId, accountNumber, accountType, currency, Number(initialBalance), routingNumber]
    );

    await createAuditLog({
      adminId,
      action: 'create',
      entityType: 'account',
      entityId: result.rows[0].id,
      description: `Created ${accountType} account #${result.rows[0].account_number} for user ${userId}`,
    });

    await client.query('COMMIT');

    const customer = await getCustomerDetails(userId);
    if (customer) {
      await sendAdminActionEmail(customer, 'Account Created', `A new ${accountType} account has been created on your behalf.`, {
        'Account Number': result.rows[0].account_number,
        'Account Type': result.rows[0].account_type,
        'Currency': result.rows[0].currency,
        'Opening Balance': `$${Number(result.rows[0].balance || 0).toFixed(2)}`,
        'Routing Number': result.rows[0].routing_number || 'Not provided',
      }, {
        userId,
        eventType: 'account_created',
        referenceId: result.rows[0].id,
      });
    }

    return result.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

const updateAccount = async (accountId, updates) => {
  const allowedFields = ['account_type', 'currency', 'routing_number'];
  const fields = [];
  const values = [];
  let idx = 1;

  for (const [key, value] of Object.entries(updates)) {
    if (allowedFields.includes(key) && value !== undefined) {
      fields.push(`${key} = $${idx}`);
      values.push(value);
      idx++;
    }
  }

  if (fields.length === 0) throw new Error('No valid fields to update');

  values.push(accountId);
  const result = await pool.query(
    `UPDATE accounts SET ${fields.join(', ')} WHERE id = $${idx} RETURNING id, account_number, account_type, balance, currency, routing_number, status`,
    values
  );
  if (result.rows.length === 0) throw new Error('Account not found');
  return result.rows[0];
};

const setAccountStatus = async (accountId, status, adminId) => {
  const allowed = ['active', 'inactive', 'closed', 'frozen'];
  if (!allowed.includes(status)) throw new Error(`Invalid status: ${status}`);

  const result = await pool.query(
    'UPDATE accounts SET status = $1 WHERE id = $2 RETURNING id, account_number, status',
    [status, accountId]
  );
  if (result.rows.length === 0) throw new Error('Account not found');

  await createAuditLog({
    adminId,
    action: 'update',
    entityType: 'account',
    entityId: accountId,
    description: `Set account #${accountId} status to ${status}`,
  });

  // Emit real-time notification to the account owner
  const accountOwner = await pool.query('SELECT user_id FROM accounts WHERE id = $1', [accountId]);
  if (accountOwner.rows.length > 0) {
    const ownerId = accountOwner.rows[0].user_id;
    const customer = await getCustomerDetails(ownerId);
    if (customer) {
      await sendAdminActionEmail(customer, `Account ${status.charAt(0).toUpperCase() + status.slice(1)}`, `Your account #${result.rows[0].account_number} has been ${status} by SummitShares.`, {
        'Account Number': result.rows[0].account_number,
        'Status': status,
        'Updated At': new Date().toISOString(),
      }, {
        userId: ownerId,
        eventType: `account_status_${status}`,
        referenceId: accountId,
      });
    }

    emitToUser(ownerId, 'new-notification', {
      id: Date.now(),
      title: `Account ${status.charAt(0).toUpperCase() + status.slice(1)}`,
      description: `Your account #${result.rows[0].account_number} has been ${status} by SummitShares.`,
      is_read: false,
      created_at: new Date().toISOString()
    });
    emitToUser(ownerId, 'account-update', { accountId, status, accountNumber: result.rows[0].account_number });
  }

  return result.rows[0];
};

const setAccountHold = async (accountId, hold, adminId) => {
  const status = hold ? 'inactive' : 'active';
  const result = await pool.query(
    'UPDATE accounts SET status = $1 WHERE id = $2 RETURNING id, account_number, status',
    [status, accountId]
  );
  if (result.rows.length === 0) throw new Error('Account not found');

  await createAuditLog({
    adminId,
    action: hold ? 'hold' : 'unhold',
    entityType: 'account',
    entityId: accountId,
    description: `${hold ? 'Placed' : 'Removed'} hold on account #${accountId}`,
  });

  // Emit real-time notification to the account owner
  const accountOwner2 = await pool.query('SELECT user_id FROM accounts WHERE id = $1', [accountId]);
  if (accountOwner2.rows.length > 0) {
    const ownerId = accountOwner2.rows[0].user_id;
    const customer = await getCustomerDetails(ownerId);
    if (customer) {
      await sendAdminActionEmail(customer, hold ? 'Account on Hold' : 'Account Hold Removed', hold
        ? `Your account #${result.rows[0].account_number} has been placed on hold by SummitShares.`
        : `The hold on account #${result.rows[0].account_number} has been removed.`, {
          'Account Number': result.rows[0].account_number,
          'Status': hold ? 'On Hold' : 'Active',
          'Updated At': new Date().toISOString(),
        });
    }

    emitToUser(ownerId, 'new-notification', {
      id: Date.now(),
      title: hold ? 'Account on Hold' : 'Hold Removed',
      description: hold
        ? `Your account #${result.rows[0].account_number} has been placed on hold by SummitShares.`
        : `The hold on account #${result.rows[0].account_number} has been removed.`,
      is_read: false,
      created_at: new Date().toISOString()
    });
  }

  return result.rows[0];
};

const setAccountBalance = async (accountId, newBalance, adminId) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const account = await client.query('SELECT id, user_id, balance FROM accounts WHERE id = $1 FOR UPDATE', [accountId]);
    if (account.rows.length === 0) throw new Error('Account not found');
    const oldBalance = Number(account.rows[0].balance);
    const amount = Number(newBalance) - oldBalance;

    await client.query('UPDATE accounts SET balance = $1 WHERE id = $2', [newBalance, accountId]);

    if (amount !== 0) {
      const txId = `ADJ-${crypto.randomUUID().slice(0, 8)}`;
      await client.query(
        `INSERT INTO transactions (transaction_id, user_id, account_id, amount, description, type, balance_after, status, transaction_date)
         VALUES ($1, $2, $3, $4, 'Admin balance adjustment', 'credit', $5, 'completed', CURRENT_DATE)`,
        [txId, account.rows[0].user_id, accountId, amount, newBalance]
      );
    }

    await createAuditLog({
      adminId,
      action: 'update',
      entityType: 'account',
      entityId: accountId,
      description: `Adjusted balance from ${oldBalance} to ${newBalance}`,
    });

    await client.query('COMMIT');

    // Emit real-time balance update and notification to the user
    const balUserId = account.rows[0].user_id;
    const balAccounts = await pool.query('SELECT id, account_number, account_type, balance, routing_number, apy FROM accounts WHERE user_id = $1', [balUserId]);
    emitToUser(balUserId, 'balance-update', { accounts: balAccounts.rows });
    if (amount !== 0) {
      emitToUser(balUserId, 'new-notification', {
        id: Date.now(),
        title: 'Balance Adjusted',
        description: `Your account balance has been adjusted from $${oldBalance.toFixed(2)} to $${Number(newBalance).toFixed(2)}.`,
        is_read: false,
        created_at: new Date().toISOString()
      });
    }

    return { oldBalance, newBalance: Number(newBalance) };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

// ============================================================
// CARD MANAGEMENT – ADMIN ONLY
// ============================================================
const issueCard = async (userId, accountId, cardData, adminId) => {
  const { cardType = 'debit', cardNetwork = 'visa', cardholderName = null } = cardData;

  let holderName = cardholderName;
  if (!holderName) {
    const user = await pool.query('SELECT first_name, last_name FROM users WHERE id = $1', [userId]);
    if (user.rows.length === 0) throw new Error('User not found');
    holderName = `${user.rows[0].first_name} ${user.rows[0].last_name}`.trim();
  }

  const last4 = String(Math.floor(1000 + Math.random() * 9000));
  const expiryMonth = 12;
  const expiryYear = new Date().getFullYear() + 3;

  const result = await pool.query(
    `INSERT INTO cards (user_id, account_id, card_type, card_network, last4, expiry_month, expiry_year, cardholder_name, status, is_visible)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'active', true)
     RETURNING id, last4, card_type, card_network, status`,
    [userId, accountId, cardType, cardNetwork, last4, expiryMonth, expiryYear, holderName]
  );

  await createAuditLog({
    adminId,
    action: 'create',
    entityType: 'card',
    entityId: result.rows[0].id,
    description: `Issued ${cardType} card ending in ${last4} for user ${userId}`,
  });

  const customer = await getCustomerDetails(userId);
  if (customer) {
    await sendAdminActionEmail(customer, 'New Card Issued', `A new ${cardType} card ending in ${last4} has been issued to your account.`, {
      'Card Type': cardType,
      'Card Network': cardNetwork,
      'Last 4': last4,
      'Expiry': `${expiryMonth}/${expiryYear}`,
      'Cardholder': holderName,
    }, {
      userId,
      eventType: 'card_issued',
      referenceId: result.rows[0].id,
    });
  }

  // Emit real-time notification to the user
  emitToUser(userId, 'new-notification', {
    id: Date.now(),
    title: 'New Card Issued',
    description: `A new ${cardType} card ending in ${last4} has been issued to your account.`,
    is_read: false,
    created_at: new Date().toISOString()
  });
  emitToUser(userId, 'card-update', {
    id: result.rows[0].id,
    last4: result.rows[0].last4,
    card_type: result.rows[0].card_type,
    card_network: result.rows[0].card_network,
    status: result.rows[0].status
  });

  return result.rows[0];
};

const setCardStatus = async (cardId, status, adminId) => {
  const allowed = ['active', 'blocked', 'expired', 'cancelled'];
  if (!allowed.includes(status)) throw new Error(`Invalid status: ${status}`);

  const result = await pool.query(
    'UPDATE cards SET status = $1 WHERE id = $2 RETURNING id, last4, status',
    [status, cardId]
  );
  if (result.rows.length === 0) throw new Error('Card not found');

  await createAuditLog({
    adminId,
    action: 'update',
    entityType: 'card',
    entityId: cardId,
    description: `Set card status to ${status}`,
  });

  // Emit real-time notification to the card owner
  const cardOwner = await pool.query('SELECT user_id FROM cards WHERE id = $1', [cardId]);
  if (cardOwner.rows.length > 0) {
    const ownerId = cardOwner.rows[0].user_id;
    const customer = await getCustomerDetails(ownerId);
    if (customer) {
      await sendAdminActionEmail(customer, `Card ${status.charAt(0).toUpperCase() + status.slice(1)}`, `Your card ending in ${result.rows[0].last4} has been ${status} by SummitShares.`, {
        'Last 4': result.rows[0].last4,
        'Status': status,
      }, {
        userId: ownerId,
        eventType: `card_status_${status}`,
        referenceId: cardId,
      });
    }

    emitToUser(ownerId, 'new-notification', {
      id: Date.now(),
      title: `Card ${status.charAt(0).toUpperCase() + status.slice(1)}`,
      description: `Your card ending in ${result.rows[0].last4} has been ${status} by SummitShares.`,
      is_read: false,
      created_at: new Date().toISOString()
    });
    emitToUser(ownerId, 'card-update', {
      id: cardId,
      last4: result.rows[0].last4,
      status
    });
  }

  return result.rows[0];
};

// ============================================================
// TRANSFER CONTROL – ADMIN
// ============================================================
const approveTransfer = async (transferId, adminId) => {
  const result = await pool.query(
    `UPDATE wire_transfers SET status = 'approved', reviewed_by = $1, reviewed_at = CURRENT_TIMESTAMP
     WHERE id = $2 AND status = 'pending' RETURNING id, status`,
    [adminId, transferId]
  );
  if (result.rows.length === 0) throw new Error('Transfer not found or not pending');

  await createAuditLog({
    adminId,
    action: 'approve',
    entityType: 'wire_transfer',
    entityId: transferId,
    description: `Approved transfer #${transferId}`,
  });

  return result.rows[0];
};

const blockTransfer = async (transferId, adminId) => {
  const result = await pool.query(
    `UPDATE wire_transfers SET status = 'blocked', reviewed_by = $1, reviewed_at = CURRENT_TIMESTAMP
     WHERE id = $2 AND status IN ('pending', 'approved') RETURNING id, status`,
    [adminId, transferId]
  );
  if (result.rows.length === 0) throw new Error('Transfer not found or cannot be blocked');

  await createAuditLog({
    adminId,
    action: 'block',
    entityType: 'wire_transfer',
    entityId: transferId,
    description: `Blocked transfer #${transferId}`,
  });

  return result.rows[0];
};

// ============================================================
// OTHER EXISTING FUNCTIONS (keep as is)
// ============================================================
// (These were already in your adminStore.js – we include them for completeness)
const listAllAccounts = async (filters = {}) => {
  let sql = `SELECT a.*, u.first_name, u.last_name, u.email 
             FROM accounts a 
             JOIN users u ON u.id = a.user_id 
             WHERE 1=1`;
  const params = [];
  let idx = 1;

  if (filters.search) {
    sql += ` AND (u.first_name ILIKE $${idx} OR u.last_name ILIKE $${idx} OR u.email ILIKE $${idx} OR a.account_number ILIKE $${idx})`;
    params.push(`%${filters.search}%`);
    idx++;
  }

  if (filters.status) {
    sql += ` AND a.status = $${idx}`;
    params.push(filters.status);
    idx++;
  }

  if (filters.type) {
    sql += ` AND a.account_type = $${idx}`;
    params.push(filters.type);
    idx++;
  }

  sql += ' ORDER BY a.created_at DESC LIMIT 100';
  const result = await pool.query(sql, params);
  return result.rows;
};

const creditAccount = async (accountId, amount, description, adminId) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const account = await client.query('SELECT id, user_id, balance FROM accounts WHERE id = $1 FOR UPDATE', [accountId]);
    if (account.rows.length === 0) throw new Error('Account not found');
    const newBalance = Number(account.rows[0].balance) + Number(amount);
    await client.query('UPDATE accounts SET balance = $1 WHERE id = $2', [newBalance, accountId]);
    const txId = `ADM-CR-${crypto.randomUUID().slice(0, 8)}`;
    await client.query(
      `INSERT INTO transactions (transaction_id, user_id, account_id, amount, description, type, balance_after, status, transaction_date)
       VALUES ($1, $2, $3, $4, $5, 'credit', $6, 'completed', CURRENT_DATE)`,
      [txId, account.rows[0].user_id, accountId, Number(amount), description || 'Admin credit', newBalance]
    );
    await client.query('COMMIT');
    
    // Emit real-time updates to the account owner
    emitToUser(account.rows[0].user_id, 'balance-update', { accounts: [{
      id: accountId,
      balance: newBalance
    }]});
    emitToUser(account.rows[0].user_id, 'new-transaction', {
      transaction_id: txId,
      amount: Number(amount),
      type: 'credit',
      status: 'completed',
      description: description || 'Admin credit',
      transaction_date: new Date().toISOString().slice(0, 10)
    });
    emitToUser(account.rows[0].user_id, 'new-notification', {
      id: Date.now(),
      title: 'Account Credited',
      description: `$${Number(amount).toFixed(2)} has been credited to your account by SummitShares.`,
      is_read: false,
      created_at: new Date().toISOString()
    });

    return { transactionId: txId, newBalance };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

const debitAccount = async (accountId, amount, description, adminId) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const account = await client.query('SELECT id, user_id, balance FROM accounts WHERE id = $1 FOR UPDATE', [accountId]);
    if (account.rows.length === 0) throw new Error('Account not found');
    const currentBalance = Number(account.rows[0].balance);
    if (currentBalance < Number(amount)) throw new Error('Insufficient balance');
    const newBalance = currentBalance - Number(amount);
    await client.query('UPDATE accounts SET balance = $1 WHERE id = $2', [newBalance, accountId]);
    const txId = `ADM-DR-${crypto.randomUUID().slice(0, 8)}`;
    await client.query(
      `INSERT INTO transactions (transaction_id, user_id, account_id, amount, description, type, balance_after, status, transaction_date)
       VALUES ($1, $2, $3, $4, $5, 'debit', $6, 'completed', CURRENT_DATE)`,
      [txId, account.rows[0].user_id, accountId, -Number(amount), description || 'Admin debit', newBalance]
    );
    await client.query('COMMIT');
    
    // Emit real-time updates to the account owner
    emitToUser(account.rows[0].user_id, 'balance-update', { accounts: [{
      id: accountId,
      balance: newBalance
    }]});
    emitToUser(account.rows[0].user_id, 'new-transaction', {
      transaction_id: txId,
      amount: -Number(amount),
      type: 'debit',
      status: 'completed',
      description: description || 'Admin debit',
      transaction_date: new Date().toISOString().slice(0, 10)
    });
    emitToUser(account.rows[0].user_id, 'new-notification', {
      id: Date.now(),
      title: 'Account Debited',
      description: `$${Number(amount).toFixed(2)} has been debited from your account by SummitShares.`,
      is_read: false,
      created_at: new Date().toISOString()
    });

    return { transactionId: txId, newBalance };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

const deleteAccount = async (accountId) => {
  const result = await pool.query(
    "UPDATE accounts SET status = 'closed' WHERE id = $1 RETURNING id, account_number, status",
    [accountId]
  );
  if (result.rows.length === 0) throw new Error('Account not found');
  return result.rows[0];
};

const getAccountTransactions = async (accountId, filters = {}) => {
  let sql = 'SELECT * FROM transactions WHERE account_id = $1';
  const params = [accountId];
  let idx = 2;
  if (filters.type) {
    sql += ` AND type = $${idx}`;
    params.push(filters.type);
    idx++;
  }
  if (filters.startDate) {
    sql += ` AND transaction_date >= $${idx}`;
    params.push(filters.startDate);
    idx++;
  }
  if (filters.endDate) {
    sql += ` AND transaction_date <= $${idx}`;
    params.push(filters.endDate);
    idx++;
  }
  sql += ' ORDER BY created_at DESC LIMIT 100';
  const result = await pool.query(sql, params);
  return result.rows;
};

const getAccountDetails = async (accountId) => {
  const result = await pool.query(
    `SELECT a.*, u.first_name, u.last_name, u.email, u.phone, u.is_active AS user_active
     FROM accounts a
     JOIN users u ON u.id = a.user_id
     WHERE a.id = $1`,
    [accountId]
  );
  if (result.rows.length === 0) throw new Error('Account not found');
  return result.rows[0];
};

const adjustAvailableBalance = async (accountId, newAvailableBalance, adminId) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const account = await client.query('SELECT id, user_id, balance FROM accounts WHERE id = $1 FOR UPDATE', [accountId]);
    if (account.rows.length === 0) throw new Error('Account not found');
    const oldBalance = Number(account.rows[0].balance);
    const amount = Number(newAvailableBalance) - oldBalance;
    await client.query('UPDATE accounts SET balance = $1 WHERE id = $2', [newAvailableBalance, accountId]);
    if (amount !== 0) {
      const txId = `ADM-AVAIL-${crypto.randomUUID().slice(0, 8)}`;
      const txType = amount > 0 ? 'credit' : 'debit';
      await client.query(
        `INSERT INTO transactions (transaction_id, user_id, account_id, amount, description, type, balance_after, status, transaction_date)
         VALUES ($1, $2, $3, $4, 'Admin available balance adjustment', $5, $6, 'completed', CURRENT_DATE)`,
        [txId, account.rows[0].user_id, accountId, amount, txType, newAvailableBalance]
      );
    }
    await client.query('COMMIT');
    return { oldBalance, newBalance: Number(newAvailableBalance), adjustmentType: 'available' };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

const adjustLedgerBalance = async (accountId, newLedgerBalance, adminId) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const account = await client.query('SELECT id, user_id, balance FROM accounts WHERE id = $1 FOR UPDATE', [accountId]);
    if (account.rows.length === 0) throw new Error('Account not found');
    const oldBalance = Number(account.rows[0].balance);
    const amount = Number(newLedgerBalance) - oldBalance;
    await client.query('UPDATE accounts SET balance = $1 WHERE id = $2', [newLedgerBalance, accountId]);
    if (amount !== 0) {
      const txId = `ADM-LEDGER-${crypto.randomUUID().slice(0, 8)}`;
      const txType = amount > 0 ? 'credit' : 'debit';
      await client.query(
        `INSERT INTO transactions (transaction_id, user_id, account_id, amount, description, type, balance_after, status, transaction_date)
         VALUES ($1, $2, $3, $4, 'Admin ledger balance adjustment', $5, $6, 'completed', CURRENT_DATE)`,
        [txId, account.rows[0].user_id, accountId, amount, txType, newLedgerBalance]
      );
    }
    await client.query('COMMIT');
    return { oldBalance, newBalance: Number(newLedgerBalance), adjustmentType: 'ledger' };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

const listAllCards = async (filters = {}) => {
  let sql = `SELECT c.*, u.first_name, u.last_name, u.email, a.account_number, a.account_type
             FROM cards c 
             JOIN users u ON u.id = c.user_id 
             LEFT JOIN accounts a ON a.id = c.account_id
             WHERE 1=1`;
  const params = [];
  let idx = 1;
  if (filters.search) {
    sql += ` AND (u.first_name ILIKE $${idx} OR u.last_name ILIKE $${idx} OR u.email ILIKE $${idx} OR c.last4 ILIKE $${idx})`;
    params.push(`%${filters.search}%`);
    idx++;
  }
  if (filters.status) {
    sql += ` AND c.status = $${idx}`;
    params.push(filters.status);
    idx++;
  }
  sql += ' ORDER BY c.created_at DESC LIMIT 100';
  const result = await pool.query(sql, params);
  return result.rows;
};

const setCardVisibility = async (cardId, hidden) => {
  const result = await pool.query(
    'UPDATE cards SET status = $1 WHERE id = $2 RETURNING id, last4, status',
    [hidden ? 'blocked' : 'active', cardId]
  );
  if (result.rows.length === 0) throw new Error('Card not found');
  return { ...result.rows[0], hidden };
};

const approveCardRequest = async (cardId, adminId) => {
  const result = await pool.query(
    "UPDATE cards SET status = 'active' WHERE id = $1 AND status = 'pending' RETURNING id, last4, card_type, status",
    [cardId]
  );
  if (result.rows.length === 0) throw new Error('Card not found or already processed');

  // Emit real-time notification to the card owner
  const cardOwner = await pool.query('SELECT user_id FROM cards WHERE id = $1', [cardId]);
  if (cardOwner.rows.length > 0) {
    const ownerId = cardOwner.rows[0].user_id;
    emitToUser(ownerId, 'new-notification', {
      id: Date.now(),
      title: 'Card Request Approved',
      description: `Your ${result.rows[0].card_type} card request has been approved.`,
      is_read: false,
      created_at: new Date().toISOString()
    });
    emitToUser(ownerId, 'card-update', {
      id: cardId,
      last4: result.rows[0].last4,
      card_type: result.rows[0].card_type,
      status: 'active'
    });
  }

  return result.rows[0];
};

const rejectCardRequest = async (cardId) => {
  const result = await pool.query(
    "UPDATE cards SET status = 'expired' WHERE id = $1 AND status = 'pending' RETURNING id, last4, card_type, status",
    [cardId]
  );
  if (result.rows.length === 0) throw new Error('Card not found or already processed');

  // Emit real-time notification to the card owner
  const cardOwner = await pool.query('SELECT user_id FROM cards WHERE id = $1', [cardId]);
  if (cardOwner.rows.length > 0) {
    const ownerId = cardOwner.rows[0].user_id;
    emitToUser(ownerId, 'new-notification', {
      id: Date.now(),
      title: 'Card Request Rejected',
      description: `Your ${result.rows[0].card_type} card request has been rejected.`,
      is_read: false,
      created_at: new Date().toISOString()
    });
    emitToUser(ownerId, 'card-update', {
      id: cardId,
      last4: result.rows[0].last4,
      card_type: result.rows[0].card_type,
      status: 'expired'
    });
  }

  return result.rows[0];
};

const replaceCard = async (cardId, adminId) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const currentCard = await client.query(
      'SELECT id, user_id, account_id, card_type, card_network, cardholder_name FROM cards WHERE id = $1 FOR UPDATE',
      [cardId]
    );
    if (currentCard.rows.length === 0) throw new Error('Card not found');
    const card = currentCard.rows[0];
    await client.query("UPDATE cards SET status = 'expired' WHERE id = $1", [cardId]);
    const newLast4 = String(Math.floor(1000 + Math.random() * 9000));
    const expiryMonth = new Date().getMonth() + 1;
    const expiryYear = new Date().getFullYear() + 4;
    const newCard = await client.query(
      `INSERT INTO cards (user_id, account_id, card_type, card_network, last4, expiry_month, expiry_year, cardholder_name, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'active')
       RETURNING id, last4, card_type, card_network, status`,
      [card.user_id, card.account_id, card.card_type, card.card_network, newLast4, expiryMonth, expiryYear, card.cardholder_name]
    );
    await client.query('COMMIT');

    // Emit real-time notification to the card owner
    emitToUser(card.user_id, 'new-notification', {
      id: Date.now(),
      title: 'Card Replaced',
      description: `Your card ending in ${card.cardholder_name ? '****' + newCard.rows[0].last4 : '****' + newCard.rows[0].last4} has been replaced.`,
      is_read: false,
      created_at: new Date().toISOString()
    });
    emitToUser(card.user_id, 'card-update', {
      id: cardId,
      status: 'expired'
    });
    emitToUser(card.user_id, 'card-update', {
      id: newCard.rows[0].id,
      last4: newCard.rows[0].last4,
      card_type: newCard.rows[0].card_type,
      status: newCard.rows[0].status
    });

    return { oldCard: { id: cardId, status: 'expired' }, newCard: newCard.rows[0] };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

const cancelCard = async (cardId) => {
  const result = await pool.query(
    "UPDATE cards SET status = 'expired' WHERE id = $1 RETURNING id, last4, card_type, status",
    [cardId]
  );
  if (result.rows.length === 0) throw new Error('Card not found');

  // Emit real-time notification to the card owner
  const cardOwner = await pool.query('SELECT user_id FROM cards WHERE id = $1', [cardId]);
  if (cardOwner.rows.length > 0) {
    const ownerId = cardOwner.rows[0].user_id;
    emitToUser(ownerId, 'new-notification', {
      id: Date.now(),
      title: 'Card Cancelled',
      description: `Your card ending in ${result.rows[0].last4} has been cancelled.`,
      is_read: false,
      created_at: new Date().toISOString()
    });
    emitToUser(ownerId, 'card-update', {
      id: cardId,
      last4: result.rows[0].last4,
      card_type: result.rows[0].card_type,
      status: 'expired'
    });
  }

  return result.rows[0];
};

const listPendingTransfers = async () => {
  const result = await pool.query(
    `SELECT w.*, u.first_name, u.last_name, u.email 
     FROM wire_transfers w 
     JOIN users u ON u.id = w.user_id 
     WHERE w.status IN ('pending', 'hold')
     ORDER BY w.created_at DESC
     LIMIT 100`
  );
  return result.rows;
};

const updateWireTransferStatus = async (transferId, status, adminId, options = {}) => {
  const updates = [];
  const params = [];
  let idx = 1;
  updates.push(`status = $${idx}`);
  params.push(status);
  idx++;
  updates.push(`reviewed_by = $${idx}`);
  params.push(adminId);
  idx++;
  updates.push(`reviewed_at = CURRENT_TIMESTAMP`);
  if (status === 'sent') {
    updates.push(`is_sent = true`);
    updates.push(`sent_at = CURRENT_TIMESTAMP`);
  }
  if (options.errorMessage) {
    updates.push(`error_message = $${idx}`);
    params.push(options.errorMessage);
    idx++;
  }
  params.push(transferId);
  const result = await pool.query(
    `UPDATE wire_transfers SET ${updates.join(', ')} WHERE id = $${idx} RETURNING id, status`,
    params
  );
  if (result.rows.length === 0) throw new Error('Wire transfer not found');
  return result.rows[0];
};

const rejectTransfer = async (transferId, adminId, reason = '') => {
  const result = await pool.query(
    `UPDATE wire_transfers SET status = 'failed', reviewed_by = $1, reviewed_at = CURRENT_TIMESTAMP, error_message = $2
     WHERE id = $3 RETURNING id, status, error_message`,
    [adminId, reason || 'Rejected by administrator', transferId]
  );
  if (result.rows.length === 0) throw new Error('Wire transfer not found');
  return result.rows[0];
};

const unblockTransfer = async (transferId, adminId) => {
  const result = await pool.query(
    `UPDATE wire_transfers SET status = 'pending', reviewed_by = $1, reviewed_at = CURRENT_TIMESTAMP, error_message = NULL
     WHERE id = $2 AND status = 'blocked' RETURNING id, status`,
    [adminId, transferId]
  );
  if (result.rows.length === 0) throw new Error('Transfer not found or not blocked');
  return result.rows[0];
};

const removeTransferHold = async (transferId, adminId) => {
  const result = await pool.query(
    `UPDATE wire_transfers SET status = 'pending', reviewed_by = $1, reviewed_at = CURRENT_TIMESTAMP
     WHERE id = $2 AND status = 'hold' RETURNING id, status`,
    [adminId, transferId]
  );
  if (result.rows.length === 0) throw new Error('Transfer not found or not on hold');
  return result.rows[0];
};

const markTransferFailed = async (transferId, adminId, errorMessage = '') => {
  const result = await pool.query(
    `UPDATE wire_transfers SET status = 'failed', reviewed_by = $1, reviewed_at = CURRENT_TIMESTAMP, error_message = $2
     WHERE id = $3 RETURNING id, status, error_message`,
    [adminId, errorMessage || 'Marked as failed by administrator', transferId]
  );
  if (result.rows.length === 0) throw new Error('Wire transfer not found');
  return result.rows[0];
};

const getAllTransfers = async (filters = {}) => {
  let sql = `SELECT w.*, u.first_name, u.last_name, u.email 
             FROM wire_transfers w 
             JOIN users u ON u.id = w.user_id 
             WHERE 1=1`;
  const params = [];
  let idx = 1;
  if (filters.status) {
    sql += ` AND w.status = $${idx}`;
    params.push(filters.status);
    idx++;
  }
  if (filters.search) {
    sql += ` AND (u.first_name ILIKE $${idx} OR u.last_name ILIKE $${idx} OR w.beneficiary_name ILIKE $${idx})`;
    params.push(`%${filters.search}%`);
    idx++;
  }
  sql += ' ORDER BY w.created_at DESC LIMIT 100';
  const result = await pool.query(sql, params);
  return result.rows;
};

const notifyCustomerTransferStatus = async (transferId) => {
  const result = await pool.query(
    `SELECT w.*, u.id AS user_id, u.first_name, u.last_name, u.email
     FROM wire_transfers w
     JOIN users u ON u.id = w.user_id
     WHERE w.id = $1`,
    [transferId]
  );
  if (result.rows.length === 0) throw new Error('Wire transfer not found');
  const transfer = result.rows[0];
  await pool.query(
    `INSERT INTO notifications (user_id, title, description)
     VALUES ($1, 'Transfer Status Update', $2)`,
    [transfer.user_id, `Your wire transfer #${transferId} status: ${transfer.status}`]
  );
  return { notified: true, userId: transfer.user_id, email: transfer.email, status: transfer.status };
};

const createPopupNotification = async (userId, title, description) => {
  const result = await pool.query(
    `INSERT INTO notifications (user_id, title, description)
     VALUES ($1, $2, $3) RETURNING id`,
    [userId, title, description]
  );
  return { id: result.rows[0].id };
};

const broadcastNotification = async (title, description, role = 'customer') => {
  const result = await pool.query(
    `INSERT INTO notifications (user_id, title, description)
     SELECT id, $1, $2 FROM users WHERE role = $3
     RETURNING id`,
    [title, description, role]
  );
  return { count: result.rowCount };
};

const getLoginHistory = async (filters = {}) => {
  let sql = `SELECT lh.*, u.first_name, u.last_name, u.email
             FROM login_history lh
             JOIN users u ON u.id = lh.user_id
             WHERE 1=1`;
  const params = [];
  let idx = 1;
  if (filters.userId) {
    sql += ` AND lh.user_id = $${idx}`;
    params.push(filters.userId);
    idx++;
  }
  if (filters.status) {
    sql += ` AND lh.status = $${idx}`;
    params.push(filters.status);
    idx++;
  }
  if (filters.startDate) {
    sql += ` AND lh.created_at >= $${idx}`;
    params.push(filters.startDate);
    idx++;
  }
  if (filters.endDate) {
    sql += ` AND lh.created_at <= $${idx}`;
    params.push(filters.endDate);
    idx++;
  }
  sql += ' ORDER BY lh.created_at DESC LIMIT 200';
  const result = await pool.query(sql, params);
  return result.rows;
};

const getAuditLogs = async (filters = {}) => {
  let sql = `SELECT al.*, u.first_name, u.last_name, u.email, a.first_name AS admin_first, a.last_name AS admin_last
             FROM audit_logs al
             LEFT JOIN users u ON u.id = al.user_id
             LEFT JOIN users a ON a.id = al.admin_id
             WHERE 1=1`;
  const params = [];
  let idx = 1;
  if (filters.action) {
    sql += ` AND al.action = $${idx}`;
    params.push(filters.action);
    idx++;
  }
  if (filters.adminId) {
    sql += ` AND al.admin_id = $${idx}`;
    params.push(filters.adminId);
    idx++;
  }
  if (filters.startDate) {
    sql += ` AND al.created_at >= $${idx}`;
    params.push(filters.startDate);
    idx++;
  }
  if (filters.endDate) {
    sql += ` AND al.created_at <= $${idx}`;
    params.push(filters.endDate);
    idx++;
  }
  sql += ' ORDER BY al.created_at DESC LIMIT 200';
  const result = await pool.query(sql, params);
  return result.rows;
};

const getUserActivity = async (filters = {}) => {
  let sql = `SELECT al.*, u.first_name, u.last_name, u.email
             FROM audit_logs al
             JOIN users u ON u.id = al.user_id
             WHERE al.admin_id IS NULL`;
  const params = [];
  let idx = 1;
  if (filters.userId) {
    sql += ` AND al.user_id = $${idx}`;
    params.push(filters.userId);
    idx++;
  }
  if (filters.startDate) {
    sql += ` AND al.created_at >= $${idx}`;
    params.push(filters.startDate);
    idx++;
  }
  if (filters.endDate) {
    sql += ` AND al.created_at <= $${idx}`;
    params.push(filters.endDate);
    idx++;
  }
  sql += ' ORDER BY al.created_at DESC LIMIT 200';
  const result = await pool.query(sql, params);
  return result.rows;
};

const getAdminActivity = async (filters = {}) => {
  let sql = `SELECT al.*, a.first_name, a.last_name, a.email
             FROM audit_logs al
             JOIN users a ON a.id = al.admin_id
             WHERE al.admin_id IS NOT NULL`;
  const params = [];
  let idx = 1;
  if (filters.adminId) {
    sql += ` AND al.admin_id = $${idx}`;
    params.push(filters.adminId);
    idx++;
  }
  if (filters.action) {
    sql += ` AND al.action = $${idx}`;
    params.push(filters.action);
    idx++;
  }
  if (filters.startDate) {
    sql += ` AND al.created_at >= $${idx}`;
    params.push(filters.startDate);
    idx++;
  }
  if (filters.endDate) {
    sql += ` AND al.created_at <= $${idx}`;
    params.push(filters.endDate);
    idx++;
  }
  sql += ' ORDER BY al.created_at DESC LIMIT 200';
  const result = await pool.query(sql, params);
  return result.rows;
};

const setCreditScore = async (customerId, creditScore, adminId) => {
  if (creditScore !== null && (creditScore < 300 || creditScore > 850)) {
    throw new Error('Credit score must be between 300 and 850');
  }
  
  const result = await pool.query(
    'UPDATE users SET credit_score = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id, first_name, last_name, email, credit_score',
    [creditScore, customerId]
  );
  if (result.rows.length === 0) throw new Error('Customer not found');
  
  await createAuditLog({
    adminId,
    action: 'update',
    entityType: 'user',
    entityId: Number(customerId),
    description: `Updated credit score to ${creditScore} for customer #${customerId}`,
    ipAddress: '',
    userAgent: '',
  });
  
  return result.rows[0];
};

const updateCustomer = async (customerId, updates) => {
  const allowedFields = ['first_name', 'middle_name', 'last_name', 'email', 'phone', 'street', 'apartment', 'city', 'state', 'zip', 'country', 'occupation', 'employer', 'income_range', 'source_of_funds', 'login_enabled', 'is_active'];
  const fields = [];
  const values = [];
  let idx = 1;
  for (const [key, value] of Object.entries(updates)) {
    if (allowedFields.includes(key) && value !== undefined) {
      fields.push(`${key} = $${idx}`);
      values.push(value);
      idx++;
    }
  }
  if (fields.length === 0) throw new Error('No valid fields to update');
  values.push(customerId);
  const result = await pool.query(
    `UPDATE users SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${idx} RETURNING id, first_name, last_name, email, is_active, role`,
    values
  );
  if (result.rows.length === 0) throw new Error('Customer not found');
  return result.rows[0];
};

const setCustomerStatus = async (customerId, isActive) => {
  const result = await pool.query(
    'UPDATE users SET is_active = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id, first_name, last_name, email, is_active, role',
    [isActive, customerId]
  );
  if (result.rows.length === 0) throw new Error('Customer not found');
  return result.rows[0];
};

const setCustomerSuspended = async (customerId, suspended) => {
  const result = await pool.query(
    'UPDATE users SET is_active = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id, first_name, last_name, email, is_active, role',
    [!suspended, customerId]
  );
  if (result.rows.length === 0) throw new Error('Customer not found');
  return result.rows[0];
};

const deleteCustomer = async (customerId) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Verify customer exists
    const check = await client.query(
      `SELECT id, first_name, last_name, email FROM users WHERE id = $1 AND role = 'customer'`,
      [customerId]
    );
    if (check.rows.length === 0) throw new Error('Customer not found or not a customer');

    // Delete related records in order (cascade deletion)
    await client.query('DELETE FROM login_history WHERE user_id = $1', [customerId]);
    await client.query('DELETE FROM password_resets WHERE user_id = $1', [customerId]);
    await client.query('DELETE FROM notifications WHERE user_id = $1', [customerId]);
    await client.query('DELETE FROM transactions WHERE user_id = $1', [customerId]);
    await client.query('DELETE FROM wire_transfers WHERE user_id = $1', [customerId]);
    await client.query('DELETE FROM cheque_deposits WHERE user_id = $1', [customerId]);
    await client.query('DELETE FROM cards WHERE user_id = $1', [customerId]);
    await client.query('DELETE FROM accounts WHERE user_id = $1', [customerId]);
    await client.query('DELETE FROM applications WHERE user_id = $1', [customerId]);
    await client.query('DELETE FROM beneficiaries WHERE user_id = $1', [customerId]);
    await client.query('DELETE FROM payees WHERE user_id = $1', [customerId]);
    await client.query('DELETE FROM bills WHERE user_id = $1', [customerId]);
    await client.query('DELETE FROM documents WHERE user_id = $1', [customerId]);
    await client.query('DELETE FROM audit_logs WHERE user_id = $1 OR entity_id = $1', [customerId]);

    // Finally delete the user
    const result = await client.query(
      'DELETE FROM users WHERE id = $1 AND role = $2 RETURNING id, first_name, last_name, email',
      [customerId, 'customer']
    );

    if (result.rows.length === 0) throw new Error('Customer not found or not a customer');

    await client.query('COMMIT');

    return { id: customerId, deleted: true, customer: result.rows[0] };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

const getCustomerActivity = async (customerId, filters = {}) => {
  let sql = `SELECT al.*, u.first_name, u.last_name, u.email
             FROM audit_logs al
             LEFT JOIN users u ON u.id = al.admin_id
             WHERE al.user_id = $1 OR al.entity_id = $1`;
  const params = [customerId];
  let idx = 2;
  if (filters.action) {
    sql += ` AND al.action = $${idx}`;
    params.push(filters.action);
    idx++;
  }
  if (filters.startDate) {
    sql += ` AND al.created_at >= $${idx}`;
    params.push(filters.startDate);
    idx++;
  }
  if (filters.endDate) {
    sql += ` AND al.created_at <= $${idx}`;
    params.push(filters.endDate);
    idx++;
  }
  sql += ' ORDER BY al.created_at DESC LIMIT 100';
  const result = await pool.query(sql, params);
  return result.rows;
};

const listApplications = async (filters = {}) => {
  let sql = `SELECT a.*, u.first_name, u.last_name, u.email 
             FROM applications a 
             JOIN users u ON u.id = a.user_id 
             WHERE 1=1`;
  const params = [];
  let idx = 1;
  if (filters.status) {
    sql += ` AND a.status = $${idx}`;
    params.push(filters.status);
    idx++;
  }
  if (filters.type) {
    sql += ` AND a.application_type = $${idx}`;
    params.push(filters.type);
    idx++;
  }
  sql += ' ORDER BY a.created_at DESC LIMIT 100';
  const result = await pool.query(sql, params);
  return result.rows;
};

const updateApplicationStatus = async (applicationId, status, adminId, notes = '') => {
  const result = await pool.query(
    `UPDATE applications SET status = $1, reviewed_by = $2, reviewed_at = CURRENT_TIMESTAMP, review_notes = $3
     WHERE id = $4 RETURNING id, user_id, application_type, status`,
    [status, adminId, notes, applicationId]
  );
  if (result.rows.length === 0) throw new Error('Application not found');
  return result.rows[0];
};

// ============================================================
// EXPORT ALL
// ============================================================
module.exports = {
  createAuditLog,
  getAdminDashboardStats,
  listCustomers,
  getCustomerDetails,
  updateCustomer,
  setCustomerStatus,
  setCustomerSuspended,
  deleteCustomer,
  getCustomerActivity,
  listApplications,
  updateApplicationStatus,
  listAllAccounts,
  createAccount,
  updateAccount,
  setAccountStatus,
  setAccountHold,
  setAccountBalance,
  deleteAccount,
  getAccountTransactions,
  getAccountDetails,
  adjustAvailableBalance,
  adjustLedgerBalance,
  creditAccount,
  debitAccount,
  listAllCards,
  issueCard,
  setCardStatus,
  setCardVisibility,
  approveCardRequest,
  rejectCardRequest,
  replaceCard,
  cancelCard,
  listPendingTransfers,
  getAllTransfers,
  updateWireTransferStatus,
  rejectTransfer,
  unblockTransfer,
  removeTransferHold,
  markTransferFailed,
  notifyCustomerTransferStatus,
  createPopupNotification,
  broadcastNotification,
  getLoginHistory,
  getAuditLogs,
  getUserActivity,
  getAdminActivity,
  // NEW
  listPendingApplications,
  approveApplication,
  rejectApplication,
  approveTransfer,
  blockTransfer,
  setCreditScore,
};