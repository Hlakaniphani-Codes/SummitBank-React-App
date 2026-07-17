const pool = require('../config/db');

exports.submitTicket = async (req, res) => {
  const userId = req.userId;
  const { name, email, subject, message } = req.body;

  if (!name || !email || !subject || !message) {
    return res.status(400).json({ success: false, message: 'All fields are required' });
  }

  try {
    const [result] = await pool.query(
      `INSERT INTO support_tickets (user_id, name, email, subject, message, status)
       VALUES (?, ?, ?, ?, ?, 'open')`,
      [userId, name, email, subject, message]
    );

    return res.status(201).json({
      success: true,
      message: 'Support ticket submitted successfully',
      ticketId: result.insertId,
    });
  } catch (error) {
    console.error('Support ticket error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};