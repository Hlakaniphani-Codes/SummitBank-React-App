const {
  createChequeDeposit,
  listCustomerChequeDeposits,
} = require('../utils/postgresStore');

exports.depositCheque = async (req, res) => {
  const userId = req.userId;
  const payload = req.body;
  const files = req.files || {};

  try {
    if (!payload.accountId || !payload.amount) {
      return res.status(400).json({ success: false, message: 'accountId and amount are required' });
    }

    const result = await createChequeDeposit(userId, payload, files);
    return res.status(201).json({ success: true, deposit: result, message: 'Cheque deposit submitted. Pending review.' });
  } catch (error) {
    console.error('Deposit cheque error:', error);
    return res.status(400).json({ success: false, message: error.message || 'Failed to deposit cheque' });
  }
};

exports.listDeposits = async (req, res) => {
  const userId = req.userId;
  try {
    const deposits = await listCustomerChequeDeposits(userId);
    return res.json({ success: true, deposits });
  } catch (error) {
    console.error('List deposits error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch cheque deposits' });
  }
};
