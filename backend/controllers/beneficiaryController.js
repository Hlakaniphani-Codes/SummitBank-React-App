const {
  listBeneficiaries,
  addBeneficiary,
  removeBeneficiary,
  createNotification,
} = require('../utils/postgresStore');
const { emitToUser } = require('../services/eventEmitter');

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
    
    // Create notification
    const now = new Date().toLocaleString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: 'numeric', minute: '2-digit', hour12: true
    });
    await createNotification(userId, 'Beneficiary Added', `Beneficiary "${name}" (${bankName}) was added to your account on ${now}.`);
    
    // Emit real-time event
    emitToUser(userId, 'beneficiary-update', { action: 'add', beneficiary });
    
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
    
    const now = new Date().toLocaleString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: 'numeric', minute: '2-digit', hour12: true
    });
    await createNotification(userId, 'Beneficiary Removed', `A beneficiary was removed from your account on ${now}.`);
    
    // Emit real-time event
    emitToUser(userId, 'beneficiary-update', { action: 'remove', beneficiaryId });
    
    return res.json({ success: true, message: 'Beneficiary removed' });
  } catch (error) {
    console.error('Remove beneficiary error:', error);
    return res.status(400).json({ success: false, message: error.message || 'Failed to remove beneficiary' });
  }
};

