import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/api';
import { motion } from 'framer-motion';
import { FiEye, FiEyeOff } from 'react-icons/fi';

export default function Register() {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    mobile: '',
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Basic password strength logic
  const getPasswordStrength = () => {
    const { password } = formData;
    if (!password) return { width: '0%', color: 'bg-transparent' };
    if (password.length < 6) return { width: '33%', color: 'bg-red-500' };
    if (password.length < 10) return { width: '66%', color: 'bg-yellow-500' };
    return { width: '100%', color: 'bg-green-500' };
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      return setError('Passwords do not match.');
    }
    
    try {
      setIsSubmitting(true);
      await api.post('/auth/register', formData);
      navigate('/login');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const strength = getPasswordStrength();

  return (
    <div className="flex min-h-screen bg-luxury-dark">
      {/* Left Side - Image */}
      <div className="hidden lg:block lg:w-1/2 relative overflow-hidden">
        <motion.img 
          initial={{ scale: 1.1 }}
          animate={{ scale: 1 }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          src="https://images.unsplash.com/photo-1622434641406-a158123450f9?q=80&w=1200&auto=format&fit=crop" 
          alt="Luxury Watch Detail" 
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-transparent to-luxury-dark/90"></div>
      </div>

      {/* Right Side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12 lg:p-24 relative overflow-y-auto max-h-screen">
        <div className="absolute inset-0 z-0 lg:hidden">
          <img 
            src="https://images.unsplash.com/photo-1622434641406-a158123450f9?q=80&w=1200&auto=format&fit=crop" 
            alt="Luxury Auth Mobile" 
            className="w-full h-full object-cover opacity-30"
          />
          <div className="absolute inset-0 bg-luxury-dark/80"></div>
        </div>

        <motion.div 
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="w-full max-w-md relative z-10 glass-card p-10 mt-10 lg:mt-0"
        >
          <div className="text-center mb-8">
            <h1 className="text-3xl font-playfair tracking-wider text-luxury-white mb-2">Create Account</h1>
            <p className="text-luxury-gray font-inter text-sm">Join the inner circle of AURA.</p>
          </div>

          {error && (
            <div className="bg-red-900/50 border border-red-500 text-red-200 p-3 mb-6 text-sm font-inter text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-5">
            <div>
              <label className="block text-xs font-poppins uppercase tracking-widest text-luxury-gray mb-1">Username</label>
              <input
                type="text"
                name="username"
                required
                pattern="^[a-zA-Z0-9_]{3,30}$"
                title="Username must be 3-30 characters long and contain only letters, numbers, and underscores"
                className="w-full bg-transparent border-b border-luxury-gray/50 py-2 text-luxury-white focus:outline-none focus:border-luxury-gold transition-colors font-inter text-sm"
                value={formData.username}
                onChange={handleChange}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-poppins uppercase tracking-widest text-luxury-gray mb-1">Email</label>
                <input
                  type="email"
                  name="email"
                  required
                  pattern="^[^\s@]+@[^\s@]+\.[^\s@]+$"
                  title="Please provide a valid email address"
                  className="w-full bg-transparent border-b border-luxury-gray/50 py-2 text-luxury-white focus:outline-none focus:border-luxury-gold transition-colors font-inter text-sm"
                  value={formData.email}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label className="block text-xs font-poppins uppercase tracking-widest text-luxury-gray mb-1">Mobile</label>
                <input
                  type="tel"
                  name="mobile"
                  required
                  pattern="^[6-9]\d{9}$"
                  title="Mobile number must be a valid 10-digit Indian number starting with 6-9"
                  className="w-full bg-transparent border-b border-luxury-gray/50 py-2 text-luxury-white focus:outline-none focus:border-luxury-gold transition-colors font-inter text-sm"
                  value={formData.mobile}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="relative">
              <label className="block text-xs font-poppins uppercase tracking-widest text-luxury-gray mb-1">Password</label>
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                required
                minLength="6"
                className="w-full bg-transparent border-b border-luxury-gray/50 py-2 text-luxury-white focus:outline-none focus:border-luxury-gold transition-colors font-inter pr-10 text-sm"
                value={formData.password}
                onChange={handleChange}
              />
              <button 
                type="button" 
                className="absolute right-0 bottom-2 text-luxury-gray hover:text-luxury-white transition-colors"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <FiEyeOff /> : <FiEye />}
              </button>
              
              {/* Password Strength Meter */}
              {formData.password && (
                <div className="mt-2 h-1 w-full bg-luxury-gray/20 rounded overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-300 ${strength.color}`} 
                    style={{ width: strength.width }}
                  ></div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-poppins uppercase tracking-widest text-luxury-gray mb-1">Confirm Password</label>
              <input
                type="password"
                name="confirmPassword"
                required
                className="w-full bg-transparent border-b border-luxury-gray/50 py-2 text-luxury-white focus:outline-none focus:border-luxury-gold transition-colors font-inter text-sm"
                value={formData.confirmPassword}
                onChange={handleChange}
              />
            </div>



            <button type="submit" disabled={isSubmitting} className="w-full btn-primary py-4 mt-6 disabled:opacity-50">
              {isSubmitting ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>

          <div className="mt-8 text-center text-sm font-inter text-luxury-gray">
            Already have an account? <Link to="/login" className="text-luxury-gold hover:text-luxury-white transition-colors uppercase tracking-wider text-xs ml-2">Sign In</Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
