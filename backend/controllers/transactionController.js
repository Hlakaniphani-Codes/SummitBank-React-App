const { getTransactions, transferMoney } = require('../utils/postgresStore');
const { sendError } = require('../utils/apiError');
const { isRestrictionCode } = require('../utils/accountStatus');
const { sendTransactionDeclinedEmail } = require('../services/emailService');

exports.getTransactions = async (req, res) => {
  const userId = req.userId;
  const { type, search, startDate, endDate } = req.query;

  try {
    const transactions = await getTransactions(userId, { type, search, startDate, endDate });
    return res.json(transactions);
  } catch (error) {
    console.error('Transactions error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch transactions' });
  }
};

exports.transfer = async (req, res) => {
  const userId = req.userId;
  const { fromAccountId, toAccountId, amount, description, date } = req.body;

  try {
    const result = await transferMoney(userId, { fromAccountId, toAccountId, amount, description, date });
    return res.json({ success: true, message: 'Transfer successful', transactionId: result.transactionId });
  } catch (error) {
    // A restriction (frozen / on hold / closed / suspended) stopped the
    // transfer - let the customer know by email too, not just the on-screen
    // dialog. Fire-and-forget so a slow mail server never delays the response.
    if (isRestrictionCode(error && error.code)) {
      sendTransactionDeclinedEmail(userId, {
        operation: 'Transfer',
        amount,
        reason: error.message,
      }).catch((mailErr) => console.error('[EMAIL ERROR] transfer declined notice:', mailErr.message));
    }
    return sendError(res, error, { logLabel: 'Transfer error', fallbackMessage: 'Failed to process transfer' });
  }
};

