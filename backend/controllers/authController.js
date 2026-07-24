const pool = require('../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

// Build JWT token
const buildToken = (user) => {
  const secret = process.env.JWT_SECRET || 'dev-secret';
  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
      firstName: user.first_name || user.firstName,
      lastName: user.last_name || user.lastName,
      role: user.role || 'customer',
    },
    secret,
    { expiresIn: '7d' }
  );
};

// Nodemailer setup
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: process.env.SMTP_PORT || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// ============================================================
// REGISTER – only creates a pending application
// ============================================================
exports.register = async (req, res) => {
  const payload = req.body;

  try {
    // Check if email already exists
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [payload.email]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }

    // Hash password and pin
    const passwordHash = await bcrypt.hash(payload.password, 10);
    const pinHash = await bcrypt.hash(String(payload.pin || '').replace(/,/g, ''), 10);
    const ssnEncrypted = Buffer.from(String(payload.ssn || ''), 'utf8');

    // Insert user with 'pending' status and login disabled
    const userResult = await pool.query(
      `INSERT INTO users (
        first_name, middle_name, last_name, date_of_birth, email, phone,
        street, apartment, city, state, zip, country,
        occupation, employer, income_range, source_of_funds,
        ssn_encrypted, doc_type, pin_hash, password_hash, role, terms_accepted,
        status, login_enabled, is_active
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,
        'pending', false, false
      ) RETURNING id, first_name, last_name, email`,
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

    const user = userResult.rows[0];
    if (!user) throw new Error('Failed to create user record');

    // Create an application record linking to this user
    await pool.query(
      `INSERT INTO applications (user_id, application_type, status)
       VALUES ($1, 'account', 'pending')`,
      [user.id]
    );

    // Log registration
    await pool.query(
      `INSERT INTO audit_logs (action, entity_type, entity_id, description)
       VALUES ('register', 'user', $1, $2)`,
      [user.id, `New registration: ${payload.firstName} ${payload.lastName} (${payload.email})`]
    );

    // DO NOT generate account numbers, cards, or allow login
    return res.status(201).json({
      success: true,
      message: 'Your application has been submitted successfully and is awaiting administrator review. You will receive an email once your account is approved.',
      user: {
        id: user.id,
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email,
        status: 'pending',
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(400).json({ success: false, message: error.message || 'Registration failed' });
  }
};

// ============================================================
// LOGIN – only if approved and login_enabled
// ============================================================
exports.login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const { rows } = await pool.query(
      `SELECT id, first_name, last_name, email, password_hash, 
              is_active, role, status, login_enabled 
       FROM users WHERE email = $1`,
      [email]
    );

    if (rows.length === 0) throw new Error('Invalid email or password');

    const user = rows[0];

    // --- Approval status checks ---
    if (user.status === 'pending') {
      return res.status(403).json({
        success: false,
        message: 'Your application is still pending administrator review. You will receive an email once your account is approved.'
      });
    }
    if (user.status === 'rejected') {
      return res.status(403).json({
        success: false,
        message: 'Your application was not approved. Please contact support for more information.'
      });
    }

    if (!user.is_active) {
      return res.status(403).json({ success: false, message: 'Account is deactivated. Please contact support.' });
    }

    if (!user.login_enabled) {
      return res.status(403).json({ success: false, message: 'Online banking access has not been enabled yet. Please contact support.' });
    }

    // Verify password
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) throw new Error('Invalid email or password');

    // Generate token
    const token = buildToken(user);

    // Log success
    await pool.query(
      `INSERT INTO login_history (user_id, status, ip_address, user_agent)
       VALUES ($1, 'success', $2, $3)`,
      [user.id, req.ip, req.headers['user-agent']]
    );

    return res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email,
        role: user.role || 'customer',
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    // Log failed attempt
    if (email) {
      await pool.query(
        `INSERT INTO login_history (user_id, status, failure_reason, ip_address, user_agent)
         SELECT id, 'failed', $1, $2, $3 FROM users WHERE email = $4`,
        [error.message, req.ip, req.headers['user-agent'], email]
      ).catch(() => {});
    }
    return res.status(401).json({ success: false, message: error.message });
  }
};

// ============================================================
// Other auth endpoints (forgot, reset, etc.) – keep as is
// ============================================================
exports.forgotPassword = async (req, res) => {
  const { email } = req.body;
  try {
    const { rows } = await pool.query(
      'SELECT id, email FROM users WHERE email = $1',
      [email]
    );

    if (rows.length === 0) {
      return res.json({ success: true, message: 'If that email exists, we sent a reset link.' });
    }

    const user = rows[0];
    const resetToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await pool.query(
      `INSERT INTO password_resets (user_id, token, expires_at)
       VALUES ($1, $2, $3)
       ON CONFLICT (token) DO UPDATE SET
         user_id = EXCLUDED.user_id,
         token = EXCLUDED.token,
         expires_at = EXCLUDED.expires_at`,
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

exports.resetPassword = async (req, res) => {
  const { token, newPassword } = req.body;
  try {
    const { rows } = await pool.query(
      'SELECT user_id, expires_at FROM password_resets WHERE token = $1 AND expires_at > NOW()',
      [token]
    );

    if (rows.length === 0) {
      return res.status(400).json({ success: false, message: 'Invalid or expired token' });
    }

    const userId = rows[0].user_id;
    const hashed = await bcrypt.hash(newPassword, 10);

    await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hashed, userId]);
    await pool.query('DELETE FROM password_resets WHERE token = $1', [token]);

    return res.json({ success: true, message: 'Password reset successfully' });
  } catch (error) {
    console.error('Reset password error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.uploadKyc = async (req, res) => {
  return res.json({ success: true, message: 'KYC upload flow ready' });
};