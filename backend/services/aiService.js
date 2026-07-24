/**
 * AI Assistant Service
 * Provides AI-powered chat support for banking FAQs and customer assistance.
 * This is a placeholder that returns predefined responses.
 * In production, integrate with OpenAI, Anthropic, or another LLM provider.
 */

const pool = require('../config/db');

/**
 * Process a user message and return an AI response
 * @param {number} userId - The user's ID
 * @param {string} message - The user's message
 * @param {object} options - Additional options
 * @returns {Promise<object>} AI response
 */
const processMessage = async (userId, message, options = {}) => {
  try {
    // Store user message
    await pool.query(
      `INSERT INTO ai_conversations (user_id, role, message) VALUES ($1, 'user', $2)`,
      [userId, message]
    );

    // Generate response based on intents
    const response = await generateResponse(userId, message);

    // Store AI response
    const result = await pool.query(
      `INSERT INTO ai_conversations (user_id, role, message) VALUES ($1, 'assistant', $2) RETURNING id`,
      [userId, response]
    );

    return {
      id: result.rows[0].id,
      message: response,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error('AI service error:', error);
    return {
      id: null,
      message: "I'm sorry, I'm experiencing technical difficulties. Please try again later.",
      timestamp: new Date().toISOString(),
    };
  }
};

/**
 * Generate an AI response based on user message intents
 * @param {number} userId - The user's ID
 * @param {string} message - The user's message
 * @returns {Promise<string>} The AI response
 */
const generateResponse = async (userId, message) => {
  const lowerMsg = message.toLowerCase().trim();

  // Banking FAQs
  if (lowerMsg.includes('balance') || lowerMsg.includes('how much money') || lowerMsg.includes('account balance')) {
    try {
      const result = await pool.query(
        'SELECT SUM(balance) AS total FROM accounts WHERE user_id = $1 AND status = $2',
        [userId, 'active']
      );
      const balance = Number(result.rows[0]?.total || 0).toFixed(2);
      return `Your current total account balance is $${balance}. Would you like details on specific accounts?`;
    } catch {
      return "I couldn't retrieve your balance right now. Please try again or check your dashboard.";
    }
  }

  if (lowerMsg.includes('transfer') || lowerMsg.includes('send money') || lowerMsg.includes('wire')) {
    return `You can transfer money between your own accounts or to beneficiaries. Go to **Payments > Transfer** to get started. For wire transfers, use **Payments > Wire Transfer**. Both require an active checking account.`;
  }

  if (lowerMsg.includes('card') || lowerMsg.includes('debit') || lowerMsg.includes('credit')) {
    return `You can view your cards, request a new card, or block/unblock existing cards in the **Cards** section. New card requests are subject to review and approval.`;
  }

  if (lowerMsg.includes('help') || lowerMsg.includes('support') || lowerMsg.includes('contact')) {
    return `You can contact our support team by submitting a ticket in the **Support** section. We typically respond within 1-2 business days. You can also email us or call during business hours.`;
  }

  if (lowerMsg.includes('payment') || lowerMsg.includes('bill') || lowerMsg.includes('pay')) {
    return `You can manage bill payments and payees in the **Payments** section. Add a payee, set up bills, and schedule payments. You'll need a checking account with sufficient funds.`;
  }

  if (lowerMsg.includes('statement') || lowerMsg.includes('document') || lowerMsg.includes('history')) {
    return `You can view your transaction history in the **Transactions** section. Bank statements can be generated from the **Documents** section.`;
  }

  if (lowerMsg.includes('login') || lowerMsg.includes('password') || lowerMsg.includes('forgot') || lowerMsg.includes('reset')) {
    return `If you forgot your password, click **Forgot Password** on the login page. For security concerns, please contact support immediately.`;
  }

  if (lowerMsg.includes('interest') || lowerMsg.includes('apy') || lowerMsg.includes('rate')) {
    return `Our savings accounts currently earn **4.25% APY**. Checking accounts do not earn interest. Rates are subject to change.`;
  }

  if (lowerMsg.includes('fee') || lowerMsg.includes('charge') || lowerMsg.includes('cost')) {
    return `Wire transfers include a $25 fee. There are no monthly maintenance fees for standard checking and savings accounts. Overdraft fees may apply. Refer to our fee schedule for details.`;
  }

  if (lowerMsg.includes('hello') || lowerMsg.includes('hi') || lowerMsg.includes('hey') || lowerMsg.includes('good')) {
    return `Hello! Welcome to Summit Shares Banking. I'm your AI assistant. How can I help you today? You can ask about balances, transfers, cards, payments, statements, or any other banking question.`;
  }

  // Default response for unrecognized queries
  return `I understand you're asking about "${message}". For the most accurate assistance, I recommend:\n\n1. Check your **Dashboard** for account overview\n2. Visit the **Support** section to submit a ticket\n3. Use specific keywords like "balance", "transfer", "card", "payment", or "statement"\n\nHow can I better assist you today?`;
};

/**
 * Get conversation history for a user
 * @param {number} userId - The user's ID
 * @param {number} limit - Max number of messages to return
 * @returns {Promise<Array>} Conversation history
 */
const getConversationHistory = async (userId, limit = 50) => {
  try {
    const result = await pool.query(
      `SELECT id, role, message, created_at
       FROM ai_conversations
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [userId, limit]
    );
    return result.rows.reverse();
  } catch (error) {
    console.error('Get conversation history error:', error);
    return [];
  }
};

module.exports = {
  processMessage,
  getConversationHistory,
};
