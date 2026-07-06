import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../hooks/useAuth';
import { Navigate } from 'react-router-dom';
import { FiUser, FiMail, FiPhone, FiEdit2, FiCheck, FiX, FiLock } from 'react-icons/fi';
import api from '../api/api';

export default function Profile() {
  const { user, updateUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    username: user?.username || user?.name || '',
    email: user?.email || '',
    mobile: user?.mobile || '',
    password: '',
    address: user?.address || {
      fullName: '',
      mobile: '',
      street: '',
      pincode: '',
      city: '',
      state: ''
    }
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleAddressChange = (e) => {
    setFormData({ 
      ...formData, 
      address: { ...formData.address, [e.target.name]: e.target.value }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    if (formData.address && formData.address.pincode && !/^\d{6}$/.test(formData.address.pincode)) {
      setError('Pincode must be exactly 6 digits');
      setLoading(false);
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const dataToSubmit = { ...formData };
      if (!dataToSubmit.password) {
        delete dataToSubmit.password;
      }
      
      const response = await api.put('/auth/profile', dataToSubmit, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      if (response.data.success) {
        updateUser(response.data.user);
        setSuccess('Profile updated successfully!');
        setIsEditing(false);
        setFormData(prev => ({ ...prev, password: '' }));
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setFormData({
      username: user.username || user.name || '',
      email: user.email || '',
      mobile: user.mobile || '',
      password: '',
      address: user.address || { fullName: '', mobile: '', street: '', pincode: '', city: '', state: '' }
    });
    setError('');
    setSuccess('');
  };

  return (
    <div className="pt-32 pb-24 px-6 lg:px-8 max-w-7xl mx-auto min-h-screen">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="max-w-2xl mx-auto glass-card p-10 relative"
      >
        <button 
          onClick={() => isEditing ? handleCancel() : setIsEditing(true)}
          className="absolute top-6 right-6 p-2 rounded-full bg-luxury-gray/10 hover:bg-luxury-gold/20 text-luxury-gold transition-colors duration-300"
          title={isEditing ? "Cancel Edit" : "Edit Profile"}
        >
          {isEditing ? <FiX className="w-5 h-5" /> : <FiEdit2 className="w-5 h-5" />}
        </button>

        <div className="text-center mb-10">
          <div className="w-24 h-24 bg-luxury-gold rounded-full mx-auto flex items-center justify-center mb-6">
            <FiUser className="w-10 h-10 text-luxury-dark" />
          </div>
          <h1 className="text-4xl font-playfair tracking-wider text-luxury-white mb-2">My Profile</h1>
          <p className="text-luxury-gray font-inter text-sm">Manage your personal information</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded text-red-400 text-sm text-center">
            {error}
          </div>
        )}
        
        {success && (
          <div className="mb-6 p-4 bg-green-500/10 border border-green-500/50 rounded text-green-400 text-sm text-center">
            {success}
          </div>
        )}

        {isEditing ? (
          <form onSubmit={handleSubmit} className="space-y-6 font-inter">
            <div className="space-y-2">
              <label className="text-xs font-poppins uppercase tracking-widest text-luxury-gray">Username</label>
              <div className="relative">
                <FiUser className="absolute left-4 top-1/2 -translate-y-1/2 text-luxury-gold w-5 h-5" />
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  className="w-full bg-luxury-dark/50 border border-luxury-gray/20 rounded p-4 pl-12 text-luxury-white focus:border-luxury-gold focus:outline-none transition-colors"
                  placeholder="Enter username"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-poppins uppercase tracking-widest text-luxury-gray">Email</label>
              <div className="relative">
                <FiMail className="absolute left-4 top-1/2 -translate-y-1/2 text-luxury-gold w-5 h-5" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full bg-luxury-dark/50 border border-luxury-gray/20 rounded p-4 pl-12 text-luxury-white focus:border-luxury-gold focus:outline-none transition-colors"
                  placeholder="Enter email"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-poppins uppercase tracking-widest text-luxury-gray">Mobile</label>
              <div className="relative">
                <FiPhone className="absolute left-4 top-1/2 -translate-y-1/2 text-luxury-gold w-5 h-5" />
                <input
                  type="text"
                  name="mobile"
                  value={formData.mobile}
                  onChange={handleChange}
                  className="w-full bg-luxury-dark/50 border border-luxury-gray/20 rounded p-4 pl-12 text-luxury-white focus:border-luxury-gold focus:outline-none transition-colors"
                  placeholder="Enter mobile number"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-poppins uppercase tracking-widest text-luxury-gray">New Password (optional)</label>
              <div className="relative">
                <FiLock className="absolute left-4 top-1/2 -translate-y-1/2 text-luxury-gold w-5 h-5" />
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full bg-luxury-dark/50 border border-luxury-gray/20 rounded p-4 pl-12 text-luxury-white focus:border-luxury-gold focus:outline-none transition-colors"
                  placeholder="Leave blank to keep current"
                  minLength="6"
                />
              </div>
            </div>

            <div className="border-t border-luxury-gray/20 pt-6 mt-6">
              <h3 className="text-luxury-gold font-playfair mb-4 text-xl">Shipping Address</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <input type="text" name="fullName" placeholder="Full Name" value={formData.address.fullName} onChange={handleAddressChange} className="bg-luxury-dark/50 text-luxury-white border border-luxury-gray/20 rounded p-3 focus:border-luxury-gold focus:outline-none" minLength="3" maxLength="50" />
                <input type="tel" name="mobile" placeholder="Mobile Number" value={formData.address.mobile} onChange={handleAddressChange} className="bg-luxury-dark/50 text-luxury-white border border-luxury-gray/20 rounded p-3 focus:border-luxury-gold focus:outline-none" pattern="^[6-9]\d{9}$" title="Valid 10-digit Indian mobile number" />
              </div>
              <textarea name="street" placeholder="Full Street Address" value={formData.address.street} onChange={handleAddressChange} className="w-full bg-luxury-dark/50 text-luxury-white border border-luxury-gray/20 rounded p-3 mb-4 focus:border-luxury-gold focus:outline-none" minLength="10" maxLength="200" rows="2"></textarea>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <input type="text" name="pincode" placeholder="Pincode" value={formData.address.pincode} onChange={handleAddressChange} className="bg-luxury-dark/50 text-luxury-white border border-luxury-gray/20 rounded p-3 focus:border-luxury-gold focus:outline-none" pattern="^\d{6}$" title="6-digit Pincode" />
                <input type="text" name="city" placeholder="City" value={formData.address.city} onChange={handleAddressChange} className="bg-luxury-dark/50 text-luxury-white border border-luxury-gray/20 rounded p-3 focus:border-luxury-gold focus:outline-none" pattern="^[a-zA-Z\s]+$" title="Only letters allowed" />
                <input type="text" name="state" placeholder="State" value={formData.address.state} onChange={handleAddressChange} className="bg-luxury-dark/50 text-luxury-white border border-luxury-gray/20 rounded p-3 focus:border-luxury-gold focus:outline-none" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-luxury-gold text-luxury-dark font-poppins uppercase tracking-wider py-4 rounded hover:bg-white transition-colors duration-300 flex items-center justify-center mt-8 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="w-6 h-6 border-2 border-luxury-dark border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <FiCheck className="w-5 h-5 mr-2" />
                  Save Changes
                </>
              )}
            </button>
          </form>
        ) : (
          <div className="space-y-6 font-inter">
            <div className="flex items-center p-4 bg-luxury-dark/50 border border-luxury-gray/20 rounded hover:border-luxury-gold/50 transition-colors duration-300">
              <div className="w-12 h-12 flex items-center justify-center bg-luxury-gray/10 rounded mr-4">
                <FiUser className="w-5 h-5 text-luxury-gold" />
              </div>
              <div>
                <p className="text-xs font-poppins uppercase tracking-widest text-luxury-gray mb-1">Username</p>
                <p className="text-luxury-white text-lg">{user.username || user.name}</p>
              </div>
            </div>

            <div className="flex items-center p-4 bg-luxury-dark/50 border border-luxury-gray/20 rounded hover:border-luxury-gold/50 transition-colors duration-300">
              <div className="w-12 h-12 flex items-center justify-center bg-luxury-gray/10 rounded mr-4">
                <FiMail className="w-5 h-5 text-luxury-gold" />
              </div>
              <div>
                <p className="text-xs font-poppins uppercase tracking-widest text-luxury-gray mb-1">Email</p>
                <p className="text-luxury-white text-lg">{user.email}</p>
              </div>
            </div>

            <div className="flex items-center p-4 bg-luxury-dark/50 border border-luxury-gray/20 rounded hover:border-luxury-gold/50 transition-colors duration-300">
              <div className="w-12 h-12 flex items-center justify-center bg-luxury-gray/10 rounded mr-4">
                <FiPhone className="w-5 h-5 text-luxury-gold" />
              </div>
              <div>
                <p className="text-xs font-poppins uppercase tracking-widest text-luxury-gray mb-1">Mobile</p>
                <p className="text-luxury-white text-lg">{user.mobile || 'Not provided'}</p>
              </div>
            </div>
            
            <div className="flex items-center p-4 bg-luxury-dark/50 border border-luxury-gray/20 rounded hover:border-luxury-gold/50 transition-colors duration-300">
              <div className="w-12 h-12 flex items-center justify-center bg-luxury-gray/10 rounded mr-4">
                <FiLock className="w-5 h-5 text-luxury-gold" />
              </div>
              <div>
                <p className="text-xs font-poppins uppercase tracking-widest text-luxury-gray mb-1">Password</p>
                <p className="text-luxury-white text-lg">••••••••</p>
              </div>
            </div>

            <div className="mt-8 border-t border-luxury-gray/20 pt-6">
              <h3 className="text-luxury-gold font-playfair mb-4 text-xl">Shipping Address</h3>
              {user.address && user.address.street ? (
                <div className="bg-luxury-dark/50 border border-luxury-gray/20 rounded p-6">
                  <p className="text-luxury-white font-bold mb-2">{user.address.fullName} ({user.address.mobile})</p>
                  <p className="text-luxury-gray">{user.address.street}</p>
                  <p className="text-luxury-gray">{user.address.city}, {user.address.state} {user.address.pincode}</p>
                </div>
              ) : (
                <p className="text-luxury-gray italic">No address provided. Click edit to add one.</p>
              )}
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
