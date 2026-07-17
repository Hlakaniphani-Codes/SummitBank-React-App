const pool = require('../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const ensureSchema = async () => {
  // no-op – kept for compatibility with existing calls
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

// ---------- USER & AUTH ----------
const createUser = async (payload) => {
  await ensureSchema();
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [existing] = await connection.query('SELECT id FROM users WHERE email = ?', [payload.email]);
    if (existing.length > 0) throw new Error('Email already registered');

    const passwordHash = await hashPassword(payload.password);
    const pinHash = await hashPassword(String(payload.pin || '').replace(/,/g, ''));
    const ssnEncrypted = Buffer.from(String(payload.ssn || ''), 'utf8');

    const [userResult] = await connection.query(
      `INSERT INTO users (
        first_name, middle_name, last_name, date_of_birth, email, phone,
        street, apartment, city, state, zip, country,
        occupation, employer, income_range, source_of_funds,
        ssn_encrypted, doc_type, pin_hash, password_hash, terms_accepted
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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

    const userId = userResult.insertId;

    // Create checking account
    await connection.query(
      `INSERT INTO accounts (user_id, account_number, account_type, currency, balance, routing_number, status, opened_at)
       VALUES (?, ?, 'checking', ?, 0.00, '021000021', 'active', CURDATE())`,
      [userId, `CHK-${1000 + Math.floor(Math.random() * 9000)}`, payload.accountCurrency || 'USD']
    );

    // Create savings account
    await connection.query(
      `INSERT INTO accounts (user_id, account_number, account_type, currency, balance, routing_number, apy, status, opened_at)
       VALUES (?, ?, 'savings', ?, 0.00, '021000021', 4.25, 'active', CURDATE())`,
      [userId, `SAV-${1000 + Math.floor(Math.random() * 9000)}`, payload.accountCurrency || 'USD']
    );

    // Create default debit card
    await connection.query(
      `INSERT INTO cards (user_id, account_id, card_type, card_network, last4, expiry_month, expiry_year, cardholder_name, status)
       VALUES (?, (SELECT id FROM accounts WHERE user_id = ? AND account_type = 'checking' ORDER BY id LIMIT 1), 'debit', 'visa', '4829', 12, 2028, ?, 'active')`,
      [userId, userId, `${payload.firstName} ${payload.lastName}`.trim()]
    );

    await connection.commit();
    return { id: userId, first_name: payload.firstName, last_name: payload.lastName, email: payload.email };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

const authenticateUser = async (email, password) => {
  await ensureSchema();
  const [rows] = await pool.query(
    'SELECT id, first_name, last_name, email, password_hash, is_active FROM users WHERE email = ?',
    [email]
  );
  if (rows.length === 0) throw new Error('Invalid email or password');

  const user = rows[0];
  if (!user.is_active) throw new Error('Account is deactivated');

  const isMatch = await comparePassword(password, user.password_hash);
  if (!isMatch) throw new Error('Invalid email or password');

  return user;
};

// ---------- DASHBOARD ----------
const getDashboardData = async (userId) => {
  await ensureSchema();
  const [balanceRows] = await pool.query(
    'SELECT SUM(balance) AS total FROM accounts WHERE user_id = ? AND status = "active"',
    [userId]
  );
  const [accounts] = await pool.query(
    'SELECT id, account_number, account_type, balance, currency, routing_number, apy FROM accounts WHERE user_id = ?',
    [userId]
  );
  const [recentTx] = await pool.query(
    `SELECT transaction_id, description, amount, type, status, transaction_date
     FROM transactions
     WHERE user_id = ?
     ORDER BY transaction_date DESC
     LIMIT 5`,
    [userId]
  );
  const [notificationRows] = await pool.query(
    'SELECT COUNT(*) AS count FROM notifications WHERE user_id = ? AND is_read = 0',
    [userId]
  );
  const [cards] = await pool.query(
    'SELECT id, last4, card_type, card_network, status FROM cards WHERE user_id = ? AND status != "expired"',
    [userId]
  );

  return {
    totalBalance: Number(balanceRows[0]?.total || 0),
    accounts,
    recentTransactions: recentTx,
    unreadNotifications: Number(notificationRows[0]?.count || 0),
    cards,
  };
};

// ---------- TRANSACTIONS ----------
const getTransactions = async (userId, filters = {}) => {
  await ensureSchema();
  let query = 'SELECT * FROM transactions WHERE user_id = ?';
  const params = [userId];

  if (filters.type && filters.type !== 'all') {
    query += ' AND type = ?';
    params.push(filters.type);
  }
  if (filters.search) {
    query += ' AND (description LIKE ? OR transaction_id LIKE ?)';
    params.push(`%${filters.search}%`, `%${filters.search}%`);
  }
  if (filters.startDate) {
    query += ' AND transaction_date >= ?';
    params.push(filters.startDate);
  }
  if (filters.endDate) {
    query += ' AND transaction_date <= ?';
    params.push(filters.endDate);
  }

  query += ' ORDER BY transaction_date DESC LIMIT 100';
  const [rows] = await pool.query(query, params);
  return rows;
};

// ---------- TRANSFERS ----------
const transferMoney = async (userId, payload) => {
  await ensureSchema();
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [fromAccRows] = await connection.query(
      'SELECT balance, id FROM accounts WHERE id = ? AND user_id = ? AND status = "active"',
      [payload.fromAccountId, userId]
    );
    if (fromAccRows.length === 0) throw new Error('Source account not found');

    const [toAccRows] = await connection.query(
      'SELECT id, user_id, balance FROM accounts WHERE id = ? AND status = "active"',
      [payload.toAccountId]
    );
    if (toAccRows.length === 0) throw new Error('Destination account not found');

    const amount = Number(payload.amount);
    if (Number(fromAccRows[0].balance) < amount) throw new Error('Insufficient balance');

    await connection.query('UPDATE accounts SET balance = balance - ? WHERE id = ?', [amount, payload.fromAccountId]);
    await connection.query('UPDATE accounts SET balance = balance + ? WHERE id = ?', [amount, payload.toAccountId]);

    const txId = `TXN-${Date.now()}`;
    const date = payload.date || new Date().toISOString().slice(0, 10);

    await connection.query(
      `INSERT INTO transactions (user_id, account_id, transaction_id, amount, description, type, balance_after, status, transaction_date)
       VALUES (?, ?, ?, ?, ?, 'transfer', ?, 'completed', ?)`,
      [userId, payload.fromAccountId, txId, -amount, payload.description || 'Transfer', Number(fromAccRows[0].balance) - amount, date]
    );

    await connection.query(
      `INSERT INTO transactions (user_id, account_id, transaction_id, amount, description, type, balance_after, status, transaction_date)
       VALUES (?, ?, ?, ?, ?, 'transfer', ?, 'completed', ?)`,
      [toAccRows[0].user_id, payload.toAccountId, txId, amount, payload.description || 'Transfer', Number(toAccRows[0].balance) + amount, date]
    );

    await connection.commit();
    return { transactionId: txId };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

// ---------- CARDS ----------
const getCardDetails = async (userId, cardId) => {
  await ensureSchema();
  const [rows] = await pool.query(
    'SELECT id, user_id, account_id, card_type, card_network, last4, expiry_month, expiry_year, cardholder_name, status, created_at FROM cards WHERE id = ? AND user_id = ? LIMIT 1',
    [cardId, userId]
  );
  return rows[0] || null;
};

const setCardStatus = async (userId, cardId, nextStatus) => {
  await ensureSchema();
  const allowed = ['active', 'blocked', 'pending', 'expired'];
  if (!allowed.includes(nextStatus)) throw new Error('Invalid card status');

  const [result] = await pool.query(
    'UPDATE cards SET status = ? WHERE id = ? AND user_id = ? AND status != "expired"',
    [nextStatus, cardId, userId]
  );

  if (!result || result.affectedRows === 0) {
    const existing = await getCardDetails(userId, cardId);
    if (!existing) throw new Error('Card not found');
    if (existing.status === 'expired') throw new Error('Card is expired and cannot be changed');
    throw new Error('Failed to update card');
  }

  const updated = await getCardDetails(userId, cardId);
  return updated;
};

// ----- NEW: Request a new card -----
const requestCard = async (userId, accountId, cardType = 'debit', cardNetwork = 'visa') => {
  // Fetch user's full name
  const [userRows] = await pool.query(
    'SELECT first_name, last_name FROM users WHERE id = ?',
    [userId]
  );
  if (userRows.length === 0) throw new Error('User not found');
  const cardholderName = `${userRows[0].first_name} ${userRows[0].last_name}`.trim();

  // Generate random last4 and expiry (3 years from now)
  const last4 = Math.floor(1000 + Math.random() * 9000).toString();
  const expiryMonth = 12;
  const expiryYear = new Date().getFullYear() + 3;

  const [result] = await pool.query(
    `INSERT INTO cards (
      user_id, account_id, card_type, card_network, last4,
      expiry_month, expiry_year, cardholder_name, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [userId, accountId, cardType, cardNetwork, last4,
     expiryMonth, expiryYear, cardholderName, 'pending']
  );
  return { id: result.insertId, last4, status: 'pending' };
};

// ---------- BENEFICIARIES ----------
const listBeneficiaries = async (userId) => {
  const [rows] = await pool.query(
    'SELECT id, name, bank_name, account_identifier FROM beneficiaries WHERE user_id = ? ORDER BY id DESC',
    [userId]
  );
  return rows;
};

const addBeneficiary = async (userId, payload) => {
  const { name, bankName, accountIdentifier } = payload;
  const [result] = await pool.query(
    'INSERT INTO beneficiaries (user_id, name, bank_name, account_identifier) VALUES (?, ?, ?, ?)',
    [userId, name, bankName, accountIdentifier]
  );
  return { id: result.insertId, name, bankName, accountIdentifier };
};

const removeBeneficiary = async (userId, beneficiaryId) => {
  const [result] = await pool.query(
    'DELETE FROM beneficiaries WHERE id = ? AND user_id = ?',
    [beneficiaryId, userId]
  );
  if (!result || result.affectedRows === 0) throw new Error('Beneficiary not found');
  return true;
};

// ---------- PAYEES ----------
const listPayees = async (userId) => {
  const [rows] = await pool.query(
    'SELECT id, name, category, account_identifier FROM payees WHERE user_id = ? ORDER BY id DESC',
    [userId]
  );
  return rows;
};

const addPayee = async (userId, payload) => {
  const { name, category, accountIdentifier } = payload;
  const [result] = await pool.query(
    'INSERT INTO payees (user_id, name, category, account_identifier) VALUES (?, ?, ?, ?)',
    [userId, name, category, accountIdentifier]
  );
  return { id: result.insertId, name, category, accountIdentifier };
};

// ---------- BILLS ----------
const listBills = async (userId) => {
  const [rows] = await pool.query(
    `SELECT b.id, b.name, b.description, b.amount, b.due_date, b.frequency, b.status,
            p.id AS payee_id, p.name AS payee_name
     FROM bills b
     LEFT JOIN payees p ON p.id = b.payee_id
     WHERE b.user_id = ?
     ORDER BY b.due_date DESC, b.id DESC`,
    [userId]
  );
  return rows;
};

const addBill = async (userId, payload) => {
  const { payeeId, name, description, amount, dueDate, frequency, status } = payload;
  const [result] = await pool.query(
    `INSERT INTO bills (user_id, payee_id, name, description, amount, due_date, frequency, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [userId, payeeId || null, name, description || '', amount, dueDate, frequency || 'one-time', status || 'upcoming']
  );
  return { id: result.insertId, userId, ...payload };
};

// ----- FIXED: payBill (now deducts balance, records transaction, creates notification) -----
const payBill = async (userId, payload) => {
  const { billId, payeeId, amount, description, paymentDate, fromAccountId } = payload;
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // Determine source account: use provided or first active checking
    let accountId = fromAccountId;
    if (!accountId) {
      const [accRows] = await connection.query(
        'SELECT id FROM accounts WHERE user_id = ? AND account_type = "checking" AND status = "active" LIMIT 1',
        [userId]
      );
      if (accRows.length === 0) throw new Error('No active checking account found');
      accountId = accRows[0].id;
    }

    // Lock and fetch balance
    const [fromAcc] = await connection.query(
      'SELECT balance FROM accounts WHERE id = ? AND user_id = ? AND status = "active" FOR UPDATE',
      [accountId, userId]
    );
    if (fromAcc.length === 0) throw new Error('Source account not found');
    const balance = Number(fromAcc[0].balance);
    const amountNum = Number(amount);
    if (balance < amountNum) throw new Error('Insufficient balance');

    // Deduct balance
    await connection.query(
      'UPDATE accounts SET balance = balance - ? WHERE id = ?',
      [amountNum, accountId]
    );

    // Record transaction (debit)
    const txId = `TXN-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const date = paymentDate || new Date().toISOString().slice(0, 10);
    await connection.query(
      `INSERT INTO transactions (transaction_id, user_id, account_id, amount, description, type, balance_after, status, transaction_date)
       VALUES (?, ?, ?, ?, ?, 'payment', ?, 'completed', ?)`,
      [txId, userId, accountId, -amountNum, description || 'Bill payment', balance - amountNum, date]
    );

    // Insert invoice_payment record
    const [payResult] = await connection.query(
      `INSERT INTO invoice_payments (user_id, bill_id, payee_id, amount, description, status, payment_date)
       VALUES (?, ?, ?, ?, ?, 'completed', ?)`,
      [userId, billId, payeeId || null, amountNum, description || 'Bill payment', date]
    );

    // Update bill status to 'paid'
    if (billId) {
      await connection.query(
        'UPDATE bills SET status = "paid" WHERE id = ? AND user_id = ?',
        [billId, userId]
      );
    }

    // Create notification
    await connection.query(
      'INSERT INTO notifications (user_id, title, description) VALUES (?, ?, ?)',
      [userId, 'Bill Payment', `Paid $${amountNum} for ${billId ? 'bill #' + billId : 'payee'}`]
    );

    await connection.commit();
    return { paymentId: payResult.insertId, transactionId: txId };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

// ---------- DOCUMENTS ----------
const listDocuments = async (userId, docType) => {
  let query = 'SELECT id, doc_type, title, period_start, period_end, file_size_bytes, file_url, created_at FROM documents WHERE user_id = ?';
  const params = [userId];
  if (docType) {
    query += ' AND doc_type = ?';
    params.push(docType);
  }
  query += ' ORDER BY created_at DESC LIMIT 50';
  const [rows] = await pool.query(query, params);
  return rows;
};

// ----- NEW: Generate a statement (document) -----
const generateStatement = async (userId, accountId, periodStart, periodEnd) => {
  const title = `Statement ${periodStart} to ${periodEnd}`;
  const fileUrl = `/statements/${userId}_${accountId}_${Date.now()}.pdf`; // placeholder
  const [result] = await pool.query(
    `INSERT INTO documents (
      user_id, doc_type, title, period_start, period_end,
      file_size_bytes, file_url
    ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [userId, 'statement', title, periodStart, periodEnd, 0, fileUrl]
  );
  return { id: result.insertId, title, fileUrl };
};

// ---------- SESSIONS ----------
const listSessions = async (userId) => {
  const [rows] = await pool.query(
    'SELECT id, device_name, location, ip_address, is_current, created_at, last_seen_at FROM user_sessions WHERE user_id = ? ORDER BY is_current DESC, last_seen_at DESC',
    [userId]
  );
  return rows;
};

const signOutSession = async (userId, sessionId) => {
  const [result] = await pool.query(
    'UPDATE user_sessions SET is_current = 0, last_seen_at = NOW() WHERE id = ? AND user_id = ?',
    [sessionId, userId]
  );
  if (!result || result.affectedRows === 0) throw new Error('Session not found');
  return true;
};

// ---------- NEW: USER PROFILE & PASSWORD ----------
const getUserProfile = async (userId) => {
  const [rows] = await pool.query(
    `SELECT id, first_name, middle_name, last_name, date_of_birth, email, phone,
            street, apartment, city, state, zip, country, occupation, employer,
            income_range, source_of_funds, doc_type, email_verified, phone_verified,
            is_active, created_at, last_login_at
     FROM users WHERE id = ?`,
    [userId]
  );
  return rows[0] || null;
};

const updateUserProfile = async (userId, updates) => {
  const allowed = [
    'first_name', 'middle_name', 'last_name', 'phone', 'street',
    'apartment', 'city', 'state', 'zip', 'country', 'occupation',
    'employer', 'income_range', 'source_of_funds'
  ];
  const fields = [];
  const values = [];
  for (const [key, value] of Object.entries(updates)) {
    const dbKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
    if (allowed.includes(dbKey)) {
      fields.push(`${dbKey} = ?`);
      values.push(value);
    }
  }
  if (fields.length === 0) throw new Error('No valid fields to update');
  values.push(userId);
  await pool.query(
    `UPDATE users SET ${fields.join(', ')} WHERE id = ?`,
    values
  );
  return getUserProfile(userId);
};

const changePassword = async (userId, oldPassword, newPassword) => {
  const [rows] = await pool.query(
    'SELECT password_hash FROM users WHERE id = ?',
    [userId]
  );
  if (rows.length === 0) throw new Error('User not found');
  const valid = await bcrypt.compare(oldPassword, rows[0].password_hash);
  if (!valid) throw new Error('Invalid current password');
  const newHash = await bcrypt.hash(newPassword, 10);
  await pool.query(
    'UPDATE users SET password_hash = ? WHERE id = ?',
    [newHash, userId]
  );
  return true;
};

// ---------- NEW: NOTIFICATIONS ----------
const listNotifications = async (userId, unreadOnly = false) => {
  let sql = 'SELECT id, title, description, is_read, created_at FROM notifications WHERE user_id = ?';
  const params = [userId];
  if (unreadOnly) {
    sql += ' AND is_read = 0';
  }
  sql += ' ORDER BY created_at DESC';
  const [rows] = await pool.query(sql, params);
  return rows;
};

const markNotificationRead = async (userId, notificationId) => {
  const [result] = await pool.query(
    'UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?',
    [notificationId, userId]
  );
  if (result.affectedRows === 0) throw new Error('Notification not found or already read');
  return true;
};

// Helper to create a notification (used internally)
const createNotification = async (userId, title, description) => {
  const [result] = await pool.query(
    'INSERT INTO notifications (user_id, title, description) VALUES (?, ?, ?)',
    [userId, title, description]
  );
  return { id: result.insertId };
};

// ---------- EXPORTS ----------
module.exports = {
  createUser,
  authenticateUser,
  buildToken,
  getDashboardData,
  getTransactions,
  transferMoney,
  getCardDetails,
  setCardStatus,
  requestCard,            // NEW
  listBeneficiaries,
  addBeneficiary,
  removeBeneficiary,
  listPayees,
  addPayee,
  listBills,
  addBill,
  payBill,                // FIXED version
  listDocuments,
  generateStatement,      // NEW
  listSessions,
  signOutSession,
  getUserProfile,         // NEW
  updateUserProfile,      // NEW
  changePassword,         // NEW
  listNotifications,      // NEW
  markNotificationRead,   // NEW
  createNotification,     // NEW (exported for internal use if needed)
};