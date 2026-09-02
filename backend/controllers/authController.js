const pool = require('../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { sendOtpEmail, sendPasswordResetEmail } = require('../services/emailService');
const otpService = require('../services/otpService');

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

// Masks an email for display during the OTP step, e.g. "robert@gmail.com" -> "r****@gmail.com"
const maskEmail = (email) => {
  const [local, domain] = String(email).split('@');
  if (!domain) return email;
  const visible = local.slice(0, 1);
  return `${visible}${'*'.repeat(Math.max(local.length - 1, 4))}@${domain}`;
};

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

    // --- Approval / account-status checks ---
    // Each carries a machine `code` so the sign-in page can show these in an
    // acknowledge-to-dismiss dialog instead of a toast that disappears.
    if (user.status === 'pending') {
      return res.status(403).json({
        success: false,
        code: 'ACCOUNT_PENDING',
        message: 'Your application is still pending administrator review. You will receive an email once your account is approved.'
      });
    }
    if (user.status === 'rejected') {
      return res.status(403).json({
        success: false,
        code: 'ACCOUNT_REJECTED',
        message: 'Your application was not approved. Please contact Customer Support for more information.'
      });
    }

    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        code: 'ACCOUNT_RESTRICTED',
        message: 'Your account is currently on hold. To resolve this issue, please visit your nearest branch or contact Customer Support for assistance.'
      });
    }

    if (!user.login_enabled) {
      return res.status(403).json({
        success: false,
        code: 'LOGIN_NOT_ENABLED',
        message: 'Online banking access has not been enabled for your account yet. Please contact Customer Support for assistance.'
      });
    }

    // Verify password
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) throw new Error('Invalid email or password');

    // Admins skip 2FA entirely - this endpoint is also used by the admin/super_admin
    // roles interchangeably with the dedicated /api/admin/login, so the exemption has
    // to be role-based here too, not just "only reachable via the admin route".
    const isAdmin = user.role === 'admin' || user.role === 'super_admin';
    if (isAdmin) {
      const token = buildToken(user);
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
          role: user.role,
        },
      });
    }

    // Customers: password verified, but no token yet - require an emailed OTP first.
    // The OTP row exists regardless of whether delivery actually succeeds (SMTP being
    // down/unconfigured must not block the response - the customer can still use
    // Resend once it's fixed, same as how a real provider outage would be handled).
    // Not awaited: a slow/unreachable SMTP server (common on hosts that restrict
    // outbound mail ports) would otherwise stall every single login for as long
    // as the connection takes to time out.
    const code = await otpService.createOtp(user.id, 'login');
    sendOtpEmail(user, code).catch((emailError) => {
      console.error('[EMAIL ERROR] Failed to send login OTP email:', emailError.message);
    });

    return res.json({
      success: true,
      otpRequired: true,
      email: user.email,
      maskedEmail: maskEmail(user.email),
      message: 'Enter the verification code sent to your email.',
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
// VERIFY LOGIN OTP - second step of customer login
// ============================================================
exports.verifyLoginOtp = async (req, res) => {
  const { email, code } = req.body;
  if (!email || !code) {
    return res.status(400).json({ success: false, message: 'Email and code are required' });
  }

  try {
    const { rows } = await pool.query(
      `SELECT id, first_name, last_name, email, role FROM users WHERE email = $1`,
      [email]
    );
    if (rows.length === 0) {
      return res.status(401).json({ success: false, message: 'The verification code is incorrect. Please try again.' });
    }
    const user = rows[0];

    const result = await otpService.verifyOtp(user.id, code, 'login');

    if (!result.ok) {
      await pool.query(
        `INSERT INTO login_history (user_id, status, failure_reason, ip_address, user_agent)
         VALUES ($1, 'failed', $2, $3, $4)`,
        [user.id, `OTP: ${result.reason}`, req.ip, req.headers['user-agent']]
      ).catch(() => {});
      await pool.query(
        `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, description, ip_address, user_agent)
         VALUES ($1, 'otp_failed', 'auth', $1, $2, $3, $4)`,
        [user.id, `OTP verification failed (${result.reason})`, req.ip, req.headers['user-agent']]
      ).catch(() => {});
      return res.status(401).json({ success: false, message: result.message });
    }

    const token = buildToken(user);
    await pool.query(
      `INSERT INTO login_history (user_id, status, ip_address, user_agent)
       VALUES ($1, 'success', $2, $3)`,
      [user.id, req.ip, req.headers['user-agent']]
    );
    await pool.query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, description, ip_address, user_agent)
       VALUES ($1, 'otp_verified', 'auth', $1, 'OTP verified, login completed', $2, $3)`,
      [user.id, req.ip, req.headers['user-agent']]
    ).catch(() => {});

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
    console.error('Verify OTP error:', error);
    return res.status(500).json({ success: false, message: 'Unable to verify code right now. Please try again.' });
  }
};

// ============================================================
// RESEND LOGIN OTP
// ============================================================
exports.resendLoginOtp = async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ success: false, message: 'Email is required' });
  }

  try {
    const { rows } = await pool.query(`SELECT id, first_name, email FROM users WHERE email = $1`, [email]);
    if (rows.length === 0) {
      // Don't reveal whether the account exists
      return res.json({ success: true, message: 'If that account exists, a new code has been sent.' });
    }
    const user = rows[0];

    const code = await otpService.createOtp(user.id, 'login');
    sendOtpEmail(user, code).catch((emailError) => {
      console.error('[EMAIL ERROR] Failed to resend login OTP email:', emailError.message);
    });

    return res.json({ success: true, message: 'A new verification code has been sent to your email.' });
  } catch (error) {
    if (error.code === 'OTP_COOLDOWN') {
      return res.status(429).json({ success: false, message: error.message, waitSeconds: error.waitSeconds });
    }
    console.error('Resend OTP error:', error);
    return res.status(500).json({ success: false, message: 'Unable to send a new verification code right now. Please try again.' });
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

    // password_resets' primary key is user_id, not token - conflict must target
    // that column (a prior request for the same user is replaced, invalidating
    // its old token) rather than a column with no unique constraint.
    await pool.query(
      `INSERT INTO password_resets (user_id, token, expires_at)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id) DO UPDATE SET
         token = EXCLUDED.token,
         expires_at = EXCLUDED.expires_at`,
      [user.id, resetToken, expiresAt]
    );

    const resetUrl = `${process.env.FRONTEND_URL || process.env.APP_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;

    // Not awaited, same reasoning as the OTP emails above: the reset token is
    // already stored, so a slow/unreachable SMTP server must not stall this
    // response or turn into a false "Server error" for the requester.
    sendPasswordResetEmail(user, resetUrl).catch((emailError) => {
      console.error('[EMAIL ERROR] Failed to send password reset email:', emailError.message);
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