import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FiEdit2, FiTrash2, FiPlus, FiSearch, FiChevronLeft, FiChevronRight, FiImage } from 'react-icons/fi';
import toast from 'react-hot-toast';
import axios from 'axios';

export default function ProductsManagement() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  
  // Filters
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [stockStatusFilter, setStockStatusFilter] = useState('');
  const [activeFilter, setActiveFilter] = useState('');
  
  const [categories, setCategories] = useState([]);

  const fetchProducts = async (page = 1) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const params = new URLSearchParams({
        page,
        limit: 10,
        search,
      });

      if (categoryFilter) params.append('category', categoryFilter);
      if (stockStatusFilter) params.append('stockStatus', stockStatusFilter);
      if (activeFilter !== '') params.append('isActive', activeFilter);

      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/admin/products?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.data.success) {
        setProducts(Array.isArray(res.data.data) ? res.data.data : []);
        setPagination(res.data.pagination || { page: 1, pages: 1, total: 0 });
      }
    } catch (err) {
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/admin/categories`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setCategories(res.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch categories');
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchProducts(1);
  }, [categoryFilter, stockStatusFilter, activeFilter]);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchProducts(1);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;
    try {
      const token = localStorage.getItem('token');
      const res = await axios.delete(`${import.meta.env.VITE_API_URL}/api/admin/products/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        toast.success(res.data.message || 'Product deleted');
        fetchProducts(pagination.page);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed');
    }
  };

  const handleQuickUpdateStock = async (id, newStock) => {
    try {
      const token = localStorage.getItem('token');
      await axios.patch(`${import.meta.env.VITE_API_URL}/api/admin/products/${id}/stock`, 
        { stock: Number(newStock) },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Stock updated');
      fetchProducts(pagination.page);
    } catch (err) {
      toast.error('Stock update failed');
      fetchProducts(pagination.page); // reset on fail
    }
  };

  const renderStockBadge = (stock) => {
    if (stock <= 0) return <span className="px-2 py-1 text-[10px] uppercase tracking-wider bg-red-500/20 text-red-500 border border-red-500/30">Out of Stock</span>;
    if (stock <= 10) return <span className="px-2 py-1 text-[10px] uppercase tracking-wider bg-yellow-500/20 text-yellow-500 border border-yellow-500/30">Low Stock</span>;
    return <span className="px-2 py-1 text-[10px] uppercase tracking-wider bg-green-500/20 text-green-500 border border-green-500/30">In Stock</span>;
  };

  return (
    <div className="p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <h1 className="text-3xl font-playfair text-luxury-white">Products Management</h1>
        <Link to="/admin/products/new" className="bg-luxury-gold text-luxury-dark px-4 py-2 font-inter font-medium hover:bg-white transition-colors flex items-center gap-2">
          <FiPlus /> New Product
        </Link>
      </div>

      <div className="bg-luxury-secondary/30 border border-luxury-gray/10 p-4 mb-6 flex flex-col lg:flex-row gap-4 items-end">
        <form onSubmit={handleSearch} className="flex-grow w-full lg:w-auto relative">
          <input 
            type="text"
            placeholder="Search products by title or brand..."
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
          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="bg-luxury-dark border border-luxury-gray/20 text-luxury-white px-3 py-2 focus:outline-none focus:border-luxury-gold font-inter text-sm">
            <option value="">All Categories</option>
            {categories.map(cat => (
              <option key={cat._id} value={cat.name}>{cat.name}</option>
            ))}
          </select>
          
          <select value={stockStatusFilter} onChange={(e) => setStockStatusFilter(e.target.value)} className="bg-luxury-dark border border-luxury-gray/20 text-luxury-white px-3 py-2 focus:outline-none focus:border-luxury-gold font-inter text-sm">
            <option value="">All Stock</option>
            <option value="inStock">In Stock (&gt;10)</option>
            <option value="lowStock">Low Stock (1-10)</option>
            <option value="outOfStock">Out of Stock (0)</option>
          </select>

          <select value={activeFilter} onChange={(e) => setActiveFilter(e.target.value)} className="bg-luxury-dark border border-luxury-gray/20 text-luxury-white px-3 py-2 focus:outline-none focus:border-luxury-gold font-inter text-sm">
            <option value="">All Statuses</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
        </div>
      </div>

      <div className="bg-luxury-secondary/30 border border-luxury-gray/10 overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-luxury-secondary/50 text-luxury-gray font-poppins text-xs uppercase tracking-widest border-b border-luxury-gray/10">
              <th className="p-4">Image</th>
              <th className="p-4">Details</th>
              <th className="p-4">Price</th>
              <th className="p-4">Stock</th>
              <th className="p-4">Status</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="text-sm font-inter text-luxury-white">
            {loading ? (
              <tr><td colSpan="6" className="p-8 text-center text-luxury-gray">Loading products...</td></tr>
            ) : products.length === 0 ? (
              <tr><td colSpan="6" className="p-8 text-center text-luxury-gray">No products found.</td></tr>
            ) : (
              products.map(product => (
                <tr key={product._id} className={`border-b border-luxury-gray/10 hover:bg-luxury-secondary/30 transition-colors ${!product.isActive ? 'opacity-60' : ''}`}>
                  <td className="p-4">
                    {product.images && product.images.length > 0 ? (
                      <img src={product.images[0]} alt={product.title} className="w-12 h-12 object-cover" />
                    ) : (
                      <div className="w-12 h-12 bg-luxury-gray/20 flex items-center justify-center text-luxury-gray/50">
                        <FiImage size={20} />
                      </div>
                    )}
                  </td>
                  <td className="p-4">
                    <p className="font-medium max-w-[250px] truncate text-luxury-white">{product.title}</p>
                    <p className="text-xs text-luxury-gray">{product.brand} • {product.category}</p>
                  </td>
                  <td className="p-4 text-luxury-gold font-medium">₹{product.price?.toLocaleString()}</td>
                  <td className="p-4">
                    <div className="flex flex-col gap-1 items-start">
                      <input 
                        type="number" 
                        defaultValue={product.stock}
                        onBlur={(e) => {
                          if (Number(e.target.value) !== product.stock) {
                            handleQuickUpdateStock(product._id, e.target.value);
                          }
                        }}
                        className="w-20 bg-transparent border border-luxury-gray/30 px-2 py-1 focus:border-luxury-gold outline-none text-luxury-white"
                        min="0"
                      />
                      {renderStockBadge(product.stock)}
                    </div>
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-1 text-[10px] uppercase tracking-wider ${product.isActive ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'}`}>
                      {product.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center justify-end gap-3">
                      <Link to={`/admin/products/edit/${product._id}`} className="text-luxury-gray hover:text-luxury-gold transition-colors">
                        <FiEdit2 size={18} />
                      </Link>
                      <button onClick={() => handleDelete(product._id)} className="text-luxury-gray hover:text-red-500 transition-colors">
                        <FiTrash2 size={18} />
                      </button>
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
            onClick={() => fetchProducts(pagination.page - 1)}
            className="p-2 border border-luxury-gray/20 text-luxury-white disabled:opacity-30 hover:border-luxury-gold transition-colors"
          >
            <FiChevronLeft />
          </button>
          <span className="text-luxury-white font-inter text-sm">
            Page {pagination.page} of {pagination.pages}
          </span>
          <button 
            disabled={pagination.page === pagination.pages}
            onClick={() => fetchProducts(pagination.page + 1)}
            className="p-2 border border-luxury-gray/20 text-luxury-white disabled:opacity-30 hover:border-luxury-gold transition-colors"
          >
            <FiChevronRight />
          </button>
        </div>
      )}
    </div>
  );
}
