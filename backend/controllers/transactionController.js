const { getTransactions, transferMoney } = require('../utils/mysqlStore');

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
    console.error('Transfer error:', error);
    return res.status(400).json({ success: false, message: error.message || 'Failed to process transfer' });
  }
};

