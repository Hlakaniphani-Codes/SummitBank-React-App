const pool = require('../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const ensureSchema = async () => {
  // no-op
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
        ssn_encrypted, doc_type, pin_hash, password_hash, terms_accepted
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
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
        Boolean(payload.terms ? 1 : 0),
      ]
    );

    const userId = userResult.rows[0].id;

    await client.query(
      `INSERT INTO accounts (user_id, account_number, account_type, currency, balance, routing_number, status, opened_at)
       VALUES ($1, $2, 'checking', $3, 0.00, '021000021', 'active', CURRENT_DATE)`,
      [userId, `CHK-${1000 + Math.floor(Math.random() * 9000)}`, payload.accountCurrency || 'USD']
    );

    await client.query(
      `INSERT INTO accounts (user_id, account_number, account_type, currency, balance, routing_number, apy, status, opened_at)
       VALUES ($1, $2, 'savings', $3, 0.00, '021000021', 4.25, 'active', CURRENT_DATE)`,
      [userId, `SAV-${1000 + Math.floor(Math.random() * 9000)}`, payload.accountCurrency || 'USD']
    );

    await client.query(
      `INSERT INTO cards (
        user_id, account_id, card_type, card_network, last4,
        expiry_month, expiry_year, cardholder_name, status
      ) VALUES (
        $1,
        (SELECT id FROM accounts WHERE user_id = $1 AND account_type = 'checking' ORDER BY id LIMIT 1),
        'debit',
        'visa',
        '4829',
        12,
        2028,
        $2,
        'active'
      )`,
      [userId, `${payload.firstName} ${payload.lastName}`.trim()]
    );

    await client.query('COMMIT');
    return { id: userId, first_name: payload.firstName, last_name: payload.lastName, email: payload.email };
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

  const balanceRows = await query(
    'SELECT SUM(balance) AS total FROM accounts WHERE user_id = $1 AND status = $2',
    [userId, 'active']
  );

  const accounts = await query(
    'SELECT id, account_number, account_type, balance, currency, routing_number, apy FROM accounts WHERE user_id = $1',
    [userId]
  );

  const recentTx = await query(
    `SELECT transaction_id, description, amount, type, status, transaction_date
     FROM transactions
     WHERE user_id = $1
     ORDER BY transaction_date DESC
     LIMIT 5`,
    [userId]
  );

  const notificationRows = await query(
    'SELECT COUNT(*) AS count FROM notifications WHERE user_id = $1 AND is_read = false',
    [userId]
  );

  const cards = await query(
    'SELECT id, last4, card_type, card_network, status FROM cards WHERE user_id = $1 AND status != $2',
    [userId, 'expired']
  );

  return {
    totalBalance: Number(balanceRows.rows[0]?.total || 0),
    accounts: accounts.rows,
    recentTransactions: recentTx.rows,
    unreadNotifications: Number(notificationRows.rows[0]?.count || 0),
    cards: cards.rows,
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

// ---------- TRANSFERS ----------
const transferMoney = async (userId, payload) => {
  await ensureSchema();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const fromAccRows = await client.query(
      'SELECT balance, id FROM accounts WHERE id = $1 AND user_id = $2 AND status = $3 FOR UPDATE',
      [payload.fromAccountId, userId, 'active']
    );
    if (fromAccRows.rows.length === 0) throw new Error('Source account not found');

    const toAccRows = await client.query(
      'SELECT id, user_id, balance FROM accounts WHERE id = $1 AND status = $2 FOR UPDATE',
      [payload.toAccountId, 'active']
    );
    if (toAccRows.rows.length === 0) throw new Error('Destination account not found');

    const amount = Number(payload.amount);
    if (Number(fromAccRows.rows[0].balance) < amount) throw new Error('Insufficient balance');

    await client.query(
      'UPDATE accounts SET balance = balance - $1 WHERE id = $2',
      [amount, payload.fromAccountId]
    );
    await client.query(
      'UPDATE accounts SET balance = balance + $1 WHERE id = $2',
      [amount, payload.toAccountId]
    );

    const txId = `TXN-${Date.now()}`;
    const date = payload.date || new Date().toISOString().slice(0, 10);

    await client.query(
      `INSERT INTO transactions (user_id, account_id, transaction_id, amount, description, type, balance_after, status, transaction_date)
       VALUES ($1, $2, $3, $4, $5, 'transfer', $6, 'completed', $7)`,
      [userId, payload.fromAccountId, txId, -amount, payload.description || 'Transfer', Number(fromAccRows.rows[0].balance) - amount, date]
    );

    await client.query(
      `INSERT INTO transactions (user_id, account_id, transaction_id, amount, description, type, balance_after, status, transaction_date)
       VALUES ($1, $2, $3, $4, $5, 'transfer', $6, 'completed', $7)`,
      [toAccRows.rows[0].user_id, payload.toAccountId, txId, amount, payload.description || 'Transfer', Number(toAccRows.rows[0].balance) + amount, date]
    );

    await client.query('COMMIT');
    return { transactionId: txId };
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
  const allowed = ['active', 'blocked', 'pending', 'expired'];
  if (!allowed.includes(nextStatus)) throw new Error('Invalid card status');

  const result = await query(
    'UPDATE cards SET status = $1 WHERE id = $2 AND user_id = $3 AND status != $4',
    [nextStatus, cardId, userId, 'expired']
  );

  if (result.rowCount === 0) {
    const existing = await getCardDetails(userId, cardId);
    if (!existing) throw new Error('Card not found');
    if (existing.status === 'expired') throw new Error('Card is expired and cannot be changed');
    throw new Error('Failed to update card');
  }

  return getCardDetails(userId, cardId);
};

const requestCard = async (userId, accountId, cardType = 'debit', cardNetwork = 'visa') => {
  const userRows = await query('SELECT first_name, last_name FROM users WHERE id = $1', [userId]);
  if (userRows.rows.length === 0) throw new Error('User not found');

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
  const { name, bankName, accountIdentifier } = payload;
  const result = await query(
    'INSERT INTO beneficiaries (user_id, name, bank_name, account_identifier) VALUES ($1, $2, $3, $4) RETURNING id',
    [userId, name, bankName, accountIdentifier]
  );
  return { id: result.rows[0].id, name, bankName, accountIdentifier };
};

const removeBeneficiary = async (userId, beneficiaryId) => {
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

    const fromAcc = await client.query(
      'SELECT balance FROM accounts WHERE id = $1 AND user_id = $2 AND status = $3 FOR UPDATE',
      [accountId, userId, 'active']
    );
    if (fromAcc.rows.length === 0) throw new Error('Source account not found');

    const balance = Number(fromAcc.rows[0].balance);
    const amountNum = Number(amount);
    if (balance < amountNum) throw new Error('Insufficient balance');

    await client.query('UPDATE accounts SET balance = balance - $1 WHERE id = $2', [amountNum, accountId]);

    const txId = `TXN-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
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

const createNotification = async (userId, title, description) => {
  const result = await query(
    'INSERT INTO notifications (user_id, title, description) VALUES ($1, $2, $3) RETURNING id',
    [userId, title, description]
  );
  return { id: result.rows[0].id };
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
  createNotification,
};

