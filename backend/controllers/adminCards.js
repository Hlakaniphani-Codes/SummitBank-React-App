const {
  listAllCards,
  setCardStatus,
  setCardVisibility,
  approveCardRequest,
  rejectCardRequest,
  replaceCard,
  cancelCard,
  createAuditLog,
} = require('../utils/adminStore');

// GET /api/admin/cards
exports.getCards = async (req, res) => {
  const { search, status } = req.query;
  try {
    const cards = await listAllCards({ search, status });
    return res.json({ success: true, cards });
  } catch (error) {
    console.error('List cards error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/admin/cards/:id/activate
exports.activateCard = async (req, res) => {
  const { id } = req.params;
  const adminId = req.userId;

  try {
    const result = await setCardStatus(id, 'active');
    await createAuditLog({
      adminId,
      action: 'activate',
      entityType: 'card',
      entityId: Number(id),
      description: `Activated card ending in ${result.last4}`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    return res.json({ success: true, message: 'Card activated', card: result });
  } catch (error) {
    console.error('Activate card error:', error);
    return res.status(400).json({ success: false, message: error.message });
  }
};

// POST /api/admin/cards/:id/deactivate
exports.deactivateCard = async (req, res) => {
  const { id } = req.params;
  const adminId = req.userId;

  try {
    const result = await setCardStatus(id, 'blocked');
    await createAuditLog({
      adminId,
      action: 'deactivate',
      entityType: 'card',
      entityId: Number(id),
      description: `Deactivated card ending in ${result.last4}`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    return res.json({ success: true, message: 'Card deactivated', card: result });
  } catch (error) {
    console.error('Deactivate card error:', error);
    return res.status(400).json({ success: false, message: error.message });
  }
};

// POST /api/admin/cards/:id/block
exports.blockCard = async (req, res) => {
  const { id } = req.params;
  const adminId = req.userId;

  try {
    const result = await setCardStatus(id, 'blocked');
    await createAuditLog({
      adminId,
      action: 'block',
      entityType: 'card',
      entityId: Number(id),
      description: `Blocked card ending in ${result.last4}`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    return res.json({ success: true, message: 'Card blocked', card: result });
  } catch (error) {
    console.error('Block card error:', error);
    return res.status(400).json({ success: false, message: error.message });
  }
};

// POST /api/admin/cards/:id/unblock
exports.unblockCard = async (req, res) => {
  const { id } = req.params;
  const adminId = req.userId;

  try {
    const result = await setCardStatus(id, 'active');
    await createAuditLog({
      adminId,
      action: 'unblock',
      entityType: 'card',
      entityId: Number(id),
      description: `Unblocked card ending in ${result.last4}`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    return res.json({ success: true, message: 'Card unblocked', card: result });
  } catch (error) {
    console.error('Unblock card error:', error);
    return res.status(400).json({ success: false, message: error.message });
  }
};

// PUT /api/admin/cards/:id/visibility
exports.toggleVisibility = async (req, res) => {
  const { id } = req.params;
  const { hidden } = req.body;
  const adminId = req.userId;

  try {
    const result = await setCardVisibility(id, hidden);
    await createAuditLog({
      adminId,
      action: hidden ? 'hide' : 'show',
      entityType: 'card',
      entityId: Number(id),
      description: `${hidden ? 'Hidden' : 'Shown'} card ending in ${result.last4}`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    return res.json({ success: true, message: `Card ${hidden ? 'hidden' : 'shown'}`, card: result });
  } catch (error) {
    console.error('Toggle visibility error:', error);
    return res.status(400).json({ success: false, message: error.message });
  }
};

// POST /api/admin/cards/:id/approve
exports.approveCard = async (req, res) => {
  const { id } = req.params;
  const adminId = req.userId;

  try {
    const result = await approveCardRequest(id, adminId);
    await createAuditLog({
      adminId,
      action: 'approve',
      entityType: 'card',
      entityId: Number(id),
      description: `Approved card request - ${result.card_type} ending in ${result.last4}`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    return res.json({ success: true, message: 'Card request approved', card: result });
  } catch (error) {
    console.error('Approve card error:', error);
    return res.status(400).json({ success: false, message: error.message });
  }
};

// POST /api/admin/cards/:id/reject
exports.rejectCard = async (req, res) => {
  const { id } = req.params;
  const adminId = req.userId;

  try {
    const result = await rejectCardRequest(id);
    await createAuditLog({
      adminId,
      action: 'reject',
      entityType: 'card',
      entityId: Number(id),
      description: `Rejected card request - ${result.card_type} ending in ${result.last4}`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    return res.json({ success: true, message: 'Card request rejected', card: result });
  } catch (error) {
    console.error('Reject card error:', error);
    return res.status(400).json({ success: false, message: error.message });
  }
};

// POST /api/admin/cards/:id/replace
exports.replaceCard = async (req, res) => {
  const { id } = req.params;
  const adminId = req.userId;

  try {
    const result = await replaceCard(id, adminId);
    await createAuditLog({
      adminId,
      action: 'replace',
      entityType: 'card',
      entityId: Number(id),
      description: `Replaced card #${id} with new card ending in ${result.newCard.last4}`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    return res.json({ success: true, message: 'Card replaced', ...result });
  } catch (error) {
    console.error('Replace card error:', error);
    return res.status(400).json({ success: false, message: error.message });
  }
};

// POST /api/admin/cards/:id/cancel
exports.cancelCard = async (req, res) => {
  const { id } = req.params;
  const adminId = req.userId;

  try {
    const result = await cancelCard(id);
    await createAuditLog({
      adminId,
      action: 'cancel',
      entityType: 'card',
      entityId: Number(id),
      description: `Cancelled card ending in ${result.last4}`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    return res.json({ success: true, message: 'Card cancelled', card: result });
  } catch (error) {
    console.error('Cancel card error:', error);
    return res.status(400).json({ success: false, message: error.message });
  }
};
