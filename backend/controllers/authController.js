const pool = require('../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

// ----- Build JWT token -----
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

// ----- Nodemailer setup -----
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: process.env.SMTP_PORT || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// ----- REGISTER (FULL, WORKING) -----
exports.register = async (req, res) => {
  const payload = req.body;
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // Check if email already exists
    const [existing] = await connection.query('SELECT id FROM users WHERE email = ?', [payload.email]);
    if (existing.length > 0) {
      throw new Error('Email already registered');
    }

    // Hash password and pin
    const passwordHash = await bcrypt.hash(payload.password, 10);
    const pinHash = await bcrypt.hash(String(payload.pin || '').replace(/,/g, ''), 10);
    const ssnEncrypted = Buffer.from(String(payload.ssn || ''), 'utf8');

    // Insert user
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

    const userId = userResult.insertId; // <-- THIS WAS MISSING

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

    const user = { id: userId, first_name: payload.firstName, last_name: payload.lastName, email: payload.email };
    const token = buildToken(user);

    return res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token,
      user,
    });
  } catch (error) {
    await connection.rollback();
    console.error('Registration error:', error);
    return res.status(400).json({ success: false, message: error.message || 'Registration failed' });
  } finally {
    connection.release();
  }
};

// ----- LOGIN (unchanged) -----
exports.login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const [rows] = await pool.query('SELECT id, first_name, last_name, email, password_hash, is_active FROM users WHERE email = ?', [email]);
    if (rows.length === 0) throw new Error('Invalid email or password');
    const user = rows[0];
    if (!user.is_active) throw new Error('Account is deactivated');
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) throw new Error('Invalid email or password');
    const token = buildToken(user);
    return res.json({ success: true, message: 'Login successful', token, user });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(401).json({ success: false, message: error.message });
  }
};

// ----- FORGOT PASSWORD (unchanged) -----
exports.forgotPassword = async (req, res) => {
  const { email } = req.body;
  try {
    const [rows] = await pool.query('SELECT id, email FROM users WHERE email = ?', [email]);
    if (rows.length === 0) {
      return res.json({ success: true, message: 'If that email exists, we sent a reset link.' });
    }
    const user = rows[0];
    const resetToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
    await pool.query(
      `INSERT INTO password_resets (user_id, token, expires_at)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE token = VALUES(token), expires_at = VALUES(expires_at)`,
      [user.id, resetToken, expiresAt]
    );
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
    await transporter.sendMail({
      to: user.email,
      subject: 'Reset your Summit Shares password',
      html: `<p>You requested a password reset. Click the link below to set a new password:</p>
             <a href="${resetUrl}">${resetUrl}</a>
             <p>This link expires in 1 hour.</p>`,
    });
    return res.json({ success: true, message: 'If that email exists, we sent a reset link.' });
  } catch (error) {
    console.error('Forgot password error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ----- RESET PASSWORD (unchanged) -----
exports.resetPassword = async (req, res) => {
  const { token, newPassword } = req.body;
  try {
    const [rows] = await pool.query(
      'SELECT user_id, expires_at FROM password_resets WHERE token = ? AND expires_at > NOW()',
      [token]
    );
    if (rows.length === 0) {
      return res.status(400).json({ success: false, message: 'Invalid or expired token' });
    }
    const userId = rows[0].user_id;
    const hashed = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE users SET password_hash = ? WHERE id = ?', [hashed, userId]);
    await pool.query('DELETE FROM password_resets WHERE token = ?', [token]);
    return res.json({ success: true, message: 'Password reset successfully' });
  } catch (error) {
    console.error('Reset password error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ----- UPLOAD KYC (placeholder) -----
exports.uploadKyc = async (req, res) => {
  return res.json({ success: true, message: 'KYC upload flow ready' });
};