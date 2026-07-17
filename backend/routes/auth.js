const express = require('express');
const router = express.Router();
const { register, login, uploadKyc, forgotPassword, resetPassword } = require('../controllers/authController');
const authenticate = require('../middleware/auth');
const upload = require('../middleware/upload');
const { validate, registerRules, loginRules, forgotPasswordRules, resetPasswordRules } = require('../middleware/validation');

const rateLimit = require('express-rate-limit');
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { success: false, message: 'Too many login attempts, please try again later.' },
});

// ----- DEBUG: check all handlers -----
console.log('✅ authController exports:', { register, login, forgotPassword, resetPassword });
console.log('✅ validation exports:', { registerRules, loginRules, forgotPasswordRules, resetPasswordRules });
console.log('✅ validate middleware:', validate);
console.log('✅ upload middleware:', upload);

router.post('/register', registerRules, validate, register);
router.post('/login', authLimiter, loginRules, validate, login);
router.post('/forgot-password', forgotPasswordRules, validate, forgotPassword);
router.post('/reset-password', resetPasswordRules, validate, resetPassword);
router.post('/upload-kyc', authenticate, upload.array('kycFiles', 10), uploadKyc);

module.exports = router;