const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const asyncHandler = require("../middleware/asyncHandler");

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
exports.register = asyncHandler(async (req, res) => {
  const { username, email, mobile, password, confirmPassword } = req.body;

  // 1. Validation for all fields
  if (!username || !email || !mobile || !password || !confirmPassword) {
    const error = new Error('All fields are required');
    error.status = 400;
    throw error;
  }

  // 2. Validate passwords match
  if (password !== confirmPassword) {
    const error = new Error('Passwords do not match');
    error.status = 400;
    throw error;
  }

  // 3. Strict regex-based validation (for extra safety)
  const usernameRegex = /^[a-zA-Z0-9_]{3,30}$/;
  if (!usernameRegex.test(username)) {
    const error = new Error(
      'Username must be 3-30 characters long and contain only letters, numbers, and underscores'
    );

    error.status = 400;
    throw error;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const lowerEmail = email.toLowerCase();
  if (!emailRegex.test(lowerEmail)) {
    const error = new Error('Please provide a valid email address');
    error.status = 400;
    throw error;
  }

  const mobileRegex = /^[6-9]\d{9}$/;
  if (!mobileRegex.test(mobile)) {
    const error = new Error('Mobile number must be a valid 10-digit Indian number starting with 6-9');
    error.status = 400;
    throw error;
  }

  if (password.length < 6) {
    const error = new Error('Password must be at least 6 characters long');
    error.status = 400;
    throw error;
  }

  // 4. Check duplicate username
  const existingUsername = await User.findOne({ username });
  if (existingUsername) {
    const error = new Error('Username is already taken');
    error.status = 400;
    throw error;
  }

  const existingEmail = await User.findOne({ email: lowerEmail });
  if (existingEmail) {
    const error = new Error('Email is already registered');
    error.status = 400;
    throw error;
  }

  // 6. Password hashing using bcryptjs
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  // 7. Create User
  const newUser = new User({
    username,
    email: lowerEmail,
    mobile,
    password: hashedPassword
  });

  await newUser.save();

  res.status(201).json({
    success: true,
    message: 'Registration successful! Please login to continue.'
  });
});

// @desc    Authenticate user and get token
// @route   POST /api/auth/login
// @access  Public
exports.login = asyncHandler(async (req, res) => {
  const { username, password } = req.body;

  // 1. Validation for all fields
  if (!username || !password) {
    const error = new Error('Username and password are required');
    error.status = 400;
    throw error;
  }

  // 2. Check if user exists
  const user = await User.findOne({ username });
  if (!user) {
    const error = new Error('Invalid username or password');
    error.status = 400;
    throw error;
  }

  // Restrict admins from logging in as customers
  if (user.role !== 'user') {
    const error = new Error('Access denied. Admins must login via the admin portal.');
    error.status = 403;
    throw error;
  }

  if (user.isBlocked) {
    const error = new Error(
      `Your account has been blocked. Reason: ${user.blockedReason || 'Admin Action'}`
    );

    error.status = 403;
    throw error;
  }

  // 3. Verify password
  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    const error = new Error('Invalid username or password');
    error.status = 400;
    throw error;
  }

  // 4. JWT token generation on login
  const payload = {
    user: {
      id: user._id,
      username: user.username,
      role: user.role
    }
  };

  const token = jwt.sign(
    payload,
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );

  // 5. Respond with token and user profile details
  res.status(200).json({
    success: true,
    message: 'Login successful!',
    token,
    user: {
      id: user._id,
      username: user.username,
      email: user.email,
      mobile: user.mobile,
      address: user.address || null
    }
  });
});

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
exports.updateProfile = asyncHandler(async (req, res) => {
  const { username, email, mobile, password } = req.body;
  const userId = req.user.id;

  // Check if user exists
  const user = await User.findById(userId);
  if (!user) {
    const error = new Error('User not found');
    error.status = 404;
    throw error;
  }

  // Check duplicate username if changing
  if (username && username !== user.username) {
    const existingUsername = await User.findOne({ username });
    if (existingUsername) {
      const error = new Error('Username is already taken');
      error.status = 400;
      throw error;
    }
    const usernameRegex = /^[a-zA-Z0-9_]{3,30}$/;
    if (!usernameRegex.test(username)) {
      const error = new Error(
        'Username must be 3-30 characters long and contain only letters, numbers, and underscores'
      );

      error.status = 400;
      throw error;
    }
    user.username = username;
  }

  // Check duplicate email if changing
  if (email) {
    const lowerEmail = email.toLowerCase();
    if (lowerEmail !== user.email) {
      const existingEmail = await User.findOne({ email: lowerEmail });
      if (existingEmail) {
        const error = new Error('Email is already registered');
        error.status = 400;
        throw error;
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(lowerEmail)) {
        const error = new Error('Please provide a valid email address');
        error.status = 400;
        throw error;
      }
      user.email = lowerEmail;
    }
  }

  // Update mobile if provided
  if (mobile && mobile !== user.mobile) {
    const mobileRegex = /^[6-9]\d{9}$/;
    if (!mobileRegex.test(mobile)) {
      const error = new Error('Mobile number must be a valid 10-digit Indian number starting with 6-9');
      error.status = 400;
      throw error;
    }
    user.mobile = mobile;
  }

  // Update password if provided
  if (password) {
    if (password.length < 6) {
      const error = new Error('Password must be at least 6 characters long');
      error.status = 400;
      throw error;
    }
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);
  }

  // Update address if provided
  const { address } = req.body;
  if (address && typeof address === 'object') {
    const allowedFields = ['fullName', 'mobile', 'street', 'pincode', 'city', 'state'];
    const sanitizedAddress = {};
    allowedFields.forEach(field => {
      if (address[field] !== undefined) {
        sanitizedAddress[field] = String(address[field]).trim().substring(0, 200);
      }
    });
    // Validate pincode if provided
    if (sanitizedAddress.pincode && !/^\d{6}$/.test(sanitizedAddress.pincode)) {
      const error = new Error('Pincode must be a 6-digit number');
      error.status = 400;
      throw error;
    }
    // Validate address mobile if provided
    if (sanitizedAddress.mobile && !/^[6-9]\d{9}$/.test(sanitizedAddress.mobile)) {
      const error = new Error('Address mobile must be a valid 10-digit Indian number');
      error.status = 400;
      throw error;
    }
    user.address = { ...((user.address || {})), ...sanitizedAddress };
  }

  await user.save();

  res.status(200).json({
    success: true,
    message: 'Profile updated successfully',
    user: {
      id: user._id,
      username: user.username,
      email: user.email,
      mobile: user.mobile,
      address: user.address || null
    }
  });
});
