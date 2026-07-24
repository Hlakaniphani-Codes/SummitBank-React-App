const {
  getCardDetails,
  setCardStatus,
  requestCard,
  createNotification,
} = require('../utils/postgresStore');
const { emitToUser } = require('../services/eventEmitter');

exports.viewCard = async (req, res) => {
  const userId = req.userId;
  const cardId = req.params.cardId;

  try {
    const card = await getCardDetails(userId, cardId);
    if (!card) return res.status(404).json({ success: false, message: 'Card not found' });
    return res.json({ success: true, card });
  } catch (error) {
    console.error('View card error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch card details' });
  }
};

exports.blockCard = async (req, res) => {
  const userId = req.userId;
  const cardId = req.params.cardId;

  try {
    const card = await setCardStatus(userId, cardId, 'blocked');
    
    const now = new Date().toLocaleString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: 'numeric', minute: '2-digit', hour12: true
    });
    await createNotification(userId, 'Card Blocked', `Your card ending in ${card.last4} was blocked on ${now}. If you did not authorize this, please contact support immediately.`);
    
    // Emit real-time card update event
    emitToUser(userId, 'card-update', { action: 'blocked', card, timestamp: now });
    
    return res.json({ success: true, card, message: 'Card blocked' });
  } catch (error) {
    console.error('Block card error:', error);
    return res.status(400).json({ success: false, message: error.message || 'Failed to block card' });
  }
};

exports.activateCard = async (req, res) => {
  const userId = req.userId;
  const cardId = req.params.cardId;

  try {
    const card = await setCardStatus(userId, cardId, 'active');
    
    const now = new Date().toLocaleString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: 'numeric', minute: '2-digit', hour12: true
    });
    await createNotification(userId, 'Card Activated', `Your card ending in ${card.last4} was activated on ${now}. You can now use it for transactions.`);
    
    // Emit real-time card update event
    emitToUser(userId, 'card-update', { action: 'activated', card, timestamp: now });
    
    return res.json({ success: true, card, message: 'Card activated' });
  } catch (error) {
    console.error('Activate card error:', error);
    return res.status(400).json({ success: false, message: error.message || 'Failed to activate card' });
  }
};

exports.requestNewCard = async (req, res) => {
  const userId = req.userId;
  const { accountId, cardType, cardNetwork } = req.body;

  try {
    if (!accountId) {
      return res.status(400).json({ success: false, message: 'accountId is required' });
    }
    const card = await requestCard(userId, accountId, cardType, cardNetwork);
    
    const now = new Date().toLocaleString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: 'numeric', minute: '2-digit', hour12: true
    });
    await createNotification(userId, 'Card Request Submitted', `Your request for a new ${cardType} card (${cardNetwork}) has been submitted on ${now}. Card ending in ${card.last4}. Please wait for approval.`);
    
    // Emit real-time card update event
    emitToUser(userId, 'card-update', { action: 'requested', card, timestamp: now });
    
    return res.status(201).json({ success: true, card });
  } catch (error) {
    console.error('Request card error:', error);
    return res.status(400).json({ success: false, message: error.message });
  }
};
