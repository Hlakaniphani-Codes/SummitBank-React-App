const {
  getUserProfile,
  updateUserProfile,
  changePassword,
  createNotification,
} = require('../utils/postgresStore');
const { emitToUser } = require('../services/eventEmitter');

exports.getProfile = async (req, res) => {
  const userId = req.userId;
  try {
    const profile = await getUserProfile(userId);
    if (!profile) return res.status(404).json({ success: false, message: 'User not found' });
    return res.json({ success: true, profile });
  } catch (error) {
    console.error('Get profile error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateProfile = async (req, res) => {
  const userId = req.userId;
  const updates = req.body;
  try {
    const profile = await updateUserProfile(userId, updates);
    return res.json({ success: true, profile });
  } catch (error) {
    console.error('Update profile error:', error);
    return res.status(400).json({ success: false, message: error.message });
  }
};

exports.changePassword = async (req, res) => {
  const userId = req.userId;
  const { oldPassword, newPassword } = req.body;
  if (!oldPassword || !newPassword) {
    return res.status(400).json({ success: false, message: 'Both old and new password are required' });
  }
  try {
    await changePassword(userId, oldPassword, newPassword);
    
    const now = new Date().toLocaleString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: 'numeric', minute: '2-digit', hour12: true
    });
    await createNotification(userId, 'Password Changed', `Your account password was changed on ${now}. If you did not make this change, please contact support immediately.`);
    
    // Emit real-time event
    emitToUser(userId, 'security-update', { action: 'password-changed', timestamp: now });
    
    return res.json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    return res.status(400).json({ success: false, message: error.message });
  }
};

