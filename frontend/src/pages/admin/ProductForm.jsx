import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { FiArrowLeft, FiUploadCloud, FiX } from 'react-icons/fi';

export default function ProductForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = !!id;

  const [loading, setLoading] = useState(isEditing);
  const [submitting, setSubmitting] = useState(false);
  const [categories, setCategories] = useState([]);
  
  const [formData, setFormData] = useState({
    title: '',
    brand: '',
    category: '',
    price: '',
    stock: '',
    description: '',
    sizes: '',
    colors: '',
    isActive: true,
    featured: false
  });

  const [existingImages, setExistingImages] = useState([]);
  const [newImages, setNewImages] = useState([]);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/admin/categories`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.data.success) {
          setCategories(res.data.data);
          // Set default category if creating new
          if (!isEditing && res.data.data.length > 0) {
            setFormData(prev => ({ ...prev, category: res.data.data[0].name }));
          }
        }
      } catch (error) {
        toast.error('Failed to fetch categories');
      }
    };
    fetchCategories();
  }, [isEditing]);

  useEffect(() => {
    if (isEditing) {
      const fetchProduct = async () => {
        try {
          const token = localStorage.getItem('token');
          const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/admin/products/${id}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (res.data.success) {
            const p = res.data.data;
            setFormData({
              title: p.title,
              brand: p.brand,
              category: p.category,
              price: p.price,
              stock: p.stock,
              description: p.description,
              sizes: p.sizes?.join(', ') || '',
              colors: p.colors?.join(', ') || '',
              isActive: p.isActive,
              featured: p.featured
            });
            setExistingImages(p.images || []);
          }
        } catch (error) {
          toast.error('Failed to load product details');
          navigate('/admin/products');
        } finally {
          setLoading(false);
        }
      };
      fetchProduct();
    }
  }, [id, isEditing, navigate]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    
    // Total max 5 images
    if (newImages.length + files.length > 5) {
      toast.error('Maximum 5 images allowed in total');
      return;
    }
    
    // We only preview new images. If editing, we typically replace existing or append.
    // Our backend replaces images if req.files is present.
    setNewImages(prev => [...prev, ...files]);
  };

  const removeNewImage = (index) => {
    setNewImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const token = localStorage.getItem('token');
      
      const submitData = new FormData();
      Object.keys(formData).forEach(key => submitData.append(key, formData[key]));
      
      newImages.forEach(img => {
        submitData.append('images', img);
      });

      if (isEditing) {
        await axios.put(`${import.meta.env.VITE_API_URL}/api/admin/products/${id}`, submitData, {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        });
        toast.success('Product updated successfully');
      } else {
        await axios.post(`${import.meta.env.VITE_API_URL}/api/admin/products`, submitData, {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        });
        toast.success('Product created successfully');
      }
      navigate('/admin/products');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="p-8 text-luxury-gold">Loading...</div>;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => navigate('/admin/products')} className="p-2 text-luxury-gray hover:text-luxury-white transition-colors border border-luxury-gray/20 rounded">
          <FiArrowLeft size={18} />
        </button>
        <h1 className="text-3xl font-playfair text-luxury-white">
          {isEditing ? 'Edit Product' : 'Add New Product'}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-luxury-secondary/30 border border-luxury-gray/10 p-8 flex flex-col gap-6">
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex flex-col gap-2">
            <label className="text-xs uppercase tracking-wider text-luxury-gray">Title *</label>
            <input required type="text" name="title" value={formData.title} onChange={handleChange} className="bg-luxury-dark border border-luxury-gray/20 text-luxury-white px-4 py-2 focus:border-luxury-gold outline-none" />
          </div>
          
          <div className="flex flex-col gap-2">
            <label className="text-xs uppercase tracking-wider text-luxury-gray">Brand</label>
            <input type="text" name="brand" value={formData.brand} onChange={handleChange} className="bg-luxury-dark border border-luxury-gray/20 text-luxury-white px-4 py-2 focus:border-luxury-gold outline-none" />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs uppercase tracking-wider text-luxury-gray">Category *</label>
            <select required name="category" value={formData.category} onChange={handleChange} className="bg-luxury-dark border border-luxury-gray/20 text-luxury-white px-4 py-2 focus:border-luxury-gold outline-none">
              <option value="" disabled>Select Category</option>
              {categories.map(cat => (
                <option key={cat._id} value={cat.name}>{cat.name}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs uppercase tracking-wider text-luxury-gray">Price (₹) *</label>
            <input required type="number" name="price" value={formData.price} onChange={handleChange} className="bg-luxury-dark border border-luxury-gray/20 text-luxury-white px-4 py-2 focus:border-luxury-gold outline-none" min="0" />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs uppercase tracking-wider text-luxury-gray">Stock *</label>
            <input required type="number" name="stock" value={formData.stock} onChange={handleChange} className="bg-luxury-dark border border-luxury-gray/20 text-luxury-white px-4 py-2 focus:border-luxury-gold outline-none" min="0" />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-xs uppercase tracking-wider text-luxury-gray">Description *</label>
          <textarea required name="description" value={formData.description} onChange={handleChange} rows="5" className="bg-luxury-dark border border-luxury-gray/20 text-luxury-white px-4 py-2 focus:border-luxury-gold outline-none"></textarea>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex flex-col gap-2">
            <label className="text-xs uppercase tracking-wider text-luxury-gray">Sizes (comma separated)</label>
            <input type="text" name="sizes" value={formData.sizes} onChange={handleChange} placeholder="e.g. S, M, L, XL" className="bg-luxury-dark border border-luxury-gray/20 text-luxury-white px-4 py-2 focus:border-luxury-gold outline-none" />
          </div>
          
          <div className="flex flex-col gap-2">
            <label className="text-xs uppercase tracking-wider text-luxury-gray">Colors (comma separated)</label>
            <input type="text" name="colors" value={formData.colors} onChange={handleChange} placeholder="e.g. Black, White, Red" className="bg-luxury-dark border border-luxury-gray/20 text-luxury-white px-4 py-2 focus:border-luxury-gold outline-none" />
          </div>
        </div>

        <div className="flex gap-8">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" name="isActive" checked={formData.isActive} onChange={handleChange} className="accent-luxury-gold w-4 h-4" />
            <span className="text-sm text-luxury-white">Active Product</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" name="featured" checked={formData.featured} onChange={handleChange} className="accent-luxury-gold w-4 h-4" />
            <span className="text-sm text-luxury-white">Featured Product</span>
          </label>
        </div>

        <div className="flex flex-col gap-4 border-t border-luxury-gray/10 pt-6">
          <label className="text-xs uppercase tracking-wider text-luxury-gray">Product Images (Max 5)</label>
          
          <div className="flex flex-wrap gap-4">
            {/* Existing Images Display */}
            {isEditing && existingImages.length > 0 && newImages.length === 0 && (
              <div className="w-full text-xs text-luxury-gray mb-2">
                Currently showing {existingImages.length} saved images. Uploading new images will replace them entirely.
              </div>
            )}
            
            {newImages.length === 0 && existingImages.map((url, i) => (
              <div key={i} className="relative w-24 h-24 border border-luxury-gray/20">
                <img src={url} alt="Current product" className="w-full h-full object-cover" />
              </div>
            ))}

            {/* New Images Preview */}
            {newImages.map((file, i) => (
              <div key={i} className="relative w-24 h-24 border border-luxury-gold/50">
                <img src={URL.createObjectURL(file)} alt="New upload" className="w-full h-full object-cover" />
                <button type="button" onClick={() => removeNewImage(i)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors">
                  <FiX size={12} />
                </button>
              </div>
            ))}

            {/* Upload Button */}
            {newImages.length < 5 && (
              <label className="w-24 h-24 border-2 border-dashed border-luxury-gray/30 flex flex-col items-center justify-center text-luxury-gray hover:border-luxury-gold hover:text-luxury-gold transition-colors cursor-pointer">
                <FiUploadCloud size={24} />
                <span className="text-[10px] mt-1 uppercase">Upload</span>
                <input type="file" multiple accept="image/*" onChange={handleImageChange} className="hidden" />
              </label>
            )}
          </div>
        </div>

        <div className="flex justify-end mt-4">
          <button type="submit" disabled={submitting} className="bg-luxury-gold text-luxury-dark px-8 py-3 font-medium hover:bg-white transition-colors disabled:opacity-50">
            {submitting ? 'Saving...' : isEditing ? 'Update Product' : 'Create Product'}
          </button>
        </div>
      </form>
    </div>
  );
}
