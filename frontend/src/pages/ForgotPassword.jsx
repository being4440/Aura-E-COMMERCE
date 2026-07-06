import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import axios from 'axios';
import { FiArrowLeft } from 'react-icons/fi';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setIsLoading(true);

    try {
      // Basic mock request to backend
      // await axios.post('http://localhost:5000/api/auth/forgot-password', { email });
      
      // Simulate API call delay
      setTimeout(() => {
        setMessage(`If an account exists for ${email}, an email will be sent with further instructions.`);
        setIsLoading(false);
      }, 1500);
      
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to process request. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-luxury-dark items-center justify-center relative overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <motion.img 
          initial={{ scale: 1.1 }}
          animate={{ scale: 1 }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          src="https://images.unsplash.com/photo-1549439602-43ebca2327af?q=80&w=2000&auto=format&fit=crop" 
          alt="Luxury Background" 
          className="w-full h-full object-cover opacity-40"
        />
        <div className="absolute inset-0 bg-luxury-dark/70"></div>
      </div>

      {/* Center Form */}
      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.2 }}
        className="w-full max-w-lg relative z-10 glass-card p-10 sm:p-14 m-6 border-luxury-gold/20"
      >
        <Link to="/login" className="inline-flex items-center text-luxury-gray hover:text-luxury-white transition-colors text-sm mb-8 font-inter">
          <FiArrowLeft className="mr-2" /> Back to Sign In
        </Link>
        
        <div className="text-center mb-10">
          <h1 className="text-3xl font-playfair tracking-wider text-luxury-white mb-3">Reset Password</h1>
          <p className="text-luxury-gray font-inter text-sm">Enter the email associated with your account and we'll send you instructions to reset your password.</p>
        </div>

        {error && (
          <div className="bg-red-900/50 border border-red-500 text-red-200 p-3 mb-6 text-sm font-inter text-center">
            {error}
          </div>
        )}

        {message ? (
          <div className="bg-green-900/30 border border-luxury-gold/50 text-luxury-gold p-6 mb-6 text-sm font-inter text-center leading-relaxed">
            {message}
          </div>
        ) : (
          <form onSubmit={handleResetPassword} className="space-y-6">
            <div>
              <label className="block text-xs font-poppins uppercase tracking-widest text-luxury-gray mb-2">Email Address</label>
              <input
                type="email"
                required
                className="w-full bg-transparent border-b border-luxury-gray/50 py-3 text-luxury-white focus:outline-none focus:border-luxury-gold transition-colors font-inter"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
              />
            </div>

            <button 
              type="submit" 
              className="w-full btn-primary py-4 mt-8"
              disabled={isLoading}
            >
              {isLoading ? 'Processing...' : 'Send Reset Link'}
            </button>
          </form>
        )}
      </motion.div>
    </div>
  );
}
