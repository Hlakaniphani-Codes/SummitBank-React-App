const pool = require('../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { emitNotification, emitBalanceUpdate, emitTransaction, emitToUser, emitToAdmins } = require('../services/eventEmitter');
const {
  RestrictionError,
  ERROR_CODES,
  assertAccountUsable,
  assertOwnerActive,
} = require('./accountStatus');

const ensureSchema = async () => {
  // no-op
};

// ============================================================
// FIXED: Helper to generate unique transaction ID
// ============================================================
const generateTransactionId = () => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return `TXN-${timestamp}-${random}`;
};

const hashPassword = async (password) => bcrypt.hash(password, 10);
const comparePassword = async (plainPassword, hashedPassword) => bcrypt.compare(plainPassword, hashedPassword);

const buildToken = (user) => {
  const secret = process.env.JWT_SECRET || 'dev-secret';
  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
      firstName: user.first_name || user.firstName,
      lastName: user.last_name || user.lastName,
    },
    secret,
    { expiresIn: '7d' }
  );
};

// Helper for simple queries
const query = async (text, params) => {
  return pool.query(text, params);
};

// ---------- USER & AUTH ----------
const createUser = async (payload) => {
  await ensureSchema();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const existing = await client.query('SELECT id FROM users WHERE email = $1', [payload.email]);
    if (existing.rows.length > 0) throw new Error('Email already registered');

    const passwordHash = await hashPassword(payload.password);
    const pinHash = await hashPassword(String(payload.pin || '').replace(/,/g, ''));
    const ssnEncrypted = Buffer.from(String(payload.ssn || ''), 'utf8');

    const userResult = await client.query(
      `INSERT INTO users (
        first_name, middle_name, last_name, date_of_birth, email, phone,
        street, apartment, city, state, zip, country,
        occupation, employer, income_range, source_of_funds,
        ssn_encrypted, doc_type, pin_hash, password_hash, role, terms_accepted,
        status, login_enabled, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22,
        'pending', false, false)
      RETURNING id`,
      [
        payload.firstName,
        payload.middleName || null,
        payload.lastName,
        payload.dob || '2000-01-01',
        payload.email,
        payload.phone,
        payload.street || '',
        payload.apartment || null,
        payload.city || '',
        payload.state || '',
        payload.zip || '',
        payload.country || 'US',
        payload.occupation || '',
        payload.employer || null,
        payload.income || '',
        payload.sourceOfFunds || '',
        ssnEncrypted,
        payload.docType || 'passport',
        pinHash,
        passwordHash,
        'customer',
        Boolean(payload.terms ? 1 : 0),
      ]
    );

    const userId = userResult.rows[0].id;

    // Note: Accounts and cards are NOT auto-created on signup.
    // The customer must be approved through an application, then admin creates accounts/cards manually.

    await client.query('COMMIT');
    return { id: userId, first_name: payload.firstName, last_name: payload.lastName, email: payload.email, status: 'pending' };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

const authenticateUser = async (email, password) => {
  await ensureSchema();
  const result = await query(
    'SELECT id, first_name, last_name, email, password_hash, is_active FROM users WHERE email = $1',
    [email]
  );
  if (result.rows.length === 0) throw new Error('Invalid email or password');

  const user = result.rows[0];
  if (!user.is_active) throw new Error('Account is deactivated');

  const isMatch = await comparePassword(password, user.password_hash);
  if (!isMatch) throw new Error('Invalid email or password');

  return user;
};

// ---------- DASHBOARD ----------
const getDashboardData = async (userId) => {
  await ensureSchema();

  // Built from local Y/M directly (not via toISOString(), which converts through UTC
  // and can shift the date back a day for any timezone ahead of UTC).
  const now = new Date();
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

  const [
    balanceRows,
    accounts,
    recentTx,
    notificationRows,
    cards,
    creditScoreResult,
    mtdRows,
    lastLoginRows,
  ] = await Promise.all([
    // A frozen/held account's balance is still the customer's money - only exclude
    // closed accounts, don't silently zero out the total just because an account
    // is restricted (which the account cards below already show correctly).
    query("SELECT SUM(balance) AS total FROM accounts WHERE user_id = $1 AND status != 'closed'", [userId]),
    query('SELECT id, account_number, account_type, balance, currency, routing_number, apy, status FROM accounts WHERE user_id = $1', [userId]),
    query(
      `SELECT transaction_id, description, amount, type, status, transaction_date
       FROM transactions
       WHERE user_id = $1
       ORDER BY transaction_date DESC
       LIMIT 5`,
      [userId]
    ),
    query('SELECT COUNT(*) AS count FROM notifications WHERE user_id = $1 AND is_read = false', [userId]),
    query('SELECT id, last4, card_type, card_network, status FROM cards WHERE user_id = $1 AND status != $2', [userId, 'expired']),
    query('SELECT credit_score FROM users WHERE id = $1', [userId]),
    // Month-to-date income/expenses, computed from actual transaction amounts
    // (positive = money in, negative = money out) rather than shown as a fixed $0.00.
    // Transfers between the customer's own accounts are excluded - both legs land
    // under the same user_id and would otherwise double-count as income AND expense.
    query(
      `SELECT
         COALESCE(SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END), 0) AS income,
         COALESCE(SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END), 0) AS expenses
       FROM transactions
       WHERE user_id = $1 AND transaction_date >= $2 AND type != 'transfer'`,
      [userId, monthStart]
    ),
    // Previous successful login (skip the most recent row, which is this session),
    // shown on the dashboard so the customer can spot unauthorized access.
    query(
      `SELECT created_at, ip_address FROM login_history
       WHERE user_id = $1 AND status = 'success'
       ORDER BY created_at DESC
       OFFSET 1 LIMIT 1`,
      [userId]
    ),
  ]);

  return {
    totalBalance: Number(balanceRows.rows[0]?.total || 0),
    accounts: accounts.rows,
    recentTransactions: recentTx.rows,
    unreadNotifications: Number(notificationRows.rows[0]?.count || 0),
    cards: cards.rows,
    creditScore: creditScoreResult.rows[0]?.credit_score || null,
    monthlyIncome: Number(mtdRows.rows[0]?.income || 0),
    monthlyExpenses: Number(mtdRows.rows[0]?.expenses || 0),
    lastLogin: lastLoginRows.rows[0] ? {
      at: lastLoginRows.rows[0].created_at,
      ipAddress: lastLoginRows.rows[0].ip_address,
    } : null,
  };
};

// ---------- TRANSACTIONS ----------
const getTransactions = async (userId, filters = {}) => {
  await ensureSchema();

  let sql = 'SELECT * FROM transactions WHERE user_id = $1';
  const params = [userId];
  let idx = 2;

  if (filters.type && filters.type !== 'all') {
    sql += ` AND type = $${idx}`;
    params.push(filters.type);
    idx++;
  }

  if (filters.search) {
    sql += ` AND (description ILIKE $${idx} OR transaction_id ILIKE $${idx + 1})`;
    params.push(`%${filters.search}%`, `%${filters.search}%`);
    idx += 2;
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

  sql += ' ORDER BY transaction_date DESC LIMIT 100';

  const result = await query(sql, params);
  return result.rows;
};

// ============================================================
// FIXED: transferMoney - uses generateTransactionId()
// ============================================================
const transferMoney = async (userId, payload) => {
  await ensureSchema();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    if (Number(payload.fromAccountId) === Number(payload.toAccountId)) {
      throw new RestrictionError(
        ERROR_CODES.SAME_ACCOUNT,
        'Source and destination accounts must be different.',
        { field: 'destination_account' }
      );
    }

    // Both sides are validated: the sender must exist, belong to this customer,
    // and be permitted to send; the destination must exist and be permitted to
    // receive. A restricted account produces its real reason - never "not found".
    const senderAccount = await assertAccountUsable(client, payload.fromAccountId, {
      role: 'sender',
      ownerId: userId,
      operation: 'transfer',
    });
    const recipientAccount = await assertAccountUsable(client, payload.toAccountId, {
      role: 'destination',
      operation: 'transfer',
    });

    // Keep the variable shapes the rest of this function already expects.
    const fromAccRows = { rows: [{ balance: senderAccount.balance, id: senderAccount.id }] };
    const toAccRows = { rows: [{ id: recipientAccount.id, user_id: recipientAccount.user_id, balance: recipientAccount.balance }] };

    const amount = Number(payload.amount);
    if (Number(fromAccRows.rows[0].balance) < amount) {
      throw new RestrictionError(ERROR_CODES.INSUFFICIENT_FUNDS, 'Insufficient balance.', {
        field: 'amount',
      });
    }

    await client.query(
      'UPDATE accounts SET balance = balance - $1 WHERE id = $2',
      [amount, payload.fromAccountId]
    );
    await client.query(
      'UPDATE accounts SET balance = balance + $1 WHERE id = $2',
      [amount, payload.toAccountId]
    );

    // Use UNIQUE transaction IDs for each leg of the transfer
    const debitTxId = generateTransactionId();
    const creditTxId = generateTransactionId();
    const date = payload.date || new Date().toISOString().slice(0, 10);

    await client.query(
      `INSERT INTO transactions (user_id, account_id, transaction_id, amount, description, type, balance_after, status, transaction_date)
       VALUES ($1, $2, $3, $4, $5, 'transfer', $6, 'completed', $7)`,
      [userId, payload.fromAccountId, debitTxId, -amount, payload.description || 'Transfer', Number(fromAccRows.rows[0].balance) - amount, date]
    );

    await client.query(
      `INSERT INTO transactions (user_id, account_id, transaction_id, amount, description, type, balance_after, status, transaction_date)
       VALUES ($1, $2, $3, $4, $5, 'transfer', $6, 'completed', $7)`,
      [toAccRows.rows[0].user_id, payload.toAccountId, creditTxId, amount, payload.description || 'Transfer', Number(toAccRows.rows[0].balance) + amount, date]
    );

    // Get account details for notification
    const fromAccountRows = await client.query(
      'SELECT account_number, account_type FROM accounts WHERE id = $1',
      [payload.fromAccountId]
    );
    const toAccountRows = await client.query(
      'SELECT account_number, account_type FROM accounts WHERE id = $1',
      [payload.toAccountId]
    );
    const fromAccount = fromAccountRows.rows[0];
    const toAccount = toAccountRows.rows[0];
    
    const nowFormatted = new Date().toLocaleString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: 'numeric', minute: '2-digit', hour12: true
    });

    // Notification for sender (debit)
    await client.query(
      `INSERT INTO notifications (user_id, title, description)
       VALUES ($1, 'Transfer Sent', $2)`,
      [userId, `$${amount.toFixed(2)} transferred from your ${fromAccount.account_type} account (${fromAccount.account_number}) to ${toAccount.account_type} account (${toAccount.account_number}) on ${nowFormatted}. Reference: ${debitTxId}.`]
    );

    // Notification for receiver (credit) - only if different user
    const toUserId = toAccRows.rows[0].user_id;
    if (Number(toUserId) !== Number(userId)) {
      await client.query(
        `INSERT INTO notifications (user_id, title, description)
         VALUES ($1, 'Transfer Received', $2)`,
        [toUserId, `$${amount.toFixed(2)} received into your ${toAccount.account_type} account (${toAccount.account_number}) from ${fromAccount.account_type} account on ${nowFormatted}. Reference: ${creditTxId}.`]
      );
    } else {
      // Same user - internal transfer notification
      await client.query(
        `INSERT INTO notifications (user_id, title, description)
         VALUES ($1, 'Transfer Received', $2)`,
        [userId, `$${amount.toFixed(2)} received into your ${toAccount.account_type} account (${toAccount.account_number}) from your ${fromAccount.account_type} account on ${nowFormatted}. Reference: ${creditTxId}.`]
      );
    }

    await client.query('COMMIT');

    // Emit real-time balance updates to both sender and receiver
    const [senderAccounts, receiverAccounts] = await Promise.all([
      query('SELECT id, account_number, account_type, balance, routing_number, apy, status FROM accounts WHERE user_id = $1', [userId]),
      query('SELECT id, account_number, account_type, balance, routing_number, apy, status FROM accounts WHERE user_id = $1', [toUserId])
    ]);
    
    // Use emitToUser instead of emitBalanceUpdate for internal transfers
    emitToUser(userId, 'balance-update', { accounts: senderAccounts.rows });
    emitToUser(userId, 'new-transaction', { 
      transaction_id: debitTxId, amount: -amount, type: 'transfer', status: 'completed',
      description: payload.description || 'Transfer', 
      transaction_date: new Date().toISOString().slice(0, 10)
    });
    
    if (Number(toUserId) !== Number(userId)) {
      emitToUser(toUserId, 'balance-update', { accounts: receiverAccounts.rows });
      emitToUser(toUserId, 'new-transaction', {
        transaction_id: creditTxId, amount: amount, type: 'transfer', status: 'completed',
        description: payload.description || 'Transfer Received',
        transaction_date: new Date().toISOString().slice(0, 10)
      });
    }

    return { transactionId: debitTxId };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

// ---------- CARDS ----------
const getCardDetails = async (userId, cardId) => {
  await ensureSchema();
  const result = await query(
    'SELECT id, user_id, account_id, card_type, card_network, last4, expiry_month, expiry_year, cardholder_name, status, created_at FROM cards WHERE id = $1 AND user_id = $2 LIMIT 1',
    [cardId, userId]
  );
  return result.rows[0] || null;
};

const setCardStatus = async (userId, cardId, nextStatus) => {
  await ensureSchema();
  // Customers may only block/unblock their own card. Moving a card out of 'pending'
  // (approval) or into/out of 'expired' is an admin-only transition.
  const allowed = ['active', 'blocked'];
  if (!allowed.includes(nextStatus)) throw new Error('Invalid card status');

  // A suspended / deactivated customer cannot manage cards.
  await assertOwnerActive(userId, { operation: 'managing your cards' });

  // Single atomic UPDATE guarded by status, so a concurrent admin expire/approve
  // can't be raced and silently overwritten between a check and a later write.
  const result = await query(
    `UPDATE cards SET status = $1 WHERE id = $2 AND user_id = $3 AND status NOT IN ('expired', 'pending')`,
    [nextStatus, cardId, userId]
  );

  if (result.rowCount === 0) {
    const existing = await getCardDetails(userId, cardId);
    if (!existing) throw new Error('Card not found');
    if (existing.status === 'expired') throw new Error('Card is expired and cannot be changed');
    if (existing.status === 'pending') throw new Error('This card is still awaiting admin approval');
    throw new Error('Failed to update card');
  }

  return getCardDetails(userId, cardId);
};

const requestCard = async (userId, accountId, cardType = 'debit', cardNetwork = 'visa') => {
  const userRows = await query('SELECT first_name, last_name FROM users WHERE id = $1', [userId]);
  if (userRows.rows.length === 0) throw new Error('User not found');

  // A new card is issued against this account - block the request when the
  // customer or the funding account is under a restriction.
  await assertAccountUsable(pool, accountId, { role: 'sender', ownerId: userId, operation: 'card request' });

  const cardholderName = `${userRows.rows[0].first_name} ${userRows.rows[0].last_name}`.trim();
  const last4 = Math.floor(1000 + Math.random() * 9000).toString();
  const expiryMonth = 12;
  const expiryYear = new Date().getFullYear() + 3;

  const result = await query(
    `INSERT INTO cards (
      user_id, account_id, card_type, card_network, last4,
      expiry_month, expiry_year, cardholder_name, status
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending')
    RETURNING id`,
    [userId, accountId, cardType, cardNetwork, last4, expiryMonth, expiryYear, cardholderName]
  );

  // Notify admins about new card request
  const userInfo = await query('SELECT first_name, last_name, email FROM users WHERE id = $1', [userId]);
  if (userInfo.rows.length > 0) {
    const u = userInfo.rows[0];
    emitToAdmins('admin-notification', {
      id: Date.now(),
      title: 'New Card Request',
      description: `${u.first_name} ${u.last_name} (${u.email}) has requested a new ${cardType} card.`,
      is_read: false,
      created_at: new Date().toISOString(),
      targetUserId: userId
    });
  }

  return { id: result.rows[0].id, last4, status: 'pending' };
};

// ---------- BENEFICIARIES ----------
const listBeneficiaries = async (userId) => {
  const result = await query(
    'SELECT id, name, bank_name, account_identifier FROM beneficiaries WHERE user_id = $1 ORDER BY id DESC',
    [userId]
  );
  return result.rows;
};

const addBeneficiary = async (userId, payload) => {
  await assertOwnerActive(userId, { operation: 'adding a beneficiary' });
  const { name, bankName, accountIdentifier } = payload;
  const result = await query(
    'INSERT INTO beneficiaries (user_id, name, bank_name, account_identifier) VALUES ($1, $2, $3, $4) RETURNING id',
    [userId, name, bankName, accountIdentifier]
  );
  return { id: result.rows[0].id, name, bankName, accountIdentifier };
};

const removeBeneficiary = async (userId, beneficiaryId) => {
  await assertOwnerActive(userId, { operation: 'removing a beneficiary' });
  const result = await query(
    'DELETE FROM beneficiaries WHERE id = $1 AND user_id = $2',
    [beneficiaryId, userId]
  );
  if (result.rowCount === 0) throw new Error('Beneficiary not found');
  return true;
};

// ---------- PAYEES ----------
const listPayees = async (userId) => {
  const result = await query(
    'SELECT id, name, category, account_identifier FROM payees WHERE user_id = $1 ORDER BY id DESC',
    [userId]
  );
  return result.rows;
};

const addPayee = async (userId, payload) => {
  await assertOwnerActive(userId, { operation: 'adding a payee' });
  const { name, category, accountIdentifier } = payload;
  const result = await query(
    'INSERT INTO payees (user_id, name, category, account_identifier) VALUES ($1, $2, $3, $4) RETURNING id',
    [userId, name, category, accountIdentifier]
  );
  return { id: result.rows[0].id, name, category, accountIdentifier };
};

// ---------- BILLS ----------
const listBills = async (userId) => {
  const result = await query(
    `SELECT b.id, b.name, b.description, b.amount, b.due_date, b.frequency, b.status,
            p.id AS payee_id, p.name AS payee_name
     FROM bills b
     LEFT JOIN payees p ON p.id = b.payee_id
     WHERE b.user_id = $1
     ORDER BY b.due_date DESC, b.id DESC`,
    [userId]
  );
  return result.rows;
};

const addBill = async (userId, payload) => {
  const { payeeId, name, description, amount, dueDate, frequency, status } = payload;
  const result = await query(
    `INSERT INTO bills (user_id, payee_id, name, description, amount, due_date, frequency, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id`,
    [userId, payeeId || null, name, description || '', amount, dueDate, frequency || 'one-time', status || 'upcoming']
  );
  return { id: result.rows[0].id, userId, ...payload };
};

// ============================================================
// FIXED: payBill - uses generateTransactionId()
// ============================================================
const payBill = async (userId, payload) => {
  const { billId, payeeId, amount, description, paymentDate, fromAccountId } = payload;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    let accountId = fromAccountId;
    if (!accountId) {
      const accRows = await client.query(
        'SELECT id FROM accounts WHERE user_id = $1 AND account_type = $2 AND status = $3 LIMIT 1',
        [userId, 'checking', 'active']
      );
      if (accRows.rows.length === 0) throw new Error('No active checking account found');
      accountId = accRows.rows[0].id;
    }

    // Same restriction rules as any other outbound money movement.
    const fromAccount = await assertAccountUsable(client, accountId, {
      role: 'sender',
      ownerId: userId,
      operation: 'bill payment',
    });

    const balance = Number(fromAccount.balance);
    const amountNum = Number(amount);
    if (balance < amountNum) {
      throw new RestrictionError(ERROR_CODES.INSUFFICIENT_FUNDS, 'Insufficient balance.', {
        field: 'amount',
      });
    }

    await client.query('UPDATE accounts SET balance = balance - $1 WHERE id = $2', [amountNum, accountId]);

    // FIXED: Use generateTransactionId() instead of crypto.randomUUID().slice(0, 8)
    const txId = generateTransactionId();
    const date = paymentDate || new Date().toISOString().slice(0, 10);

    await client.query(
      `INSERT INTO transactions (transaction_id, user_id, account_id, amount, description, type, balance_after, status, transaction_date)
       VALUES ($1, $2, $3, $4, $5, 'payment', $6, 'completed', $7)`,
      [txId, userId, accountId, -amountNum, description || 'Bill payment', balance - amountNum, date]
    );

    const payResult = await client.query(
      `INSERT INTO invoice_payments (user_id, bill_id, payee_id, amount, description, status, payment_date)
       VALUES ($1, $2, $3, $4, $5, 'completed', $6)
       RETURNING id`,
      [userId, billId || null, payeeId || null, amountNum, description || 'Bill payment', date]
    );

    if (billId) {
      await client.query('UPDATE bills SET status = $1 WHERE id = $2 AND user_id = $3', ['paid', billId, userId]);
    }

    await client.query(
      'INSERT INTO notifications (user_id, title, description) VALUES ($1, $2, $3)',
      [userId, 'Bill Payment', `Paid $${amountNum} for ${billId ? 'bill #' + billId : 'payee'}`]
    );

    await client.query('COMMIT');

    // Emit real-time balance update and transaction
    const updatedAccounts = await query(
      'SELECT id, account_number, account_type, balance, routing_number, apy, status FROM accounts WHERE user_id = $1',
      [userId]
    );
    emitToUser(userId, 'balance-update', { accounts: updatedAccounts.rows });
    emitToUser(userId, 'new-transaction', {
      transaction_id: txId, amount: -amountNum, type: 'payment', status: 'completed',
      description: description || 'Bill payment',
      transaction_date: date
    });

    return { paymentId: payResult.rows[0].id, transactionId: txId };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

// ---------- DOCUMENTS ----------
const listDocuments = async (userId, docType) => {
  let sql = 'SELECT id, doc_type, title, period_start, period_end, file_size_bytes, file_url, created_at FROM documents WHERE user_id = $1';
  const params = [userId];
  let idx = 2;

  if (docType) {
    sql += ` AND doc_type = $${idx}`;
    params.push(docType);
    idx++;
  }

  sql += ' ORDER BY created_at DESC LIMIT 50';

  const result = await query(sql, params);
  return result.rows;
};

const generateStatement = async (userId, accountId, periodStart, periodEnd) => {
  const title = `Statement ${periodStart} to ${periodEnd}`;
  const fileUrl = `/statements/${userId}_${accountId}_${Date.now()}.pdf`;

  const result = await query(
    `INSERT INTO documents (
      user_id, doc_type, title, period_start, period_end,
      file_size_bytes, file_url
    ) VALUES ($1, 'statement', $2, $3, $4, 0, $5)
    RETURNING id`,
    [userId, title, periodStart, periodEnd, fileUrl]
  );

  return { id: result.rows[0].id, title, fileUrl };
};

// ---------- SESSIONS ----------
const listSessions = async (userId) => {
  const result = await query(
    'SELECT id, device_name, location, ip_address, is_current, created_at, last_seen_at FROM user_sessions WHERE user_id = $1 ORDER BY is_current DESC, last_seen_at DESC',
    [userId]
  );
  return result.rows;
};

const signOutSession = async (userId, sessionId) => {
  const result = await query(
    'UPDATE user_sessions SET is_current = false, last_seen_at = CURRENT_TIMESTAMP WHERE id = $1 AND user_id = $2',
    [sessionId, userId]
  );
  if (result.rowCount === 0) throw new Error('Session not found');
  return true;
};

// ---------- USER PROFILE & PASSWORD ----------
const getUserProfile = async (userId) => {
  const result = await query(
    `SELECT id, first_name, middle_name, last_name, date_of_birth, email, phone,
            street, apartment, city, state, zip, country, occupation, employer,
            income_range, source_of_funds, doc_type, email_verified, phone_verified,
            is_active, created_at, last_login_at
     FROM users WHERE id = $1`,
    [userId]
  );
  return result.rows[0] || null;
};

const updateUserProfile = async (userId, updates) => {
  const allowed = [
    'first_name', 'middle_name', 'last_name', 'phone', 'street',
    'apartment', 'city', 'state', 'zip', 'country', 'occupation',
    'employer', 'income_range', 'source_of_funds',
  ];

  const fields = [];
  const values = [];
  let idx = 1;

  for (const [key, value] of Object.entries(updates)) {
    const dbKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
    if (allowed.includes(dbKey)) {
      fields.push(`${dbKey} = $${idx}`);
      values.push(value);
      idx++;
    }
  }

  if (fields.length === 0) throw new Error('No valid fields to update');

  values.push(userId);

  await query(`UPDATE users SET ${fields.join(', ')} WHERE id = $${idx}`, values);
  return getUserProfile(userId);
};

const changePassword = async (userId, oldPassword, newPassword) => {
  const result = await query('SELECT password_hash FROM users WHERE id = $1', [userId]);
  if (result.rows.length === 0) throw new Error('User not found');

  const valid = await bcrypt.compare(oldPassword, result.rows[0].password_hash);
  if (!valid) throw new Error('Invalid current password');

  const newHash = await bcrypt.hash(newPassword, 10);
  await query('UPDATE users SET password_hash = $1 WHERE id = $2', [newHash, userId]);
  return true;
};

// ---------- NOTIFICATIONS ----------
const listNotifications = async (userId, unreadOnly = false) => {
  let sql = 'SELECT id, title, description, is_read, created_at FROM notifications WHERE user_id = $1';
  const params = [userId];
  let idx = 2;

  if (unreadOnly) {
    sql += ` AND is_read = false`;
  }

  sql += ' ORDER BY created_at DESC';

  const result = await query(sql, params);
  return result.rows;
};

const markNotificationRead = async (userId, notificationId) => {
  const result = await query(
    'UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2',
    [notificationId, userId]
  );
  if (result.rowCount === 0) throw new Error('Notification not found or already read');
  return true;
};

const deleteNotification = async (userId, notificationId) => {
  const result = await query(
    'DELETE FROM notifications WHERE id = $1 AND user_id = $2',
    [notificationId, userId]
  );
  if (result.rowCount === 0) throw new Error('Notification not found');
  return true;
};

const deleteAllNotifications = async (userId) => {
  const result = await query('DELETE FROM notifications WHERE user_id = $1', [userId]);
  return { count: result.rowCount };
};

const createNotification = async (userId, title, description) => {
  const result = await query(
    'INSERT INTO notifications (user_id, title, description) VALUES ($1, $2, $3) RETURNING id, created_at',
    [userId, title, description]
  );
  const notification = { id: result.rows[0].id, title, description, is_read: false, created_at: result.rows[0].created_at };
  // Broadcast in real-time to the user
  emitNotification(userId, notification);
  return { id: result.rows[0].id };
};

// ============================================================
// FIXED: createWireTransfer - uses generateTransactionId()
// ============================================================
const createWireTransfer = async (userId, payload) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Validate the funding account (exists, owned by this customer, may send).
    const fundingAccount = await assertAccountUsable(client, payload.fromAccountId, {
      role: 'sender',
      ownerId: userId,
      operation: 'wire transfer',
    });

    const amount = Number(payload.amount);
    const fee = Number(payload.fee || 25);
    const totalDeduction = amount + fee;
    const currentBalance = Number(fundingAccount.balance);

    if (currentBalance < totalDeduction) {
      throw new RestrictionError(
        ERROR_CODES.INSUFFICIENT_FUNDS,
        'Insufficient balance (including wire fee).',
        { field: 'amount' }
      );
    }

    // Deduct funds from account
    await client.query('UPDATE accounts SET balance = balance - $1 WHERE id = $2', [totalDeduction, payload.fromAccountId]);

    // Create wire transfer record
    const result = await client.query(
      `INSERT INTO wire_transfers (
        user_id, from_account_id, beneficiary_name, beneficiary_bank,
        beneficiary_account, beneficiary_routing, beneficiary_address, swift_code,
        amount, currency, fee, description, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'pending')
      RETURNING id, status, created_at`,
      [
        userId,
        payload.fromAccountId,
        payload.beneficiaryName,
        payload.beneficiaryBank,
        payload.beneficiaryAccount,
        payload.beneficiaryRouting || '',
        payload.beneficiaryAddress || '',
        payload.swiftCode || '',
        amount,
        payload.currency || 'USD',
        fee,
        payload.description || '',
      ]
    );

    // FIXED: Use generateTransactionId() instead of crypto.randomUUID().slice(0, 8)
    const txId = generateTransactionId();
    await client.query(
      `INSERT INTO transactions (transaction_id, user_id, account_id, amount, description, type, balance_after, status, transaction_date)
       VALUES ($1, $2, $3, $4, $5, 'debit', $6, 'pending', CURRENT_DATE)`,
      [txId, userId, payload.fromAccountId, -totalDeduction, `Wire transfer to ${payload.beneficiaryName}`, currentBalance - totalDeduction]
    );

    // Create notification
    await client.query(
      `INSERT INTO notifications (user_id, title, description)
       VALUES ($1, 'Wire Transfer Initiated', $2)`,
      [userId, `Wire transfer of $${amount.toFixed(2)} to ${payload.beneficiaryName} is pending review.`]
    );

    await client.query('COMMIT');
    return {
      id: result.rows[0].id,
      status: result.rows[0].status,
      createdAt: result.rows[0].created_at,
      totalDeduction,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

const listCustomerWireTransfers = async (userId) => {
  const result = await pool.query(
    `SELECT id, beneficiary_name, beneficiary_bank, beneficiary_account, amount, currency, fee,
            description, status, error_message, is_sent, created_at, updated_at
     FROM wire_transfers
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT 50`,
    [userId]
  );
  return result.rows;
};

const getWireTransferDetails = async (userId, transferId) => {
  const result = await pool.query(
    `SELECT w.*, a.account_number, a.account_type
     FROM wire_transfers w
     JOIN accounts a ON a.id = w.from_account_id
     WHERE w.id = $1 AND w.user_id = $2`,
    [transferId, userId]
  );
  return result.rows[0] || null;
};

// ---------- CHEQUE DEPOSITS ----------
const createChequeDeposit = async (userId, payload, files) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // A cheque deposit credits this account - it must exist, belong to the
    // customer, and not be under a restriction.
    await assertAccountUsable(client, payload.accountId, {
      role: 'sender',
      ownerId: userId,
      operation: 'cheque deposit',
    });

    const frontImageUrl = files?.front?.[0]?.path || '';
    const backImageUrl = files?.back?.[0]?.path || '';

    const result = await client.query(
      `INSERT INTO deposited_cheques (
        user_id, account_id, amount, bank_name, cheque_number,
        front_image_url, back_image_url, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')
      RETURNING id, status, created_at`,
      [
        userId,
        payload.accountId,
        Number(payload.amount),
        payload.bankName || '',
        payload.chequeNumber || '',
        frontImageUrl,
        backImageUrl,
      ]
    );

    // Create notification
    await client.query(
      `INSERT INTO notifications (user_id, title, description)
       VALUES ($1, 'Cheque Deposit Initiated', $2)`,
      [userId, `Cheque deposit of $${Number(payload.amount).toFixed(2)} is pending review.`]
    );

    await client.query('COMMIT');
    return {
      id: result.rows[0].id,
      status: result.rows[0].status,
      createdAt: result.rows[0].created_at,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

const listCustomerChequeDeposits = async (userId) => {
  const result = await pool.query(
    `SELECT c.*, a.account_number, a.account_type
     FROM deposited_cheques c
     JOIN accounts a ON a.id = c.account_id
     WHERE c.user_id = $1
     ORDER BY c.created_at DESC
     LIMIT 50`,
    [userId]
  );
  return result.rows;
};

module.exports = {
  createUser,
  authenticateUser,
  buildToken,
  getDashboardData,
  getTransactions,
  transferMoney,
  getCardDetails,
  setCardStatus,
  requestCard,
  listBeneficiaries,
  addBeneficiary,
  removeBeneficiary,
  listPayees,
  addPayee,
  listBills,
  addBill,
  payBill,
  listDocuments,
  generateStatement,
  listSessions,
  signOutSession,
  getUserProfile,
  updateUserProfile,
  changePassword,
  listNotifications,
  markNotificationRead,
  deleteNotification,
  deleteAllNotifications,
  createNotification,
  createWireTransfer,
  listCustomerWireTransfers,
  getWireTransferDetails,
  createChequeDeposit,
  listCustomerChequeDeposits,
};