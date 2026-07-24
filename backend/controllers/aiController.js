const aiService = require('../services/aiService');

exports.chat = async (req, res) => {
  const userId = req.userId;
  const { message } = req.body;

  if (!message || !message.trim()) {
    return res.status(400).json({ success: false, message: 'Message is required' });
  }

  try {
    const response = await aiService.processMessage(userId, message.trim());
    return res.json({ success: true, ...response });
  } catch (error) {
    console.error('AI chat error:', error);
    return res.status(500).json({ success: false, message: 'Failed to process message' });
  }
};

exports.history = async (req, res) => {
  const userId = req.userId;
  const limit = parseInt(req.query.limit) || 50;

  try {
    const messages = await aiService.getConversationHistory(userId, limit);
    return res.json({ success: true, messages });
  } catch (error) {
    console.error('AI history error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch conversation history' });
  }
};
