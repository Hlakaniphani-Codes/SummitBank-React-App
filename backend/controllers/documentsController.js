const { listDocuments, generateStatement } = require('../utils/postgresStore');

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

// NEW: Generate a statement
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

