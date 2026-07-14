import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { adminGetOrdersAPI } from '../../api/api';
import { toast } from 'react-hot-toast';
import { FiSearch, FiEye, FiFilter, FiChevronLeft, FiChevronRight } from 'react-icons/fi';

const statusColors = {
  'pending': 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30',
  'processing': 'bg-blue-500/20 text-blue-500 border-blue-500/30',
  'confirmed': 'bg-blue-500/20 text-blue-500 border-blue-500/30',
  'packed': 'bg-purple-500/20 text-purple-500 border-purple-500/30',
  'shipped': 'bg-indigo-500/20 text-indigo-500 border-indigo-500/30',
  'outForDelivery': 'bg-orange-500/20 text-orange-500 border-orange-500/30',
  'delivered': 'bg-green-500/20 text-green-500 border-green-500/30',
  'cancelled': 'bg-red-500/20 text-red-500 border-red-500/30'
};

const formatStatus = (status) => {
  if (!status) return '';
  if (status === 'outForDelivery') return 'Out for Delivery';
  return status.charAt(0).toUpperCase() + status.slice(1);
};

export default function AdminOrdersList() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  
  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('');
  const [returnStatusFilter, setReturnStatusFilter] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');

  const fetchOrders = async (page = 1) => {
    try {
      setLoading(true);
      
      const params = new URLSearchParams({
        page,
        limit: 10,
        search,
        sortBy,
        sortOrder
      });

      if (statusFilter) params.append('status', statusFilter);
      if (paymentMethodFilter) params.append('paymentMethod', paymentMethodFilter);
      if (returnStatusFilter) params.append('returnStatus', returnStatusFilter);

      const res = await adminGetOrdersAPI(params);
      
      if (res.data.success) {
        setOrders(res.data.data);
        setPagination(res.data.pagination);
      }
    } catch (error) {
      toast.error('Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders(1);
  }, [statusFilter, paymentMethodFilter, returnStatusFilter, sortBy, sortOrder]);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchOrders(1);
  };

  return (
    <div className="p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <h2 className="text-2xl font-playfair text-luxury-white">Order Management</h2>
      </div>

      <div className="bg-luxury-secondary/30 border border-luxury-gray/10 p-4 mb-6 flex flex-col lg:flex-row gap-4 items-end">
        <form onSubmit={handleSearch} className="flex-grow w-full lg:w-auto relative">
          <input 
            type="text"
            placeholder="Search by Order ID, Customer Name or Email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-luxury-dark border border-luxury-gray/20 text-luxury-white px-4 py-2 pl-10 focus:outline-none focus:border-luxury-gold transition-colors font-inter"
          />
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-luxury-gray" />
        </form>
        <button onClick={handleSearch} className="bg-luxury-gold text-luxury-dark px-4 py-2 font-inter font-medium hover:bg-white transition-colors">
          Search
        </button>

        <div className="flex gap-2 w-full lg:w-auto overflow-x-auto pb-2 lg:pb-0">
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="bg-luxury-dark border border-luxury-gray/20 text-luxury-white px-3 py-2 focus:outline-none focus:border-luxury-gold font-inter text-sm">
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="packed">Packed</option>
            <option value="shipped">Shipped</option>
            <option value="outForDelivery">Out for Delivery</option>
            <option value="delivered">Delivered</option>
            <option value="cancelled">Cancelled</option>
          </select>
          
          <select value={returnStatusFilter} onChange={(e) => setReturnStatusFilter(e.target.value)} className="bg-luxury-dark border border-luxury-gray/20 text-luxury-white px-3 py-2 focus:outline-none focus:border-luxury-gold font-inter text-sm">
            <option value="">All Returns</option>
            <option value="Return Requested">Return Requested</option>
            <option value="Approved">Return Approved</option>
            <option value="Refund Processing">Refund Processing</option>
            <option value="Refund Processed">Refund Processed</option>
          </select>

          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="bg-luxury-dark border border-luxury-gray/20 text-luxury-white px-3 py-2 focus:outline-none focus:border-luxury-gold font-inter text-sm">
            <option value="createdAt">Date Created</option>
            <option value="totalAmount">Amount</option>
            <option value="customerName">Customer Name</option>
            <option value="status">Status</option>
          </select>

          <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} className="bg-luxury-dark border border-luxury-gray/20 text-luxury-white px-3 py-2 focus:outline-none focus:border-luxury-gold font-inter text-sm">
            <option value="desc">Desc</option>
            <option value="asc">Asc</option>
          </select>
        </div>
      </div>

      <div className="bg-luxury-secondary/30 border border-luxury-gray/10 overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-luxury-gray/10 text-luxury-gray font-poppins uppercase tracking-wider text-xs">
              <th className="p-4">Order ID</th>
              <th className="p-4">Date</th>
              <th className="p-4">Customer</th>
              <th className="p-4">Total</th>
              <th className="p-4">Status</th>
              <th className="p-4">Return</th>
              <th className="p-4 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="7" className="p-8 text-center text-luxury-gray">Loading orders...</td></tr>
            ) : orders.length === 0 ? (
              <tr><td colSpan="7" className="p-8 text-center text-luxury-gray">No orders found.</td></tr>
            ) : (
              orders.map((order) => (
                <tr key={order._id} className="border-b border-luxury-gray/5 hover:bg-luxury-gray/5 transition-colors font-inter text-sm">
                  <td className="p-4 text-luxury-white/70 font-mono">{order._id.substring(order._id.length - 8).toUpperCase()}</td>
                  <td className="p-4 text-luxury-white/80">{new Date(order.createdAt).toLocaleDateString()}</td>
                  <td className="p-4">
                    <div className="text-luxury-white">{order.shippingAddress?.fullName}</div>
                    <div className="text-xs text-luxury-gray">{order.user?.email || 'Guest'}</div>
                  </td>
                  <td className="p-4 text-luxury-gold">₹{order.totalAmount?.toLocaleString()}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 text-xs border uppercase tracking-wider ${statusColors[order.status] || 'bg-gray-500/20 text-gray-400 border-gray-500/30'}`}>
                      {formatStatus(order.status)}
                    </span>
                  </td>
                  <td className="p-4 text-xs text-luxury-white/60">
                    {order.returnStatus && order.returnStatus !== 'None' ? order.returnStatus : '-'}
                  </td>
                  <td className="p-4 text-center">
                    <Link to={`/admin/orders/${order._id}`} className="inline-flex items-center justify-center p-2 text-luxury-gray hover:text-luxury-gold transition-colors">
                      <FiEye size={18} />
                    </Link>
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
            onClick={() => fetchOrders(pagination.page - 1)}
            className="p-2 border border-luxury-gray/20 text-luxury-white disabled:opacity-30 hover:border-luxury-gold transition-colors"
          >
            <FiChevronLeft />
          </button>
          <span className="text-luxury-white font-inter text-sm">
            Page {pagination.page} of {pagination.pages}
          </span>
          <button 
            disabled={pagination.page === pagination.pages}
            onClick={() => fetchOrders(pagination.page + 1)}
            className="p-2 border border-luxury-gray/20 text-luxury-white disabled:opacity-30 hover:border-luxury-gold transition-colors"
          >
            <FiChevronRight />
          </button>
        </div>
      )}
    </div>
  );
}
