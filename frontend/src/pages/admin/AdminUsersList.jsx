import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { FiSearch, FiEye, FiShieldOff, FiShield, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import dayjs from 'dayjs';

export default function AdminUsersList() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const fetchUsers = async (page = 1) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const params = new URLSearchParams({
        page,
        limit: 10,
        search
      });

      if (statusFilter) params.append('status', statusFilter);

      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/admin/users?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.data.success) {
        setUsers(res.data.data);
        setPagination(res.data.pagination);
      }
    } catch (err) {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers(1);
  }, [statusFilter]);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchUsers(1);
  };

  const handleToggleBlock = async (id, currentStatus) => {
    const action = currentStatus ? 'unblock' : 'block';
    if (!window.confirm(`Are you sure you want to ${action} this user?`)) return;
    
    try {
      const token = localStorage.getItem('token');
      let reason = '';
      if (!currentStatus) {
        reason = window.prompt('Enter a reason for blocking this user (optional):');
        // If they click cancel on the prompt, abort
        if (reason === null) return;
      }

      const res = await axios.patch(
        `${import.meta.env.VITE_API_URL}/api/admin/users/${id}/block`,
        { isBlocked: !currentStatus, blockedReason: reason },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (res.data.success) {
        toast.success(res.data.message);
        fetchUsers(pagination.page);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || `Failed to ${action} user`);
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-playfair text-luxury-white">Users Management</h1>
      </div>

      <div className="bg-luxury-secondary/30 border border-luxury-gray/10 p-4 mb-6 flex flex-col md:flex-row gap-4 items-end">
        <form onSubmit={handleSearch} className="flex-grow w-full relative">
          <input 
            type="text"
            placeholder="Search by username, email, or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-luxury-dark border border-luxury-gray/20 text-luxury-white px-4 py-2 pl-10 focus:outline-none focus:border-luxury-gold transition-colors font-inter"
          />
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-luxury-gray" />
        </form>
        <button onClick={handleSearch} className="bg-luxury-gold text-luxury-dark px-4 py-2 font-inter font-medium hover:bg-white transition-colors">
          Search
        </button>

        <select 
          value={statusFilter} 
          onChange={(e) => setStatusFilter(e.target.value)} 
          className="w-full md:w-auto bg-luxury-dark border border-luxury-gray/20 text-luxury-white px-3 py-2 focus:outline-none focus:border-luxury-gold font-inter text-sm"
        >
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="blocked">Blocked</option>
        </select>
      </div>

      <div className="bg-luxury-secondary/30 border border-luxury-gray/10 overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-luxury-secondary/50 text-luxury-gray font-poppins text-xs uppercase tracking-widest border-b border-luxury-gray/10">
              <th className="p-4">User</th>
              <th className="p-4">Contact</th>
              <th className="p-4">Join Date</th>
              <th className="p-4">Orders</th>
              <th className="p-4 text-center">Status</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="text-sm font-inter text-luxury-white">
            {loading ? (
              <tr><td colSpan="6" className="p-8 text-center text-luxury-gray">Loading users...</td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan="6" className="p-8 text-center text-luxury-gray">No users found.</td></tr>
            ) : (
              users.map(user => (
                <tr key={user._id} className="border-b border-luxury-gray/10 hover:bg-luxury-secondary/30 transition-colors">
                  <td className="p-4">
                    <div className="font-medium text-luxury-white flex items-center gap-2">
                      {user.username}
                      {user.role === 'admin' && (
                        <span className="px-1.5 py-0.5 text-[9px] uppercase tracking-wider bg-luxury-gold text-luxury-dark rounded-sm">Admin</span>
                      )}
                    </div>
                  </td>
                  <td className="p-4 text-luxury-gray">
                    <div>{user.email}</div>
                    <div className="text-xs">{user.mobile}</div>
                  </td>
                  <td className="p-4 text-luxury-gray">
                    {dayjs(user.createdAt).format('DD MMM YYYY')}
                  </td>
                  <td className="p-4">
                    <span className="bg-luxury-dark border border-luxury-gray/20 px-2 py-1 rounded text-xs">
                      {user.orderCount || 0}
                    </span>
                  </td>
                  <td className="p-4 text-center">
                    <span className={`px-2 py-1 text-[10px] uppercase tracking-wider ${user.isBlocked ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 'bg-green-500/10 text-green-500 border border-green-500/20'}`}>
                      {user.isBlocked ? 'Blocked' : 'Active'}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center justify-end gap-3">
                      <Link to={`/admin/users/${user._id}`} className="text-luxury-gray hover:text-luxury-gold transition-colors" title="View Profile">
                        <FiEye size={18} />
                      </Link>
                      
                      {user.role !== 'admin' && (
                        <button 
                          onClick={() => handleToggleBlock(user._id, user.isBlocked)} 
                          className={`transition-colors ${user.isBlocked ? 'text-green-500 hover:text-green-400' : 'text-red-500 hover:text-red-400'}`}
                          title={user.isBlocked ? 'Unblock User' : 'Block User'}
                        >
                          {user.isBlocked ? <FiShield size={18} /> : <FiShieldOff size={18} />}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pagination.pages > 1 && (
        <div className="flex justify-center items-center gap-4 mt-8">
          <button 
            disabled={pagination.page === 1}
            onClick={() => fetchUsers(pagination.page - 1)}
            className="p-2 border border-luxury-gray/20 text-luxury-white disabled:opacity-30 hover:border-luxury-gold transition-colors"
          >
            <FiChevronLeft />
          </button>
          <span className="text-luxury-white font-inter text-sm">
            Page {pagination.page} of {pagination.pages}
          </span>
          <button 
            disabled={pagination.page === pagination.pages}
            onClick={() => fetchUsers(pagination.page + 1)}
            className="p-2 border border-luxury-gray/20 text-luxury-white disabled:opacity-30 hover:border-luxury-gold transition-colors"
          >
            <FiChevronRight />
          </button>
        </div>
      )}
    </div>
  );
}
