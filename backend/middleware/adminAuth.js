const jwt = require('jsonwebtoken');
require('dotenv').config();

/**
 * Middleware to verify the user is authenticated AND has admin/super_admin role.
 */
const requireAdmin = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Unauthorized: No token provided' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret');
    
    // Check if user has admin role
    if (decoded.role !== 'admin' && decoded.role !== 'super_admin') {
      return res.status(403).json({ success: false, message: 'Forbidden: Admin access required' });
    }

    req.userId = decoded.userId;
    req.user = decoded;
    req.adminRole = decoded.role;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Unauthorized: Invalid token' });
  }
};

/**
 * Middleware to verify the user is a super_admin.
 */
const requireSuperAdmin = (req, res, next) => {
  // First run the admin check
  requireAdmin(req, res, () => {
    if (req.adminRole !== 'super_admin') {
      return res.status(403).json({ success: false, message: 'Forbidden: Super admin access required' });
    }
    next();
  });
};

module.exports = { requireAdmin, requireSuperAdmin };
