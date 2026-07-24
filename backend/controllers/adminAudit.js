const {
  getLoginHistory,
  getAuditLogs,
  getUserActivity,
  getAdminActivity,
} = require('../utils/adminStore');

// GET /api/admin/audit/login-history
exports.getLoginHistory = async (req, res) => {
  const { userId, status, startDate, endDate } = req.query;
  try {
    const history = await getLoginHistory({ userId, status, startDate, endDate });
    return res.json({ success: true, history });
  } catch (error) {
    console.error('Get login history error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/admin/audit/user-activity
exports.getUserActivity = async (req, res) => {
  const { userId, startDate, endDate } = req.query;
  try {
    const activity = await getUserActivity({ userId, startDate, endDate });
    return res.json({ success: true, activity });
  } catch (error) {
    console.error('Get user activity error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/admin/audit/admin-activity
exports.getAdminActivity = async (req, res) => {
  const { adminId, action, startDate, endDate } = req.query;
  try {
    const activity = await getAdminActivity({ adminId, action, startDate, endDate });
    return res.json({ success: true, activity });
  } catch (error) {
    console.error('Get admin activity error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/admin/audit/logs
exports.getAuditLogs = async (req, res) => {
  const { action, adminId, startDate, endDate } = req.query;
  try {
    const logs = await getAuditLogs({ action, adminId, startDate, endDate });
    return res.json({ success: true, logs });
  } catch (error) {
    console.error('Get audit logs error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
