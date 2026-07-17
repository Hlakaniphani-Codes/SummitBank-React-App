const { getDashboardData } = require('../utils/mysqlStore');

exports.getDashboard = async (req, res) => {
  const userId = req.userId;
  try {
    const dashboard = await getDashboardData(userId);
    return res.json({
      success: true,
      user: {
        id: req.user?.userId || userId,
        firstName: req.user?.firstName || '',
        lastName: req.user?.lastName || '',
        email: req.user?.email || '',
      },
      ...dashboard,
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to fetch dashboard data' });
  }
};

