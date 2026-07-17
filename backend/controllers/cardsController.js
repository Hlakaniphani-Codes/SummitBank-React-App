const {
  getCardDetails,
  setCardStatus,
  requestCard,
} = require('../utils/mysqlStore');

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
    return res.status(201).json({ success: true, card });
  } catch (error) {
    console.error('Request card error:', error);
    return res.status(400).json({ success: false, message: error.message });
  }
};