const jwt = require('jsonwebtoken');
const { User } = require('../models');

/**
 * verifyToken – extracts Bearer token from Authorization header,
 * verifies it with JWT_SECRET, looks up the user and attaches req.user.
 */
const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findByPk(decoded.id, {
      attributes: { exclude: ['password'] },
    });
    if (!user) {
      return res.status(401).json({ success: false, message: 'User no longer exists' });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
};

/**
 * requireRole – middleware factory for role-based access control.
 * Usage: requireRole('admin')
 */
const requireRole = (role) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }
  if (req.user.role !== role) {
    return res.status(403).json({ success: false, message: `Role '${role}' required` });
  }
  next();
};

module.exports = { verifyToken, requireRole };
