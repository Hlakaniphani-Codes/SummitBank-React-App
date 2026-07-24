const {
  createPopupNotification,
  broadcastNotification,
  createAuditLog,
  getCustomerDetails,
} = require('../utils/adminStore');
const { sendCustomEmail } = require('../services/emailService');

// POST /api/admin/notifications/popup
exports.sendPopup = async (req, res) => {
  const { userId, title, description } = req.body;
  const adminId = req.userId;

  if (!userId || !title || !description) {
    return res.status(400).json({ success: false, message: 'userId, title, and description are required' });
  }

  try {
    const notification = await createPopupNotification(userId, title, description);
    await createAuditLog({
      adminId,
      action: 'send_popup',
      entityType: 'notification',
      entityId: notification.id,
      description: `Sent popup notification to user #${userId}: ${title}`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    return res.json({ success: true, message: 'Popup notification sent', notification });
  } catch (error) {
    console.error('Send popup error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/admin/notifications/email
exports.emailCustomer = async (req, res) => {
  const { userId, subject, message } = req.body;
  const adminId = req.userId;

  if (!userId || !subject || !message) {
    return res.status(400).json({ success: false, message: 'userId, subject, and message are required' });
  }

  try {
    const customer = await getCustomerDetails(userId);
    if (!customer) return res.status(404).json({ success: false, message: 'Customer not found' });

    await sendCustomEmail(customer.email, subject, message);

    await createAuditLog({
      adminId,
      action: 'send_email',
      entityType: 'user',
      entityId: Number(userId),
      description: `Emailed customer #${userId} (${customer.email}): ${subject}`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return res.json({ success: true, message: 'Email sent to customer' });
  } catch (error) {
    console.error('Email customer error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/admin/notifications/broadcast
exports.broadcast = async (req, res) => {
  const { title, description, role } = req.body;
  const adminId = req.userId;

  if (!title || !description) {
    return res.status(400).json({ success: false, message: 'Title and description are required' });
  }

  try {
    const result = await broadcastNotification(title, description, role || 'customer');
    await createAuditLog({
      adminId,
      action: 'broadcast',
      entityType: 'notification',
      description: `Broadcast notification to ${role || 'customer'} users: ${title} (${result.count} recipients)`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    return res.json({ success: true, message: 'Broadcast sent', recipients: result.count });
  } catch (error) {
    console.error('Broadcast error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
