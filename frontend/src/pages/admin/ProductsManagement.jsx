import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FiEdit2, FiTrash2, FiPlus } from 'react-icons/fi';
import toast from 'react-hot-toast';
import api, { adminDeleteProductAPI, adminGetProductsAPI } from '../../api/api';

export default function ProductsManagement() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchProducts = async () => {
    try {
      const res = await api.get('/products?limit=100');
      setProducts(res.data.data.products);
    } catch (err) {
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;
    try {
      await adminDeleteProductAPI(id);
      toast.success('Product deleted');
      setProducts(products.filter(p => p._id !== id));
    } catch (err) {
      toast.error('Delete failed');
    }
  };

  const handleQuickUpdate = async (id, field, value) => {
    try {
      await api.patch(`/admin/products/${id}`, {
        [field]: Number(value)
      });
      toast.success('Updated');
    } catch (err) {
      toast.error('Update failed');
      fetchProducts(); // reset on fail
    }
  };

  if (loading) return <div className="text-luxury-gold animate-pulse">Loading Products...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-playfair text-luxury-white">Products Management</h1>
        <Link to="/admin/products/new" className="btn-primary py-2 px-4 flex items-center gap-2">
          <FiPlus /> New Product
        </Link>
      </div>

      <div className="glass-card overflow-x-auto border-luxury-gray/10 rounded-lg">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-luxury-secondary/50 text-luxury-gray font-poppins text-xs uppercase tracking-widest border-b border-luxury-gray/10">
              <th className="p-4">Image</th>
              <th className="p-4">Title</th>
              <th className="p-4">Price</th>

              <th className="p-4">Stock</th>
              <th className="p-4">Actions</th>
            </tr>
          </thead>
          <tbody className="text-sm font-inter text-luxury-white">
            {products.map(product => (
              <tr key={product._id} className="border-b border-luxury-gray/10 hover:bg-luxury-secondary/30 transition-colors">
                <td className="p-4">
                  <img src={product.images?.[0] || 'https://via.placeholder.com/50'} alt={product.title} className="w-12 h-12 object-cover rounded" />
                </td>
                <td className="p-4 font-medium max-w-[200px] truncate">{product.title}</td>
                <td className="p-4">
                  <input 
                    type="number" 
                    defaultValue={product.price}
                    onBlur={(e) => {
                      if (Number(e.target.value) !== product.price) {
                        handleQuickUpdate(product._id, 'price', e.target.value);
                      }
                    }}
                    className="w-24 bg-transparent border border-luxury-gray/30 px-2 py-1 focus:border-luxury-gold outline-none"
                  />
                </td>

                <td className="p-4">
                  <input 
                    type="number" 
                    defaultValue={product.stock}
                    onBlur={(e) => {
                      if (Number(e.target.value) !== product.stock) {
                        handleQuickUpdate(product._id, 'stock', e.target.value);
                      }
                    }}
                    className="w-20 bg-transparent border border-luxury-gray/30 px-2 py-1 focus:border-luxury-gold outline-none"
                  />
                </td>
                <td className="p-4 flex gap-3 mt-2">
                  <Link to={`/admin/products/edit/${product._id}`} className="text-luxury-gray hover:text-luxury-white transition-colors">
                    <FiEdit2 size={18} />
                  </Link>
                  <button onClick={() => handleDelete(product._id)} className="text-luxury-gray hover:text-red-400 transition-colors">
                    <FiTrash2 size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
