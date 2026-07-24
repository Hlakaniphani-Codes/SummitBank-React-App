const {
  listSessions,
  signOutSession,
  createNotification,
} = require('../utils/postgresStore');
const { emitToUser } = require('../services/eventEmitter');

exports.getSessions = async (req, res) => {
  const userId = req.userId;
  try {
    const sessions = await listSessions(userId);
    return res.json({ success: true, sessions });
  } catch (error) {
    console.error('Get sessions error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch sessions' });
  }
};

exports.signOut = async (req, res) => {
  const userId = req.userId;
  const { sessionId } = req.params;

  try {
    await signOutSession(userId, sessionId);
    
    const now = new Date().toLocaleString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: 'numeric', minute: '2-digit', hour12: true
    });
    await createNotification(userId, 'Session Signed Out', `A device session was signed out on ${now}. If you did not authorize this, please contact support immediately.`);
    
    return res.json({ success: true, message: 'Signed out' });
  } catch (error) {
    console.error('Sign out error:', error);
    return res.status(400).json({ success: false, message: error.message || 'Failed to sign out' });
  }
};

