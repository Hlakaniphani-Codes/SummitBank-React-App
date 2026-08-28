const crypto = require('crypto');
const bcrypt = require('bcrypt');
const pool = require('../config/db');

const OTP_LENGTH = parseInt(process.env.OTP_LENGTH || '6', 10);
const OTP_EXPIRY_MINUTES = parseInt(process.env.OTP_EXPIRY_MINUTES || '5', 10);
const OTP_MAX_ATTEMPTS = parseInt(process.env.OTP_MAX_ATTEMPTS || '5', 10);
const OTP_RESEND_COOLDOWN_SECONDS = parseInt(process.env.OTP_RESEND_COOLDOWN_SECONDS || '60', 10);

// Cryptographically secure, zero-padded to OTP_LENGTH - never Math.random().
const generateOtp = () => {
  const max = 10 ** OTP_LENGTH;
  const code = crypto.randomInt(0, max);
  return String(code).padStart(OTP_LENGTH, '0');
};

const getLatestOtp = async (userId, purpose) => {
  const result = await pool.query(
    `SELECT id, otp_hash, expires_at, attempts, verified_at, created_at
     FROM otp_verifications
     WHERE user_id = $1 AND purpose = $2
     ORDER BY created_at DESC
     LIMIT 1`,
    [userId, purpose]
  );
  return result.rows[0] || null;
};

// Creates a new OTP, enforcing the resend cooldown against the previous one.
// Only the latest row per (user, purpose) is ever treated as "active" -
// requesting a new code implicitly retires any earlier unverified one.
const createOtp = async (userId, purpose = 'login') => {
  const latest = await getLatestOtp(userId, purpose);
  if (latest && !latest.verified_at) {
    const secondsSinceLast = (Date.now() - new Date(latest.created_at).getTime()) / 1000;
    if (secondsSinceLast < OTP_RESEND_COOLDOWN_SECONDS) {
      const waitSeconds = Math.ceil(OTP_RESEND_COOLDOWN_SECONDS - secondsSinceLast);
      const err = new Error(`Please wait ${waitSeconds}s before requesting a new code.`);
      err.code = 'OTP_COOLDOWN';
      err.waitSeconds = waitSeconds;
      throw err;
    }
  }

  const code = generateOtp();
  const otpHash = await bcrypt.hash(code, 10);
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

  await pool.query(
    `INSERT INTO otp_verifications (user_id, purpose, otp_hash, expires_at)
     VALUES ($1, $2, $3, $4)`,
    [userId, purpose, otpHash, expiresAt]
  );

  return code;
};

// Timing-safe verification via bcrypt.compare, matching the existing password-check
// pattern elsewhere in this app - never a raw string comparison on the hash or code.
const verifyOtp = async (userId, submittedCode, purpose = 'login') => {
  const latest = await getLatestOtp(userId, purpose);
  if (!latest) {
    return { ok: false, reason: 'NOT_FOUND', message: 'No verification code found. Please request a new one.' };
  }
  if (latest.verified_at) {
    return { ok: false, reason: 'ALREADY_USED', message: 'This code has already been used. Please request a new one.' };
  }
  if (new Date(latest.expires_at).getTime() < Date.now()) {
    return { ok: false, reason: 'EXPIRED', message: 'This verification code has expired. Please request a new code.' };
  }
  if (latest.attempts >= OTP_MAX_ATTEMPTS) {
    return { ok: false, reason: 'TOO_MANY_ATTEMPTS', message: 'Too many verification attempts. Please request a new code.' };
  }

  const match = await bcrypt.compare(String(submittedCode || ''), latest.otp_hash);
  if (!match) {
    await pool.query('UPDATE otp_verifications SET attempts = attempts + 1 WHERE id = $1', [latest.id]);
    const attemptsLeft = OTP_MAX_ATTEMPTS - (latest.attempts + 1);
    return {
      ok: false,
      reason: attemptsLeft <= 0 ? 'TOO_MANY_ATTEMPTS' : 'INCORRECT',
      message: attemptsLeft <= 0
        ? 'Too many verification attempts. Please request a new code.'
        : 'The verification code is incorrect. Please try again.',
    };
  }

  await pool.query('UPDATE otp_verifications SET verified_at = NOW() WHERE id = $1', [latest.id]);
  return { ok: true };
};

module.exports = {
  OTP_LENGTH,
  OTP_EXPIRY_MINUTES,
  OTP_MAX_ATTEMPTS,
  OTP_RESEND_COOLDOWN_SECONDS,
  generateOtp,
  createOtp,
  verifyOtp,
};
