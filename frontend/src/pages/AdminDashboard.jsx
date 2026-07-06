import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiUsers, FiShoppingBag, FiDollarSign, FiBox, FiLogOut, FiEdit, FiTrash2, FiUserX, FiUserCheck, FiX } from 'react-icons/fi';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { adminGetProductsAPI, adminAddProductAPI, adminUpdateProductAPI, adminUpdateStockAPI, adminDeleteProductAPI } from '../api/api';

const adminApi = axios.create({
  baseURL: 'http://localhost:5000/api/admin',
});

adminApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

const AdminDashboard = ({ tab = 'dashboard' }) => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  // Dashboard Data
  useEffect(() => {
    if (tab === 'dashboard') {
      fetchStats();
    }
  }, [tab]);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const { data } = await adminApi.get('/stats');
      setStats(data.data);
    } catch (err) {
      toast.error('Failed to load stats');
    } finally {
      setLoading(false);
    }
  };

  const renderContent = () => {
    switch (tab) {
      case 'dashboard':
        return <DashboardTab stats={stats} loading={loading} />;
      case 'orders':
        return <OrdersTab />;
      case 'customers':
        return <CustomersTab />;
      default:
        return <DashboardTab stats={stats} loading={loading} />;
    }
  };

  return (
    <div className="flex-1 w-full">
      {renderContent()}
    </div>
  );
};

// ----------------- SUBCOMPONENTS -----------------

const SidebarBtn = ({ active, onClick, icon: Icon, label }) => (
  <button 
    onClick={onClick}
    className={`flex items-center space-x-3 px-4 py-3 rounded transition-colors font-poppins text-sm uppercase tracking-widest ${active ? 'bg-luxury-gold/10 text-luxury-gold border border-luxury-gold/30' : 'text-luxury-gray hover:text-luxury-white hover:bg-luxury-secondary'}`}
  >
    <Icon className="w-5 h-5" />
    <span>{label}</span>
  </button>
);

