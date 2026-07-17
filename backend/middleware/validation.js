const { body, param, query, validationResult } = require('express-validator');

// Middleware to check validation results
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }
  next();
};

// ----- Auth validation rules -----
const registerRules = [
  body('firstName').notEmpty().withMessage('First name is required'),
  body('lastName').notEmpty().withMessage('Last name is required'),
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('confirmPassword').custom((value, { req }) => value === req.body.password).withMessage('Passwords do not match'),
  // Accept boolean OR "true" string (frontend/HTML often sends "true")
  body('terms')
    .custom((value) => value === true || value === 'true' || value === 1 || value === '1')
    .withMessage('You must accept the terms'),
];

const loginRules = [
  body('email').isEmail().withMessage('Valid email required'),
  body('password').notEmpty().withMessage('Password required'),
];

const forgotPasswordRules = [
  body('email').isEmail().withMessage('Valid email required'),
];

const resetPasswordRules = [
  body('token').notEmpty().withMessage('Reset token required'),
  body('newPassword').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('confirmPassword').custom((value, { req }) => value === req.body.newPassword).withMessage('Passwords do not match'),
];

// Transfer validation
const transferRules = [
  body('fromAccountId').isNumeric().withMessage('Invalid source account'),
  body('toAccountId').isNumeric().withMessage('Invalid destination account'),
  body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be greater than 0'),
  body('description').optional().isString().trim(),
  body('date').optional().isISO8601().toDate().withMessage('Invalid date format'),
];

// Bill payment validation
const payBillRules = [
  body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be greater than 0'),
  body('paymentDate').optional().isISO8601().toDate().withMessage('Invalid date'),
  body('fromAccountId').isNumeric().withMessage('Invalid source account'),
];

// Card action validation
const cardActionRules = [
  param('cardId').isNumeric().withMessage('Invalid card ID'),
];

// Beneficiary validation
const beneficiaryRules = [
  body('name').notEmpty().withMessage('Name is required'),
  body('bankName').notEmpty().withMessage('Bank name is required'),
  body('accountIdentifier').notEmpty().withMessage('Account identifier is required'),
];

// Payee validation
const payeeRules = [
  body('name').notEmpty().withMessage('Name is required'),
  body('category').notEmpty().withMessage('Category is required'),
  body('accountIdentifier').notEmpty().withMessage('Account identifier is required'),
];

// Bill rules
const billRules = [
  body('name').notEmpty().withMessage('Bill name is required'),
  body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be greater than 0'),
  body('dueDate').isISO8601().toDate().withMessage('Invalid due date'),
  body('frequency').optional().isIn(['one-time', 'monthly', 'quarterly', 'yearly']),
  body('status').optional().isIn(['upcoming', 'due', 'paid', 'cancelled']),
];

// Support ticket rules
const supportRules = [
  body('name').notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email required'),
  body('subject').notEmpty().withMessage('Subject is required'),
  body('message').notEmpty().withMessage('Message is required'),
];

// Profile update rules
const profileUpdateRules = [
  body('firstName').optional().notEmpty(),
  body('lastName').optional().notEmpty(),
  body('phone').optional().isMobilePhone().withMessage('Invalid phone number'),
  // Add other fields as needed
];

module.exports = {
  validate,
  registerRules,
  loginRules,
  forgotPasswordRules,
  resetPasswordRules,
  transferRules,
  payBillRules,
  cardActionRules,
  beneficiaryRules,
  payeeRules,
  billRules,
  supportRules,
  profileUpdateRules,
};