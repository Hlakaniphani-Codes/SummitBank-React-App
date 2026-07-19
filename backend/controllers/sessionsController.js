const {
  listSessions,
  signOutSession,
} = require('../utils/postgresStore');

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
    return res.json({ success: true, message: 'Signed out' });
  } catch (error) {
    console.error('Sign out error:', error);
    return res.status(400).json({ success: false, message: error.message || 'Failed to sign out' });
  }
};

