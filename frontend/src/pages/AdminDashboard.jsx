import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { adminGetDashboardStatsAPI, adminGetRecentOrdersAPI, adminGetTopProductsAPI } from '../api/api';
import { toast } from 'react-hot-toast';
import { FiUsers, FiBox, FiShoppingBag, FiDollarSign, FiClock, FiCheckCircle, FiAlertCircle } from 'react-icons/fi';
import dayjs from 'dayjs';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [recentOrders, setRecentOrders] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);

        const [statsRes, ordersRes, productsRes] = await Promise.all([
          adminGetDashboardStatsAPI(),
          adminGetRecentOrdersAPI(),
          adminGetTopProductsAPI()
        ]);

        if (statsRes.data.success) setStats(statsRes.data.data);
        if (ordersRes.data.success) setRecentOrders(ordersRes.data.data);
        if (productsRes.data.success) setTopProducts(productsRes.data.data);
      } catch (error) {
        toast.error('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return <div className="p-8 text-luxury-gold">Loading dashboard...</div>;
  }

  const statCards = [
    { title: 'Total Revenue', value: `₹${stats?.totalRevenue?.toLocaleString() || 0}`, icon: <FiDollarSign size={24} />, color: 'text-green-500', bg: 'bg-green-500/10 border-green-500/20' },
    { title: 'Total Orders', value: stats?.totalOrders || 0, icon: <FiShoppingBag size={24} />, color: 'text-blue-500', bg: 'bg-blue-500/10 border-blue-500/20' },
    { title: 'Total Users', value: stats?.totalUsers || 0, icon: <FiUsers size={24} />, color: 'text-purple-500', bg: 'bg-purple-500/10 border-purple-500/20' },
    { title: 'Active Products', value: stats?.totalProducts || 0, icon: <FiBox size={24} />, color: 'text-luxury-gold', bg: 'bg-luxury-gold/10 border-luxury-gold/20' },
    { title: 'Delivered Orders', value: stats?.deliveredOrders || 0, icon: <FiCheckCircle size={24} />, color: 'text-emerald-500', bg: 'bg-emerald-500/10 border-emerald-500/20' },
    { title: 'Out of Stock', value: stats?.outOfStockProducts || 0, icon: <FiAlertCircle size={24} />, color: 'text-red-500', bg: 'bg-red-500/10 border-red-500/20' }
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      <h1 className="text-3xl font-playfair text-luxury-white">Dashboard Overview</h1>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, idx) => (
          <div key={idx} className={`p-6 border rounded flex items-center gap-4 ${stat.bg}`}>
            <div className={`p-3 rounded-full bg-luxury-dark ${stat.color}`}>
              {stat.icon}
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-luxury-gray">{stat.title}</p>
              <h3 className="text-2xl font-medium text-luxury-white mt-1">{stat.value}</h3>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        
        {/* Recent Orders */}
        <div className="xl:col-span-2 bg-luxury-secondary/30 border border-luxury-gray/10 p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-medium text-luxury-white">Recent Orders</h2>
            <Link to="/admin/orders" className="text-sm text-luxury-gold hover:underline">View All</Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-luxury-gray font-poppins text-xs uppercase tracking-widest border-b border-luxury-gray/10">
                  <th className="pb-3">Order ID</th>
                  <th className="pb-3">Date</th>
                  <th className="pb-3">Customer</th>
                  <th className="pb-3">Amount</th>
                  <th className="pb-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="text-sm font-inter text-luxury-white">
                {recentOrders.length === 0 ? (
                  <tr><td colSpan="5" className="py-4 text-luxury-gray">No recent orders</td></tr>
                ) : recentOrders.map(order => (
                  <tr key={order._id} className="border-b border-luxury-gray/5 last:border-0 hover:bg-luxury-secondary/50">
                    <td className="py-3">
                      <Link to={`/admin/orders/${order._id}`} className="text-luxury-gold hover:underline">
                        #{order._id.substring(order._id.length - 6)}
                      </Link>
                    </td>
                    <td className="py-3 text-luxury-gray">{dayjs(order.createdAt).format('DD MMM, HH:mm')}</td>
                    <td className="py-3">{order.user?.username || 'Guest'}</td>
                    <td className="py-3">₹{order.totalAmount?.toLocaleString()}</td>
                    <td className="py-3 text-right">
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
        </div>

        {/* Top Products */}
        <div className="bg-luxury-secondary/30 border border-luxury-gray/10 p-6">
          <h2 className="text-xl font-medium text-luxury-white mb-6">Top Products (Units Sold)</h2>
          <div className="space-y-4">
            {topProducts.length === 0 ? (
              <p className="text-luxury-gray text-sm">No sales data yet.</p>
            ) : topProducts.map((item, idx) => (
              <div key={item._id} className="flex items-center gap-4 bg-luxury-dark border border-luxury-gray/10 p-3">
                <div className="w-6 h-6 flex items-center justify-center bg-luxury-gold text-luxury-dark font-bold text-xs rounded-sm">
                  {idx + 1}
                </div>
                <img src={item.product?.images?.[0] || 'https://via.placeholder.com/40'} alt={item.product?.title} className="w-12 h-12 object-cover" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-luxury-white truncate">{item.product?.title}</p>
                  <p className="text-xs text-luxury-gray">₹{item.product?.price?.toLocaleString()}</p>
                  {(item.product?.sizes?.length > 0 || item.product?.colors?.length > 0) && (
                    <p className="text-[10px] text-luxury-gray/70 uppercase tracking-widest mt-0.5 truncate">
                      {item.product.sizes?.length > 0 && `Sizes: ${item.product.sizes.join(', ')}`}
                      {item.product.sizes?.length > 0 && item.product.colors?.length > 0 && ' | '}
                      {item.product.colors?.length > 0 && `Colors: ${item.product.colors.join(', ')}`}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-luxury-gold">{item.unitsSold}</p>
                  <p className="text-[10px] text-luxury-gray uppercase">sold</p>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
