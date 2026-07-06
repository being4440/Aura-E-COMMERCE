const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res) => {
  try {
    const { username, email, mobile, password, confirmPassword } = req.body;

    // 1. Validation for all fields
    if (!username || !email || !mobile || !password || !confirmPassword) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // 2. Validate passwords match
    if (password !== confirmPassword) {
      return res.status(400).json({ message: 'Passwords do not match' });
    }

    // 3. Strict regex-based validation (for extra safety)
    const usernameRegex = /^[a-zA-Z0-9_]{3,30}$/;
    if (!usernameRegex.test(username)) {
      return res.status(400).json({ message: 'Username must be 3-30 characters long and contain only letters, numbers, and underscores' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const lowerEmail = email.toLowerCase();
    if (!emailRegex.test(lowerEmail)) {
      return res.status(400).json({ message: 'Please provide a valid email address' });
    }

    const mobileRegex = /^[6-9]\d{9}$/;
    if (!mobileRegex.test(mobile)) {
      return res.status(400).json({ message: 'Mobile number must be a valid 10-digit Indian number starting with 6-9' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long' });
    }

    // 4. Check duplicate username
    const existingUsername = await User.findOne({ username });
    if (existingUsername) {
      return res.status(400).json({ message: 'Username is already taken' });
    }

    const existingEmail = await User.findOne({ email: lowerEmail });
    if (existingEmail) {
      return res.status(400).json({ message: 'Email is already registered' });
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

  } catch (error) {
    console.error('Registration Error:', error);
    res.status(500).json({ message: 'Server error during registration. Please try again.' });
  }
};

// @desc    Authenticate user and get token
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;

    // 1. Validation for all fields
    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required' });
    }

    // 2. Check if user exists
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(400).json({ message: 'Invalid username or password' });
    }

    // Restrict admins from logging in as customers
    if (user.role !== 'user') {
      return res.status(403).json({ message: 'Access denied. Admins must login via the admin portal.' });
    }

    // 3. Verify password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid username or password' });
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

  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({ message: 'Server error during login. Please try again.' });
  }
};

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
exports.updateProfile = async (req, res) => {
  try {
    const { username, email, mobile, password } = req.body;
    const userId = req.user.id;

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check duplicate username if changing
    if (username && username !== user.username) {
      const existingUsername = await User.findOne({ username });
      if (existingUsername) {
        return res.status(400).json({ message: 'Username is already taken' });
      }
      const usernameRegex = /^[a-zA-Z0-9_]{3,30}$/;
      if (!usernameRegex.test(username)) {
        return res.status(400).json({ message: 'Username must be 3-30 characters long and contain only letters, numbers, and underscores' });
      }
      user.username = username;
    }

    // Check duplicate email if changing
    if (email) {
      const lowerEmail = email.toLowerCase();
      if (lowerEmail !== user.email) {
        const existingEmail = await User.findOne({ email: lowerEmail });
        if (existingEmail) {
          return res.status(400).json({ message: 'Email is already registered' });
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(lowerEmail)) {
          return res.status(400).json({ message: 'Please provide a valid email address' });
        }
        user.email = lowerEmail;
      }
    }

    // Update mobile if provided
    if (mobile && mobile !== user.mobile) {
      const mobileRegex = /^[6-9]\d{9}$/;
      if (!mobileRegex.test(mobile)) {
        return res.status(400).json({ message: 'Mobile number must be a valid 10-digit Indian number starting with 6-9' });
      }
      user.mobile = mobile;
    }

    // Update password if provided
    if (password) {
      if (password.length < 6) {
        return res.status(400).json({ message: 'Password must be at least 6 characters long' });
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
        return res.status(400).json({ message: 'Pincode must be a 6-digit number' });
      }
      // Validate address mobile if provided
      if (sanitizedAddress.mobile && !/^[6-9]\d{9}$/.test(sanitizedAddress.mobile)) {
        return res.status(400).json({ message: 'Address mobile must be a valid 10-digit Indian number' });
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

  } catch (error) {
    console.error('Update Profile Error:', error);
    res.status(500).json({ message: 'Server error during profile update. Please try again.' });
  }
};
