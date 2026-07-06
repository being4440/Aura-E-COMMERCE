import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { FiEye, FiEyeOff } from 'react-icons/fi';
import api from '../api/api';

export default function Login({ handleLoginSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { from, message } = location.state ?? {};

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await api.post('/auth/login', { username, password });
      if (res.data.success) {
        handleLoginSuccess(res.data.user, res.data.token);
        navigate(from ?? '/', { replace: true });
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-luxury-dark">
      {/* Left Side - Image */}
      <div className="hidden lg:block lg:w-1/2 relative overflow-hidden">
        <motion.img 
          initial={{ scale: 1.1 }}
          animate={{ scale: 1 }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          src="https://images.unsplash.com/photo-1549439602-43ebca2327af?q=80&w=1200&auto=format&fit=crop" 
          alt="Luxury Auth" 
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-transparent to-luxury-dark/90"></div>
      </div>

      {/* Right Side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12 lg:p-24 relative">
        <div className="absolute inset-0 z-0 lg:hidden">
          <img 
            src="https://images.unsplash.com/photo-1549439602-43ebca2327af?q=80&w=1200&auto=format&fit=crop" 
            alt="Luxury Auth Mobile" 
            className="w-full h-full object-cover opacity-30"
          />
          <div className="absolute inset-0 bg-luxury-dark/80"></div>
        </div>

        <motion.div 
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="w-full max-w-md relative z-10 glass-card p-10"
        >
          <div className="text-center mb-10">
            <h1 className="text-4xl font-playfair tracking-wider text-luxury-white mb-2">Welcome Back</h1>
            <p className="text-luxury-gray font-inter text-sm">Enter your credentials to access your account.</p>
          </div>

          {error && (
            <div className="bg-red-900/50 border border-red-500 text-red-200 p-3 mb-6 text-sm font-inter text-center">
              {error}
            </div>
          )}
          
          {message && (
            <div className="bg-yellow-900/50 border border-yellow-500 text-yellow-200 p-3 mb-6 text-sm font-inter text-center rounded">
              ℹ {message}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-xs font-poppins uppercase tracking-widest text-luxury-gray mb-2">Username</label>
              <input
                type="text"
                required
                className="w-full bg-transparent border-b border-luxury-gray/50 py-2 text-luxury-white focus:outline-none focus:border-luxury-gold transition-colors font-inter"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>

            <div className="relative">
              <label className="block text-xs font-poppins uppercase tracking-widest text-luxury-gray mb-2">Password</label>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                className="w-full bg-transparent border-b border-luxury-gray/50 py-2 text-luxury-white focus:outline-none focus:border-luxury-gold transition-colors font-inter pr-10"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button 
                type="button" 
                className="absolute right-0 bottom-2 text-luxury-gray hover:text-luxury-white transition-colors"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <FiEyeOff /> : <FiEye />}
              </button>
            </div>

            <div className="flex items-center text-sm font-inter">
              <label className="flex items-center text-luxury-gray cursor-pointer">
                <input type="checkbox" className="mr-2 accent-luxury-gold cursor-pointer" />
                Remember me
              </label>
            </div>

            <button type="submit" className="w-full btn-primary py-4 mt-8">
              Sign In
            </button>
          </form>

          <div className="mt-10 text-center text-sm font-inter text-luxury-gray">
            Don't have an account? <Link to="/register" className="text-luxury-gold hover:text-luxury-white transition-colors uppercase tracking-wider text-xs ml-2">Create Account</Link>
          </div>

          <div className="mt-6 text-center">
            <Link to="/admin/login" className="text-[10px] text-luxury-gray/60 hover:text-luxury-gold transition-colors uppercase tracking-widest font-inter">
              Sign in as an Admin
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
