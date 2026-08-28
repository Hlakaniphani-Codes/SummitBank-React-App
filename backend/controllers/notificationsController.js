const { listNotifications, markNotificationRead, deleteNotification, deleteAllNotifications } = require('../utils/postgresStore');

exports.getNotifications = async (req, res) => {
  const userId = req.userId;
  const { unreadOnly } = req.query;
  try {
    const notifications = await listNotifications(userId, unreadOnly === 'true');
    return res.json({ success: true, notifications });
  } catch (error) {
    console.error('Get notifications error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.markRead = async (req, res) => {
  const userId = req.userId;
  const { id } = req.params;
  try {
    await markNotificationRead(userId, id);
    return res.json({ success: true, message: 'Notification marked as read' });
  } catch (error) {
    console.error('Mark read error:', error);
    return res.status(400).json({ success: false, message: error.message });
  }
};

exports.deleteOne = async (req, res) => {
  const userId = req.userId;
  const { id } = req.params;
  try {
    await deleteNotification(userId, id);
    return res.json({ success: true, message: 'Notification deleted' });
  } catch (error) {
    console.error('Delete notification error:', error);
    return res.status(400).json({ success: false, message: error.message });
  }
};

exports.deleteAll = async (req, res) => {
  const userId = req.userId;
  try {
    const result = await deleteAllNotifications(userId);
    return res.json({ success: true, message: 'Notifications cleared', count: result.count });
  } catch (error) {
    console.error('Clear notifications error:', error);
    return res.status(400).json({ success: false, message: error.message });
  }
};

