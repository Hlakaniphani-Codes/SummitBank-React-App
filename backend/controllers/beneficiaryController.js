const {
  listBeneficiaries,
  addBeneficiary,
  removeBeneficiary,
} = require('../utils/postgresStore');

exports.getBeneficiaries = async (req, res) => {
  const userId = req.userId;
  try {
    const beneficiaries = await listBeneficiaries(userId);
    return res.json({ success: true, beneficiaries });
  } catch (error) {
    console.error('Get beneficiaries error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch beneficiaries' });
  }
};

exports.postBeneficiary = async (req, res) => {
  const userId = req.userId;
  const { name, bankName, accountIdentifier } = req.body;

  try {
    if (!name || !bankName || !accountIdentifier) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }
    const beneficiary = await addBeneficiary(userId, { name, bankName, accountIdentifier });
    return res.status(201).json({ success: true, beneficiary });
  } catch (error) {
    console.error('Add beneficiary error:', error);
    return res.status(400).json({ success: false, message: error.message || 'Failed to add beneficiary' });
  }
};

exports.deleteBeneficiary = async (req, res) => {
  const userId = req.userId;
  const { beneficiaryId } = req.params;

  try {
    await removeBeneficiary(userId, beneficiaryId);
    return res.json({ success: true, message: 'Beneficiary removed' });
  } catch (error) {
    console.error('Remove beneficiary error:', error);
    return res.status(400).json({ success: false, message: error.message || 'Failed to remove beneficiary' });
  }
};

