const express = require('express');
const router = express.Router();
const { register, login, verifyLoginOtp, resendLoginOtp, uploadKyc, forgotPassword, resetPassword } = require('../controllers/authController');
const authenticate = require('../middleware/auth');
const upload = require('../middleware/upload');
const { validate, registerRules, loginRules, forgotPasswordRules, resetPasswordRules } = require('../middleware/validation');

const rateLimit = require('express-rate-limit');

// Separate limiters per step - these used to share one 8-req/15min bucket,
// which meant a couple of mistyped OTP digits could lock a legitimate user
// out of logging in at all. Verify/resend get more headroom since the OTP
// itself is already protected by otpService's own attempt cap and cooldown;
// this limiter is just a secondary net, not the primary defense there.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many login attempts, please try again later.' },
});
const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many attempts, please try again later.' },
});

router.post('/register', registerRules, validate, register);
router.post('/login', loginLimiter, loginRules, validate, login);
router.post('/login/verify-otp', otpLimiter, verifyLoginOtp);
router.post('/login/resend-otp', otpLimiter, resendLoginOtp);
router.post('/forgot-password', forgotPasswordRules, validate, forgotPassword);
router.post('/reset-password', resetPasswordRules, validate, resetPassword);
router.post('/upload-kyc', authenticate, upload.array('kycFiles', 10), uploadKyc);

module.exports = router;