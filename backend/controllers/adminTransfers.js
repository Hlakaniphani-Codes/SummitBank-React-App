const {
  listPendingTransfers,
  getAllTransfers,
  updateWireTransferStatus,
  rejectTransfer,
  unblockTransfer,
  removeTransferHold,
  markTransferFailed,
  notifyCustomerTransferStatus,
  createAuditLog,
} = require('../utils/adminStore');

// GET /api/admin/transfers
exports.getTransfers = async (req, res) => {
  const { status, search } = req.query;
  try {
    const transfers = status || search 
      ? await getAllTransfers({ status, search })
      : await listPendingTransfers();
    return res.json({ success: true, transfers });
  } catch (error) {
    console.error('List transfers error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/admin/transfers/:id/approve
exports.approveTransfer = async (req, res) => {
  const { id } = req.params;
  const adminId = req.userId;

  try {
    const result = await updateWireTransferStatus(id, 'approved', adminId);
    await createAuditLog({
      adminId,
      action: 'approve',
      entityType: 'wire_transfer',
      entityId: Number(id),
      description: `Approved wire transfer #${id}`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    return res.json({ success: true, message: 'Transfer approved', transfer: result });
  } catch (error) {
    console.error('Approve transfer error:', error);
    return res.status(400).json({ success: false, message: error.message });
  }
};

// POST /api/admin/transfers/:id/block
exports.blockTransfer = async (req, res) => {
  const { id } = req.params;
  const adminId = req.userId;

  try {
    const result = await updateWireTransferStatus(id, 'blocked', adminId);
    await createAuditLog({
      adminId,
      action: 'block',
      entityType: 'wire_transfer',
      entityId: Number(id),
      description: `Blocked wire transfer #${id}`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    return res.json({ success: true, message: 'Transfer blocked', transfer: result });
  } catch (error) {
    console.error('Block transfer error:', error);
    return res.status(400).json({ success: false, message: error.message });
  }
};

// POST /api/admin/transfers/:id/hold
exports.holdTransfer = async (req, res) => {
  const { id } = req.params;
  const adminId = req.userId;

  try {
    const result = await updateWireTransferStatus(id, 'hold', adminId);
    await createAuditLog({
      adminId,
      action: 'hold',
      entityType: 'wire_transfer',
      entityId: Number(id),
      description: `Placed wire transfer #${id} on hold`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    return res.json({ success: true, message: 'Transfer placed on hold', transfer: result });
  } catch (error) {
    console.error('Hold transfer error:', error);
    return res.status(400).json({ success: false, message: error.message });
  }
};

// POST /api/admin/transfers/:id/mark-sent
exports.markSent = async (req, res) => {
  const { id } = req.params;
  const adminId = req.userId;

  try {
    const result = await updateWireTransferStatus(id, 'sent', adminId);
    await createAuditLog({
      adminId,
      action: 'mark_sent',
      entityType: 'wire_transfer',
      entityId: Number(id),
      description: `Marked wire transfer #${id} as sent`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    return res.json({ success: true, message: 'Wire transfer marked as sent', transfer: result });
  } catch (error) {
    console.error('Mark sent error:', error);
    return res.status(400).json({ success: false, message: error.message });
  }
};

// POST /api/admin/transfers/:id/mark-completed
exports.markCompleted = async (req, res) => {
  const { id } = req.params;
  const adminId = req.userId;

  try {
    const result = await updateWireTransferStatus(id, 'sent', adminId);
    await createAuditLog({
      adminId,
      action: 'mark_completed',
      entityType: 'wire_transfer',
      entityId: Number(id),
      description: `Marked wire transfer #${id} as completed`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    return res.json({ success: true, message: 'Wire transfer marked as completed', transfer: result });
  } catch (error) {
    console.error('Mark completed error:', error);
    return res.status(400).json({ success: false, message: error.message });
  }
};

// POST /api/admin/transfers/:id/mark-failed
exports.markFailed = async (req, res) => {
  const { id } = req.params;
  const { errorMessage } = req.body;
  const adminId = req.userId;

  try {
    const result = await markTransferFailed(id, adminId, errorMessage);
    await createAuditLog({
      adminId,
      action: 'mark_failed',
      entityType: 'wire_transfer',
      entityId: Number(id),
      description: `Marked wire transfer #${id} as failed`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    return res.json({ success: true, message: 'Wire transfer marked as failed', transfer: result });
  } catch (error) {
    console.error('Mark failed error:', error);
    return res.status(400).json({ success: false, message: error.message });
  }
};

// POST /api/admin/transfers/:id/reject
exports.rejectTransfer = async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;
  const adminId = req.userId;

  try {
    const result = await rejectTransfer(id, adminId, reason);
    await createAuditLog({
      adminId,
      action: 'reject',
      entityType: 'wire_transfer',
      entityId: Number(id),
      description: `Rejected wire transfer #${id}: ${reason || 'No reason provided'}`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    return res.json({ success: true, message: 'Transfer rejected', transfer: result });
  } catch (error) {
    console.error('Reject transfer error:', error);
    return res.status(400).json({ success: false, message: error.message });
  }
};

// POST /api/admin/transfers/:id/unblock
exports.unblockTransfer = async (req, res) => {
  const { id } = req.params;
  const adminId = req.userId;

  try {
    const result = await unblockTransfer(id, adminId);
    await createAuditLog({
      adminId,
      action: 'unblock',
      entityType: 'wire_transfer',
      entityId: Number(id),
      description: `Unblocked wire transfer #${id}`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    return res.json({ success: true, message: 'Transfer unblocked', transfer: result });
  } catch (error) {
    console.error('Unblock transfer error:', error);
    return res.status(400).json({ success: false, message: error.message });
  }
};

// POST /api/admin/transfers/:id/remove-hold
exports.removeTransferHold = async (req, res) => {
  const { id } = req.params;
  const adminId = req.userId;

  try {
    const result = await removeTransferHold(id, adminId);
    await createAuditLog({
      adminId,
      action: 'unhold',
      entityType: 'wire_transfer',
      entityId: Number(id),
      description: `Removed hold from wire transfer #${id}`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    return res.json({ success: true, message: 'Hold removed from transfer', transfer: result });
  } catch (error) {
    console.error('Remove hold error:', error);
    return res.status(400).json({ success: false, message: error.message });
  }
};

// POST /api/admin/transfers/:id/error-message
exports.setErrorMessage = async (req, res) => {
  const { id } = req.params;
  const { errorMessage } = req.body;
  const adminId = req.userId;

  if (!errorMessage) {
    return res.status(400).json({ success: false, message: 'Error message is required' });
  }

  try {
    const result = await updateWireTransferStatus(id, 'failed', adminId, { errorMessage });
    await createAuditLog({
      adminId,
      action: 'error_message',
      entityType: 'wire_transfer',
      entityId: Number(id),
      description: `Set error on wire transfer #${id}: ${errorMessage}`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    return res.json({ success: true, message: 'Error message set', transfer: result });
  } catch (error) {
    console.error('Set error message error:', error);
    return res.status(400).json({ success: false, message: error.message });
  }
};

// POST /api/admin/transfers/:id/notify
exports.notifyCustomer = async (req, res) => {
  const { id } = req.params;
  const adminId = req.userId;

  try {
    const result = await notifyCustomerTransferStatus(id);
    await createAuditLog({
      adminId,
      action: 'notify',
      entityType: 'wire_transfer',
      entityId: Number(id),
      description: `Notified customer about wire transfer #${id} status: ${result.status}`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    return res.json({ success: true, message: 'Customer notified', ...result });
  } catch (error) {
    console.error('Notify customer error:', error);
    return res.status(400).json({ success: false, message: error.message });
  }
};
