const jwt = require('jsonwebtoken');
const User = require('../models/User');

exports.verifyToken = async (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '') || req.query.token;
  if (!token) return res.status(401).json({ success: false, message: 'Access denied. No token provided.' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded || !decoded.user || !decoded.user.id) {
      return res.status(401).json({ success: false, message: 'Invalid token structure.' });
    }
    
    // Immediate revocation check
    const user = await User.findById(decoded.user.id).select('isBlocked isDeleted');
    if (!user || user.isDeleted) {
      return res.status(401).json({ success: false, message: 'Account does not exist or has been deleted.' });
    }
    if (user.isBlocked) {
      return res.status(403).json({ success: false, message: 'Account suspended. Access denied.' });
    }

    req.user = decoded.user;
    next();
  } catch (error) {
    res.status(401).json({ success: false, message: 'Invalid token.' });
  }
};

exports.isAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ success: false, message: 'Access denied. Admin only.' });
  }
};

exports.isUser = (req, res, next) => {
  if (req.user && req.user.role === 'user') {
    next();
  } else {
    res.status(403).json({ success: false, message: 'Access denied.' });
  }
};
