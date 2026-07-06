const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { register, login, updateProfile } = require('../controllers/authController');
const { verifyToken } = require('../middleware/auth.middleware');

const loginLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 5, // 5 requests
  message: { message: 'Too many login attempts from this IP, please try again after a minute' }
});

// Route for user registration
// Path: POST /api/auth/register
router.post('/register', register);

// Route for user login
// Path: POST /api/auth/login
router.post('/login', loginLimiter, login);

// Route for update profile
// Path: PUT /api/auth/profile
router.put('/profile', verifyToken, updateProfile);

module.exports = router;
