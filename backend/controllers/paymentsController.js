const {
  listPayees,
  addPayee,
  listBills,
  addBill,
  payBill,
  listDocuments,
  generateStatement,
} = require('../utils/mysqlStore');

exports.getPayees = async (req, res) => {
  const userId = req.userId;
  try {
    const payees = await listPayees(userId);
    return res.json({ success: true, payees });
  } catch (error) {
    console.error('Get payees error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch payees' });
  }
};

exports.postPayee = async (req, res) => {
  const userId = req.userId;
  const { name, category, accountIdentifier } = req.body;

  try {
    if (!name || !category || !accountIdentifier) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }
    const payee = await addPayee(userId, { name, category, accountIdentifier });
    return res.status(201).json({ success: true, payee });
  } catch (error) {
    console.error('Add payee error:', error);
    return res.status(400).json({ success: false, message: error.message || 'Failed to add payee' });
  }
};

exports.getBills = async (req, res) => {
  const userId = req.userId;
  try {
    const bills = await listBills(userId);
    return res.json({ success: true, bills });
  } catch (error) {
    console.error('Get bills error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch bills' });
  }
};

exports.postBill = async (req, res) => {
  const userId = req.userId;
  const { payeeId, name, description, amount, dueDate, frequency, status } = req.body;

  try {
    if (!name || !amount || !dueDate) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }
    const bill = await addBill(userId, { payeeId, name, description, amount, dueDate, frequency, status });
    return res.status(201).json({ success: true, bill });
  } catch (error) {
    console.error('Add bill error:', error);
    return res.status(400).json({ success: false, message: error.message || 'Failed to add bill' });
  }
};

// FIXED: billId comes from req.params, fromAccountId from req.body
exports.payBill = async (req, res) => {
  const userId = req.userId;
  const billId = req.params.billId;                     // <-- from URL
  const { payeeId, amount, description, paymentDate, fromAccountId } = req.body;

  try {
    if (!billId || !amount) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }
    const payment = await payBill(userId, {
      billId,
      payeeId,
      amount,
      description,
      paymentDate,
      fromAccountId,
    });
    return res.status(201).json({ success: true, payment, message: 'Bill paid' });
  } catch (error) {
    console.error('Pay bill error:', error);
    return res.status(400).json({ success: false, message: error.message || 'Failed to pay bill' });
  }
};

exports.getDocuments = async (req, res) => {
  const userId = req.userId;
  const { docType } = req.query;
  try {
    const documents = await listDocuments(userId, docType);
    return res.json({ success: true, documents });
  } catch (error) {
    console.error('Get documents error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch documents' });
  }
};

exports.generateStatement = async (req, res) => {
  const userId = req.userId;
  const { accountId, periodStart, periodEnd } = req.body;
  if (!accountId || !periodStart || !periodEnd) {
    return res.status(400).json({ success: false, message: 'Missing required fields' });
  }
  try {
    const doc = await generateStatement(userId, accountId, periodStart, periodEnd);
    return res.status(201).json({ success: true, document: doc });
  } catch (error) {
    console.error('Generate statement error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};