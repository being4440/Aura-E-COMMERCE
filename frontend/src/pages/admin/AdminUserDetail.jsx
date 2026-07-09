import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { FiArrowLeft, FiShieldOff, FiShield, FiUser, FiMapPin, FiPhone, FiMail, FiShoppingBag, FiHeart } from 'react-icons/fi';
import dayjs from 'dayjs';

export default function AdminUserDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({ profile: null, orders: [], wishlist: [] });

  const fetchUserDetail = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/admin/users/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setData(res.data.data);
      }
    } catch (err) {
      toast.error('Failed to load user details');
      navigate('/admin/users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserDetail();
  }, [id, navigate]);

  const handleToggleBlock = async () => {
    const { profile } = data;
    const action = profile.isBlocked ? 'unblock' : 'block';
    if (!window.confirm(`Are you sure you want to ${action} this user?`)) return;
    
    try {
      const token = localStorage.getItem('token');
      let reason = '';
      if (!profile.isBlocked) {
        reason = window.prompt('Enter a reason for blocking this user (optional):');
        if (reason === null) return;
      }

      const res = await axios.patch(
        `${import.meta.env.VITE_API_URL}/api/admin/users/${id}/block`,
        { isBlocked: !profile.isBlocked, blockedReason: reason },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (res.data.success) {
        toast.success(res.data.message);
        fetchUserDetail(); // refresh data
      }
    } catch (err) {
      toast.error(err.response?.data?.message || `Failed to ${action} user`);
    }
  };

  if (loading) return <div className="p-8 text-luxury-gold">Loading user profile...</div>;
  
  const { profile, orders, wishlist } = data;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/admin/users')} className="p-2 text-luxury-gray hover:text-luxury-white transition-colors border border-luxury-gray/20 rounded">
            <FiArrowLeft size={18} />
          </button>
          <h1 className="text-3xl font-playfair text-luxury-white">User Profile</h1>
        </div>
        {profile.role !== 'admin' && (
          <button 
            onClick={handleToggleBlock}
            className={`px-4 py-2 font-medium flex items-center gap-2 transition-colors ${profile.isBlocked ? 'bg-green-500/10 text-green-500 border border-green-500/30 hover:bg-green-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/30 hover:bg-red-500/20'}`}
          >
            {profile.isBlocked ? <><FiShield size={18} /> Unblock User</> : <><FiShieldOff size={18} /> Block User</>}
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Profile Info Sidebar */}
        <div className="lg:col-span-1 flex flex-col gap-6">
          <div className="bg-luxury-secondary/30 border border-luxury-gray/10 p-6 flex flex-col items-center text-center">
            <div className="w-24 h-24 bg-luxury-dark rounded-full border border-luxury-gold flex items-center justify-center mb-4">
              <FiUser size={40} className="text-luxury-gold" />
            </div>
            <h2 className="text-xl font-medium text-luxury-white">{profile.username}</h2>
            <p className="text-luxury-gray text-sm mb-4">Joined {dayjs(profile.createdAt).format('DD MMM YYYY')}</p>
            
            <div className="w-full flex justify-center mb-6">
               <span className={`px-3 py-1 text-xs uppercase tracking-wider ${profile.isBlocked ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 'bg-green-500/10 text-green-500 border border-green-500/20'}`}>
                {profile.isBlocked ? 'Account Blocked' : 'Account Active'}
              </span>
            </div>

            {profile.isBlocked && profile.blockedReason && (
              <div className="w-full bg-red-500/5 border border-red-500/10 p-3 text-left text-xs text-red-400/80 mb-6 rounded">
                <span className="font-semibold text-red-400">Block Reason:</span> {profile.blockedReason}
              </div>
            )}

            <div className="w-full border-t border-luxury-gray/10 pt-6 flex flex-col gap-4 text-left">
              <div className="flex items-center gap-3 text-luxury-gray text-sm">
                <FiMail className="text-luxury-gold" />
                <a href={`mailto:${profile.email}`} className="hover:text-luxury-white transition-colors">{profile.email}</a>
              </div>
              <div className="flex items-center gap-3 text-luxury-gray text-sm">
                <FiPhone className="text-luxury-gold" />
                <a href={`tel:${profile.mobile}`} className="hover:text-luxury-white transition-colors">{profile.mobile}</a>
              </div>
            </div>
          </div>

          {/* Address Block */}
          {profile.address && profile.address.street && (
            <div className="bg-luxury-secondary/30 border border-luxury-gray/10 p-6 text-sm">
              <h3 className="font-medium text-luxury-white mb-4 flex items-center gap-2">
                <FiMapPin className="text-luxury-gold" /> Saved Address
              </h3>
              <div className="text-luxury-gray leading-relaxed">
                <p className="font-medium text-luxury-white">{profile.address.fullName}</p>
                <p>{profile.address.street}</p>
                <p>{profile.address.city}, {profile.address.state} {profile.address.pincode}</p>
                <p className="mt-2 text-xs">Ph: {profile.address.mobile}</p>
              </div>
            </div>
          )}
        </div>

        {/* Main Content Area (Orders & Wishlist) */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          
          {/* Order History */}
          <div className="bg-luxury-secondary/30 border border-luxury-gray/10 p-6">
            <h3 className="text-lg font-medium text-luxury-white mb-6 flex items-center gap-2">
              <FiShoppingBag className="text-luxury-gold" /> Order History ({orders.length})
            </h3>
            
            {orders.length === 0 ? (
              <p className="text-luxury-gray text-sm">This user hasn't placed any orders yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-luxury-dark text-luxury-gray font-poppins text-xs uppercase tracking-widest border-b border-luxury-gray/10">
                      <th className="p-3">Order ID</th>
                      <th className="p-3">Date</th>
                      <th className="p-3">Amount</th>
                      <th className="p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm font-inter text-luxury-white">
                    {orders.map(order => (
                      <tr key={order._id} className="border-b border-luxury-gray/10 hover:bg-luxury-secondary/50 transition-colors">
                        <td className="p-3">
                          <Link to={`/admin/orders/${order._id}`} className="text-luxury-gold hover:underline">
                            #{order._id.substring(order._id.length - 6)}
                          </Link>
                        </td>
                        <td className="p-3 text-luxury-gray">{dayjs(order.createdAt).format('DD MMM YYYY')}</td>
                        <td className="p-3">₹{order.totalAmount?.toLocaleString()}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 text-[10px] uppercase tracking-wider rounded-sm ${
                            order.status === 'delivered' ? 'bg-green-500/20 text-green-500' :
                            order.status === 'cancelled' ? 'bg-red-500/20 text-red-500' :
                            'bg-yellow-500/20 text-yellow-500'
                          }`}>
                            {order.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Wishlist */}
          <div className="bg-luxury-secondary/30 border border-luxury-gray/10 p-6">
            <h3 className="text-lg font-medium text-luxury-white mb-6 flex items-center gap-2">
              <FiHeart className="text-luxury-gold" /> Saved Wishlist ({wishlist.length})
            </h3>

            {wishlist.length === 0 ? (
              <p className="text-luxury-gray text-sm">No items in wishlist.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {wishlist.map(item => item.productId && (
                  <div key={item.productId._id} className="bg-luxury-dark border border-luxury-gray/10 p-2 flex flex-col gap-2 relative group">
                    <div className="aspect-[3/4] bg-luxury-secondary/30 w-full overflow-hidden">
                      <img 
                        src={item.productId.images?.[0] || 'https://via.placeholder.com/150'} 
                        alt={item.productId.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>
                    <div>
                      <p className="text-xs text-luxury-white font-medium truncate" title={item.productId.title}>{item.productId.title}</p>
                      <p className="text-[10px] text-luxury-gold">₹{item.productId.price?.toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
