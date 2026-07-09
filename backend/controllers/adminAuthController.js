const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Wrapper for async errors
const catchAsync = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

exports.adminLogin = catchAsync(async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username });

  if (!user) {
    return res.status(401).json({ success: false, message: 'Invalid credentials' });
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    return res.status(401).json({ success: false, message: 'Invalid credentials' });
  }

  if (user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Not an admin account' });
  }

  const payload = { user: { id: user._id, role: user.role } };
  const accessToken = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '24h' });
  const refreshToken = jwt.sign(payload, process.env.REFRESH_TOKEN_SECRET, { expiresIn: '7d' });

  if (!user.refreshTokens) user.refreshTokens = [];
  user.refreshTokens.push(refreshToken);
  await user.save({ validateBeforeSave: false });

  res.cookie('jwt', refreshToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'None', maxAge: 7 * 24 * 60 * 60 * 1000 });

  res.status(200).json({
    success: true,
    message: 'Admin login successful',
    data: {
      user: { id: user._id, username: user.username, email: user.email, role: 'admin' },
      accessToken
    }
  });
});