const DashboardTab = ({ stats, loading }) => {
  if (loading) return <div className="text-luxury-gold animate-pulse text-xl">Loading Dashboard...</div>;
  
  const statCards = [
    { label: 'Total Revenue', value: `₹${stats?.totalRevenue?.toLocaleString() || 0}`, icon: FiDollarSign, color: 'text-luxury-gold' },
    { label: 'Total Orders', value: stats?.totalOrders || '0', icon: FiShoppingBag, color: 'text-luxury-white' },
    { label: 'Total Customers', value: stats?.totalCustomers || '0', icon: FiUsers, color: 'text-luxury-white' },
    { label: 'Orders Today', value: stats?.ordersToday || '0', icon: FiBox, color: 'text-luxury-gray' },
  ];

  const getStatusColor = (status) => {
    const colors = {
      'confirmed': 'text-blue-400',
      'packed': 'text-yellow-400',
      'shipped': 'text-orange-400',
      'outForDelivery': 'text-orange-300',
      'delivered': 'text-green-400',
      'cancelled': 'text-red-400'
    };
    return colors[status] || 'text-luxury-gray';
  };

  return (
    <div>
      <h1 className="text-3xl font-playfair tracking-wider text-luxury-white mb-8">Overview</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        {statCards.map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="glass-card p-6 border-luxury-gray/10">
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-luxury-secondary rounded"><stat.icon className={`w-6 h-6 ${stat.color}`} /></div>
            </div>
            <h3 className="text-luxury-gray font-poppins text-xs uppercase tracking-widest mb-1">{stat.label}</h3>
            <div className="text-2xl font-inter font-semibold text-luxury-white">{stat.value}</div>
          </motion.div>
        ))}
      </div>

      <div className="glass-card border-luxury-gray/10 p-6">
        <h3 className="text-lg font-playfair tracking-wider text-luxury-white mb-6 border-b border-luxury-gray/10 pb-4">Recent Orders</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-luxury-gray font-poppins text-xs uppercase tracking-widest border-b border-luxury-gray/10">
                <th className="pb-3 pr-4">Order ID</th>
                <th className="pb-3 pr-4">Customer</th>
                <th className="pb-3 pr-4">Amount</th>
                <th className="pb-3 pr-4">Status</th>
                <th className="pb-3 text-right">Date</th>
              </tr>
            </thead>
            <tbody className="text-sm font-inter text-luxury-white">
              {stats?.recentOrders?.map(order => (
                <tr key={order._id} className="border-b border-luxury-gray/10 hover:bg-luxury-secondary/50 transition-colors">
                  <td className="py-4 pr-4">#{order._id.substring(0, 8)}</td>
                  <td className="py-4 pr-4">{order.user?.username || order.user?.email}</td>
                  <td className="py-4 pr-4">₹{order.totalAmount}</td>
                  <td className={`py-4 pr-4 font-semibold ${getStatusColor(order.status)}`}>{order.status}</td>
                  <td className="py-4 text-right">{new Date(order.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const ProductsTab = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [quickStockUpdates, setQuickStockUpdates] = useState({});
  const [formData, setFormData] = useState({
    title: '', brand: '', category: 'Men', description: '', price: '',
    sizes: '', colors: '', stock: 0, images: '', isFeatured: false, isActive: true
  });

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const { data } = await adminGetProductsAPI({ limit: 100 });
      setProducts(data.data.products);
    } catch (err) {
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const handleDeactivateOrDelete = async (id) => {
    const isPermanent = window.confirm('Deactivate or permanently delete?\nOK = Delete Permanently\nCancel = Deactivate');
    try {
      await adminDeleteProductAPI(id, { permanent: isPermanent });
      toast.success(isPermanent ? 'Product permanently deleted' : 'Product deactivated');
      fetchProducts();
    } catch (err) {
      toast.error('Failed to update product');
    }
  };

  const handleStockUpdate = async (id) => {
    const stock = Number(quickStockUpdates[id]);
    if (isNaN(stock) || stock < 0) return toast.error('Invalid stock value');
    try {
      await adminUpdateStockAPI(id, { stock, reason: 'adjustment' });
      toast.success(`Stock updated to ${stock}`);
      // Update inline without full refresh
      setProducts(products.map(p => {
        if (p._id === id) {
          return {
            ...p,
            stock,
            stockStatus: stock === 0 ? 'out_of_stock' : stock < 10 ? 'low_stock' : 'in_stock'
          };
        }
        return p;
      }));
      setQuickStockUpdates({ ...quickStockUpdates, [id]: '' });
    } catch (err) {
      toast.error('Failed to update stock');
    }
  };

  const openModal = (product = null) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        title: product.title,
        brand: product.brand,
        category: product.category,
        description: product.description,
        price: product.price,
        sizes: product.sizes?.join(',') || '',
        colors: product.colors?.join(',') || '',
        stock: product.stock,
        images: product.images?.join('\n') || '',
        isFeatured: product.featured || false,
        isActive: product.isActive !== false
      });
    } else {
      setEditingProduct(null);
      setFormData({
        title: '', brand: '', category: 'Men', description: '', price: '',
        sizes: '', colors: '', stock: 0, images: '', isFeatured: false, isActive: true
      });
    }
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const price = Number(formData.price);
    const stock = Number(formData.stock);
    if (price <= 0 || price > 1000000) return toast.error('Price must be between 1 and 1,000,000');
    if (isNaN(stock) || stock < 0 || stock > 10000) return toast.error('Stock must be between 0 and 10,000');

    try {
      const payload = {
        ...formData,
        sizes: formData.sizes.split(',').map(s => s.trim()).filter(Boolean),
        colors: formData.colors.split(',').map(s => s.trim()).filter(Boolean),
        images: formData.images.split('\n').map(s => s.trim()).filter(Boolean)
      };

      if (!payload.images.length) return toast.error('At least one image URL required');

      if (editingProduct) {
        await adminUpdateProductAPI(editingProduct._id, payload);
        toast.success('Product updated!');
      } else {
        await adminAddProductAPI(payload);
        toast.success('Product added!');
      }
      setShowModal(false);
      fetchProducts();
    } catch (err) {
      toast.error('Failed to save product');
    }
  };

  if (loading) return <div className="text-luxury-gold animate-pulse text-xl">Loading Products...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-playfair tracking-wider text-luxury-white">Products</h1>
        <button onClick={() => openModal()} className="bg-luxury-gold text-luxury-dark px-4 py-2 uppercase font-poppins text-xs tracking-widest rounded hover:bg-white transition-colors">+ Add Product</button>
      </div>

      <div className="glass-card border-luxury-gray/10 p-6 overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="text-luxury-gray font-poppins text-xs uppercase tracking-widest border-b border-luxury-gray/10">
              <th className="pb-3 pr-4">Image</th>
              <th className="pb-3 pr-4">Name</th>
              <th className="pb-3 pr-4">Category</th>
              <th className="pb-3 pr-4">Price</th>
              <th className="pb-3 pr-4">Stock</th>
              <th className="pb-3 pr-4">Status</th>
              <th className="pb-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="text-sm font-inter text-luxury-white">
            {products.map(p => (
              <tr key={p._id} className="border-b border-luxury-gray/10 hover:bg-luxury-secondary/50 transition-colors">
                <td className="py-4 pr-4">
                  <img src={p.images?.[0] || 'https://via.placeholder.com/40'} alt={p.title} className="w-10 h-10 object-cover rounded" />
                </td>
                <td className="py-4 pr-4 max-w-[200px] truncate">{p.title}</td>
                <td className="py-4 pr-4">{p.category}</td>
                <td className="py-4 pr-4">₹{p.price}</td>
                <td className="py-4 pr-4 min-w-[150px]">
                  <div className="flex flex-col gap-2">
                    <span className={`px-2 py-1 rounded text-[10px] uppercase font-poppins w-fit ${p.stockStatus === 'out_of_stock' ? 'bg-red-500/20 text-red-400' : p.stockStatus === 'low_stock' ? 'bg-orange-500/20 text-orange-400' : 'bg-green-500/20 text-green-400'}`}>
                      {p.stockStatus === 'out_of_stock' ? 'Out of Stock' : p.stockStatus === 'low_stock' ? 'Low Stock' : 'In Stock'} ({p.stock} units)
                    </span>
                    <div className="flex gap-2 items-center">
                      <input 
                        type="number" 
                        min="0"
                        placeholder="Qty" 
                        value={quickStockUpdates[p._id] !== undefined ? quickStockUpdates[p._id] : ''}
                        onChange={(e) => setQuickStockUpdates({ ...quickStockUpdates, [p._id]: e.target.value })}
                        className="w-16 bg-luxury-dark border border-luxury-gray/30 text-white text-xs px-2 py-1 outline-none"
                      />
                      <button onClick={() => handleStockUpdate(p._id)} className="text-xs bg-luxury-gray/20 hover:bg-luxury-gold hover:text-black px-2 py-1 rounded transition-colors">Update</button>
                    </div>
                  </div>
                </td>
                <td className="py-4 pr-4">
                  <span className={p.isActive !== false ? 'text-green-400' : 'text-red-400'}>{p.isActive !== false ? 'Active' : 'Inactive'}</span>
                </td>
                <td className="py-4 text-right flex justify-end space-x-3 mt-4">
                  <button onClick={() => openModal(p)} className="text-blue-400 hover:text-blue-300"><FiEdit /></button>
                  <button onClick={() => handleDeactivateOrDelete(p._id)} className="text-red-400 hover:text-red-300"><FiTrash2 /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-luxury-secondary border border-luxury-gray/20 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-6 border-b border-luxury-gray/10 pb-4">
              <h2 className="text-2xl font-playfair text-luxury-white">{editingProduct ? 'Edit Product' : 'Add New Product'}</h2>
              <button onClick={() => setShowModal(false)} className="text-luxury-gray hover:text-luxury-white"><FiX size={24}/></button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4 font-inter text-sm">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-luxury-gray mb-1">Title</label>
                  <input required type="text" minLength="3" maxLength="100" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full bg-luxury-dark border border-luxury-gray/30 text-white p-2" />
                </div>
                <div>
                  <label className="block text-luxury-gray mb-1">Brand</label>
                  <input required type="text" maxLength="50" value={formData.brand} onChange={e => setFormData({...formData, brand: e.target.value})} className="w-full bg-luxury-dark border border-luxury-gray/30 text-white p-2" />
                </div>
                <div>
                  <label className="block text-luxury-gray mb-1">Category</label>
                  <select required value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full bg-luxury-dark border border-luxury-gray/30 text-white p-2">
                    <option value="Men">Men</option>
                    <option value="Women">Women</option>
                    <option value="Accessories">Accessories</option>
                    <option value="NewArrivals">NewArrivals</option>
                    <option value="Collections">Collections</option>
                  </select>
                </div>
                <div>
                  <label className="block text-luxury-gray mb-1">Stock Qty</label>
                  <input required type="number" min="0" max="10000" value={formData.stock} onChange={e => setFormData({...formData, stock: Number(e.target.value)})} className="w-full bg-luxury-dark border border-luxury-gray/30 text-white p-2" />
                </div>
                <div>
                  <label className="block text-luxury-gray mb-1">Price (₹)</label>
                  <input required type="number" min="1" max="1000000" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} className="w-full bg-luxury-dark border border-luxury-gray/30 text-white p-2" />
                </div>

              </div>

              <div>
                <label className="block text-luxury-gray mb-1">Description</label>
                <textarea required minLength="20" maxLength="5000" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full bg-luxury-dark border border-luxury-gray/30 text-white p-2 h-24"></textarea>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-luxury-gray mb-1">Sizes (comma separated)</label>
                  <input type="text" value={formData.sizes} onChange={e => setFormData({...formData, sizes: e.target.value})} placeholder="S, M, L, XL" className="w-full bg-luxury-dark border border-luxury-gray/30 text-white p-2" />
                </div>
                <div>
                  <label className="block text-luxury-gray mb-1">Colors (comma separated)</label>
                  <input type="text" value={formData.colors} onChange={e => setFormData({...formData, colors: e.target.value})} placeholder="Black, White, Red" className="w-full bg-luxury-dark border border-luxury-gray/30 text-white p-2" />
                </div>
              </div>

              <div>
                <label className="block text-luxury-gray mb-1">Image URLs (one per line)</label>
                <textarea required value={formData.images} onChange={e => setFormData({...formData, images: e.target.value})} className="w-full bg-luxury-dark border border-luxury-gray/30 text-white p-2 h-24" placeholder="https://image1.jpg&#10;https://image2.jpg"></textarea>
              </div>

              <div className="flex gap-6 mt-4 pt-4 border-t border-luxury-gray/10">
                <label className="flex items-center gap-2 text-luxury-white cursor-pointer">
                  <input type="checkbox" checked={formData.isFeatured} onChange={e => setFormData({...formData, isFeatured: e.target.checked})} className="w-4 h-4" />
                  Featured
                </label>
                <label className="flex items-center gap-2 text-luxury-white cursor-pointer">
                  <input type="checkbox" checked={formData.isActive} onChange={e => setFormData({...formData, isActive: e.target.checked})} className="w-4 h-4" />
                  Active
                </label>
              </div>

              <div className="flex justify-end gap-4 mt-8 pt-4 border-t border-luxury-gray/10">
                <button type="button" onClick={() => setShowModal(false)} className="px-6 py-2 text-luxury-gray hover:text-white">Cancel</button>
                <button type="submit" className="px-6 py-2 bg-luxury-gold text-luxury-dark hover:bg-white font-poppins uppercase tracking-widest text-xs transition-colors rounded">
                  {editingProduct ? 'Save Changes' : 'Add Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const OrdersTab = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const { data } = await adminApi.get('/orders');
      setOrders(data.data.orders);
    } catch (err) {
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id, status) => {
    try {
      await adminApi.patch(`/orders/${id}/status`, { status });
      toast.success('Order status updated');
      fetchOrders();
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  if (loading) return <div className="text-luxury-gold animate-pulse text-xl">Loading Orders...</div>;

  return (
    <div>
      <h1 className="text-3xl font-playfair tracking-wider text-luxury-white mb-8">Orders</h1>

      <div className="glass-card border-luxury-gray/10 p-6 overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="text-luxury-gray font-poppins text-xs uppercase tracking-widest border-b border-luxury-gray/10">
              <th className="pb-3 pr-4">Order ID</th>
              <th className="pb-3 pr-4">Customer</th>
              <th className="pb-3 pr-4">Total</th>
              <th className="pb-3 pr-4">Date</th>
              <th className="pb-3 pr-4">Status</th>
            </tr>
          </thead>
          <tbody className="text-sm font-inter text-luxury-white">
            {orders.map(o => (
              <tr key={o._id} className="border-b border-luxury-gray/10 hover:bg-luxury-secondary/50 transition-colors">
                <td className="py-4 pr-4">#{o._id.substring(0,8)}</td>
                <td className="py-4 pr-4">{o.user?.username || o.user?.email}</td>
                <td className="py-4 pr-4">₹{o.totalAmount}</td>
                <td className="py-4 pr-4">{new Date(o.createdAt).toLocaleDateString()}</td>
                <td className="py-4 pr-4">
                  <select 
                    value={o.status || 'confirmed'}
                    onChange={(e) => updateStatus(o._id, e.target.value)}
                    className="bg-luxury-dark text-luxury-white border border-luxury-gray/30 rounded px-2 py-1 outline-none text-xs"
                  >
                    <option value="pending">Pending</option>
                    <option value="processing">Processing</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="packed">Packed</option>
                    <option value="shipped">Shipped</option>
                    <option value="outForDelivery">Out For Delivery</option>
                    <option value="delivered">Delivered</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const CustomersTab = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      const { data } = await adminApi.get('/users');
      setCustomers(data.data.users);
    } catch (err) {
      toast.error('Failed to load customers');
    } finally {
      setLoading(false);
    }
  };

  const toggleBan = async (id, currentStatus) => {
    try {
      await adminApi.patch(`/users/${id}`, { isActive: !currentStatus });
      toast.success(currentStatus ? 'User banned' : 'User unbanned');
      fetchCustomers();
    } catch (err) {
      toast.error('Failed to update user');
    }
  };

  if (loading) return <div className="text-luxury-gold animate-pulse text-xl">Loading Customers...</div>;

  return (
    <div>
      <h1 className="text-3xl font-playfair tracking-wider text-luxury-white mb-8">Customers</h1>

      <div className="glass-card border-luxury-gray/10 p-6 overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="text-luxury-gray font-poppins text-xs uppercase tracking-widest border-b border-luxury-gray/10">
              <th className="pb-3 pr-4">Username</th>
              <th className="pb-3 pr-4">Email</th>
              <th className="pb-3 pr-4">Joined</th>
              <th className="pb-3 pr-4">Status</th>
              <th className="pb-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="text-sm font-inter text-luxury-white">
            {customers.map(c => (
              <tr key={c._id} className="border-b border-luxury-gray/10 hover:bg-luxury-secondary/50 transition-colors">
                <td className="py-4 pr-4">{c.username}</td>
                <td className="py-4 pr-4">{c.email}</td>
                <td className="py-4 pr-4">{new Date(c.createdAt).toLocaleDateString()}</td>
                <td className="py-4 pr-4">
                  {c.isActive !== false ? <span className="bg-green-500/20 text-green-400 px-2 py-1 rounded text-xs">Active</span> : <span className="bg-red-500/20 text-red-400 px-2 py-1 rounded text-xs">Banned</span>}
                </td>
                <td className="py-4 text-right flex justify-end">
                  <button 
                    onClick={() => toggleBan(c._id, c.isActive !== false)}
                    className={`flex items-center space-x-1 text-xs px-3 py-1 rounded ${c.isActive !== false ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20' : 'bg-green-500/10 text-green-400 hover:bg-green-500/20'}`}
                  >
                    {c.isActive !== false ? <><FiUserX /><span>Ban</span></> : <><FiUserCheck /><span>Unban</span></>}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminDashboard;
