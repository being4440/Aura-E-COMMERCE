import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api/api';
import { toast } from 'react-hot-toast';
import { FiShield, FiEye, FiEyeOff } from 'react-icons/fi';
import { useAuth } from '../hooks/useAuth';

export default function AdminLogin({ handleLoginSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const { updateUser } = useAuth(); // Assuming updateUser sets user in context/store

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    try {
      setIsSubmitting(true);
      const response = await api.post('/admin/login', { username, password });
      const { data } = response.data;
      
      localStorage.setItem('token', data.accessToken);
      localStorage.setItem('user', JSON.stringify(data.user));
      
      if (updateUser) updateUser(data.user);
      if (handleLoginSuccess) handleLoginSuccess(data.user, data.accessToken);
      
      toast.success('Welcome, Admin!');
      navigate('/admin');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to login');
      // Shake animation can be implemented by adding a class conditionally
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-luxury-dark items-center justify-center p-4">
      <div className={`w-full max-w-md relative z-10 glass-card p-10 ${error ? 'animate-shake' : ''}`}>
        <div className="text-center mb-8 flex flex-col items-center">
          <div className="bg-orange-500/10 p-4 rounded-full mb-4">
            <FiShield className="text-4xl text-orange-500" />
          </div>
          <h1 className="text-3xl font-playfair tracking-wider text-luxury-white mb-2">Admin Portal</h1>
          <p className="text-red-400 font-inter text-sm font-semibold tracking-wide uppercase">Restricted Access</p>
        </div>

        {error && (
          <div className="bg-red-900/50 border border-red-500 text-red-200 p-3 mb-6 text-sm font-inter text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-xs font-poppins uppercase tracking-widest text-luxury-gray mb-1">Username</label>
            <input
              type="text"
              required
              className="w-full bg-transparent border-b border-luxury-gray/50 py-2 text-luxury-white focus:outline-none focus:border-orange-500 transition-colors font-inter text-sm"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>

          <div className="relative">
            <label className="block text-xs font-poppins uppercase tracking-widest text-luxury-gray mb-1">Password</label>
            <input
              type={showPassword ? 'text' : 'password'}
              required
              className="w-full bg-transparent border-b border-luxury-gray/50 py-2 text-luxury-white focus:outline-none focus:border-orange-500 transition-colors font-inter pr-10 text-sm"
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

          <button type="submit" disabled={isSubmitting} className="w-full bg-orange-500 hover:bg-orange-600 text-white font-poppins tracking-wider uppercase text-sm py-4 mt-6 transition-colors rounded disabled:opacity-50">
            {isSubmitting ? 'Signing in...' : 'Sign In as Admin'}
          </button>
        </form>

        <div className="mt-8 text-center text-sm font-inter text-luxury-gray">
          <Link to="/login" className="text-luxury-gray hover:text-luxury-white transition-colors">
            Not admin? Customer login &rarr;
          </Link>
        </div>
      </div>
    </div>
  );
}
