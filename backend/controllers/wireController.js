const {
  createWireTransfer,
  listCustomerWireTransfers,
  getWireTransferDetails,
} = require('../utils/postgresStore');
const { sendError } = require('../utils/apiError');
const { isRestrictionCode } = require('../utils/accountStatus');
const { sendTransactionDeclinedEmail } = require('../services/emailService');

exports.createWire = async (req, res) => {
  const userId = req.userId;
  const payload = req.body;

  try {
    const required = ['fromAccountId', 'beneficiaryName', 'beneficiaryBank', 'beneficiaryAccount', 'amount'];
    for (const field of required) {
      if (!payload[field]) {
        return res.status(400).json({ success: false, message: `${field} is required` });
      }
    }

    const result = await createWireTransfer(userId, payload);
    return res.status(201).json({ success: true, wire: result, message: 'Wire transfer initiated. Pending review.' });
  } catch (error) {
    // Restriction decline -> email the customer as well as showing the dialog.
    if (isRestrictionCode(error && error.code)) {
      sendTransactionDeclinedEmail(userId, {
        operation: 'Wire transfer',
        amount: payload.amount,
        currency: payload.currency,
        beneficiary: payload.beneficiaryName,
        reason: error.message,
      }).catch((mailErr) => console.error('[EMAIL ERROR] wire declined notice:', mailErr.message));
    }
    return sendError(res, error, { logLabel: 'Create wire error', fallbackMessage: 'Failed to create wire transfer' });
  }
};

exports.listWires = async (req, res) => {
  const userId = req.userId;
  try {
    const wires = await listCustomerWireTransfers(userId);
    return res.json({ success: true, wires });
  } catch (error) {
    console.error('List wires error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch wire transfers' });
  }
};

exports.getWire = async (req, res) => {
  const userId = req.userId;
  const wireId = req.params.wireId;

  try {
    const wire = await getWireTransferDetails(userId, wireId);
    if (!wire) return res.status(404).json({ success: false, message: 'Wire transfer not found' });
    return res.json({ success: true, wire });
  } catch (error) {
    console.error('Get wire error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch wire transfer details' });
  }
};
