const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Username is required'],
    unique: true,
    trim: true,
    minlength: [3, 'Username must be at least 3 characters long'],
    maxlength: [30, 'Username cannot exceed 30 characters'],
    match: [/^[a-zA-Z0-9_]{3,30}$/, 'Username can only contain letters, numbers, and underscores']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please provide a valid email address']
  },
  mobile: {
    type: String,
    required: [true, 'Mobile number is required'],
    trim: true,
    match: [/^[6-9]\d{9}$/, 'Please provide a valid Indian mobile number (10 digits starting with 6-9)']
  },
  password: {
    type: String,
    required: [true, 'Password is required']
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  address: {
    fullName: {
      type: String,
      minlength: [3, 'Full name must be at least 3 characters'],
      maxlength: [50, 'Full name cannot exceed 50 characters']
    },
    mobile: {
      type: String,
      match: [/^[6-9]\d{9}$/, 'Please provide a valid Indian mobile number']
    },
    street: {
      type: String,
      minlength: [10, 'Address must be at least 10 characters'],
      maxlength: [200, 'Address cannot exceed 200 characters']
    },
    pincode: {
      type: String,
      match: [/^\d{6}$/, 'Pincode must be exactly 6 digits']
    },
    city: {
      type: String,
      match: [/^[a-zA-Z\s]+$/, 'City must contain only letters']
    },
    state: {
      type: String
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('User', UserSchema);
