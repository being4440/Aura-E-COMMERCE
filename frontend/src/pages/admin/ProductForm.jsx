import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { FiUploadCloud, FiArrowLeft, FiX } from 'react-icons/fi';
import api from '../../api/api';

export default function ProductForm() {
  const navigate = useNavigate();
  const { id } = useParams();          // ← present only on /edit/:id
  const isEditMode = Boolean(id);

  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(isEditMode);
  const [existingImages, setExistingImages] = useState([]); // current DB images when editing
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'Men',
    brand: '',
    price: '',
    stock: '',
    sizes: '',
    colors: '',
    featured: false
  });
  const [imageFiles, setImageFiles] = useState([]);
  const [previewUrls, setPreviewUrls] = useState([]);

  // ── Step 2: Fetch existing product when in edit mode ──────────────────────
  useEffect(() => {
    if (!isEditMode) return;

    const fetchProduct = async () => {
      try {
        const res = await api.get(`/products/${id}`);
        const p = res.data.data.product;

        setFormData({
          title: p.title || '',
          description: p.description || '',
          category: p.category || 'Men',
          brand: p.brand || '',
          price: p.price ?? '',
          stock: p.stock ?? '',
          sizes: (p.sizes || []).join(', '),
          colors: (p.colors || []).join(', '),
          featured: p.featured || false
        });

        // Show existing cloud images as previews
        if (p.images?.length) {
          setExistingImages(p.images);
          setPreviewUrls(p.images);
        }
      } catch (err) {
        toast.error('Failed to load product data');
        navigate('/admin/products');
      } finally {
        setFetchLoading(false);
      }
    };

    fetchProduct();
  }, [id, isEditMode, navigate]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 5) {
      toast.error('Maximum 5 images allowed');
      return;
    }

    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    for (const file of files) {
      if (!validTypes.includes(file.type)) {
        toast.error('Only JPEG, PNG, and WebP images are allowed');
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error('Each image must be less than 10MB');
        return;
      }
    }

    setImageFiles(files);
    // Replace previews with newly selected files
    setPreviewUrls(files.map(file => URL.createObjectURL(file)));
    setExistingImages([]); // user is replacing images
  };

  const removeExistingImage = (index) => {
    const updated = existingImages.filter((_, i) => i !== index);
    setExistingImages(updated);
    setPreviewUrls(updated);
  };

  // ── Step 3: Submit — create or update depending on mode ──────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isEditMode) {
        // ── EDIT: send as JSON (images are optional; only include new ones)
        const payload = {
          title: formData.title,
          description: formData.description,
          category: formData.category,
          brand: formData.brand,
          price: Number(formData.price),
          stock: Number(formData.stock),
          featured: formData.featured,
          sizes: formData.sizes.split(',').map(s => s.trim()).filter(Boolean),
          colors: formData.colors.split(',').map(s => s.trim()).filter(Boolean),
        };



        // If the admin uploaded new files, send them as multipart
        if (imageFiles.length > 0) {
          const data = new FormData();
          Object.entries(payload).forEach(([key, val]) => {
            if (Array.isArray(val)) {
              val.forEach(v => data.append(key, v));
            } else {
              data.append(key, val);
            }
          });
          imageFiles.forEach(file => data.append('images', file));

          await api.patch(`/admin/products/${id}`, data, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
        } else {
          // No new images — keep existing (backend ignores images field if absent)
          await api.patch(`/admin/products/${id}`, payload);
        }

        toast.success('Product updated successfully!');
      } else {
        // ── CREATE: multipart required for image upload
        const data = new FormData();
        Object.keys(formData).forEach(key => {
          data.append(key, formData[key]);
        });
        imageFiles.forEach(file => data.append('images', file));

        await api.post('/admin/products', data, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });

        toast.success('Product created successfully!');
      }

      navigate('/admin/products');
    } catch (err) {
      toast.error(err.response?.data?.message || `Failed to ${isEditMode ? 'update' : 'create'} product`);
    } finally {
      setLoading(false);
    }
  };

  // ── Loading skeleton while fetching ──────────────────────────────────────
  if (fetchLoading) {
    return (
      <div className="max-w-4xl mx-auto pb-20 animate-pulse">
        <div className="h-10 bg-luxury-gray/20 rounded w-1/3 mb-8" />
        <div className="glass-card p-8 space-y-6">
          {[1, 2, 3].map(i => <div key={i} className="h-12 bg-luxury-gray/10 rounded" />)}
        </div>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-4xl mx-auto pb-20">
      {/* ── Step 4: Dynamic heading ── */}
      <div className="flex items-center gap-4 mb-8">
        <Link to="/admin/products" className="text-luxury-gray hover:text-luxury-gold transition-colors">
          <FiArrowLeft size={20} />
        </Link>
        <h1 className="text-3xl font-playfair text-luxury-white">
          {isEditMode ? 'Edit Product' : 'Add New Product'}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* ── Basic Information ── */}
        <div className="glass-card p-8 border-luxury-gray/10 rounded-lg space-y-6">
          <h2 className="text-xl font-playfair text-luxury-gold border-b border-luxury-gray/10 pb-4">Basic Information</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block font-poppins text-xs uppercase tracking-widest text-luxury-gray mb-2">Product Title *</label>
              <input type="text" name="title" required minLength="3" maxLength="100" value={formData.title} onChange={handleChange} className="w-full bg-luxury-dark border border-luxury-gray/30 px-4 py-3 text-luxury-white focus:outline-none focus:border-luxury-gold transition-colors" />
            </div>
            <div>
              <label className="block font-poppins text-xs uppercase tracking-widest text-luxury-gray mb-2">Brand</label>
              <input type="text" name="brand" maxLength="50" value={formData.brand} onChange={handleChange} className="w-full bg-luxury-dark border border-luxury-gray/30 px-4 py-3 text-luxury-white focus:outline-none focus:border-luxury-gold transition-colors" />
            </div>
          </div>

          <div>
            <label className="block font-poppins text-xs uppercase tracking-widest text-luxury-gray mb-2">Description *</label>
            <textarea name="description" required minLength="20" maxLength="5000" rows="4" value={formData.description} onChange={handleChange} className="w-full bg-luxury-dark border border-luxury-gray/30 px-4 py-3 text-luxury-white focus:outline-none focus:border-luxury-gold transition-colors"></textarea>
            <p className="text-luxury-gray text-xs mt-1 text-right">{formData.description.length}/5000</p>
          </div>
        </div>

        {/* ── Pricing & Inventory ── */}
        <div className="glass-card p-8 border-luxury-gray/10 rounded-lg space-y-6">
          <h2 className="text-xl font-playfair text-luxury-gold border-b border-luxury-gray/10 pb-4">Pricing & Inventory</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block font-poppins text-xs uppercase tracking-widest text-luxury-gray mb-2">Price (₹) *</label>
              <input type="number" name="price" required min="1" max="1000000" value={formData.price} onChange={handleChange} className="w-full bg-luxury-dark border border-luxury-gray/30 px-4 py-3 text-luxury-white focus:outline-none focus:border-luxury-gold transition-colors" />
            </div>
            <div>
              <label className="block font-poppins text-xs uppercase tracking-widest text-luxury-gray mb-2">Stock Quantity *</label>
              <input type="number" name="stock" required min="0" max="10000" value={formData.stock} onChange={handleChange} className="w-full bg-luxury-dark border border-luxury-gray/30 px-4 py-3 text-luxury-white focus:outline-none focus:border-luxury-gold transition-colors" />
            </div>
          </div>
        </div>

        {/* ── Variants & Classification ── */}
        <div className="glass-card p-8 border-luxury-gray/10 rounded-lg space-y-6">
          <h2 className="text-xl font-playfair text-luxury-gold border-b border-luxury-gray/10 pb-4">Variants & Classification</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block font-poppins text-xs uppercase tracking-widest text-luxury-gray mb-2">Category *</label>
              <select name="category" value={formData.category} onChange={handleChange} className="w-full bg-luxury-dark border border-luxury-gray/30 px-4 py-3 text-luxury-white focus:outline-none focus:border-luxury-gold transition-colors">
                <option value="Men">Men</option>
                <option value="Women">Women</option>
                <option value="Accessories">Accessories</option>
                <option value="Kids">Kids</option>
                <option value="Beauty">Beauty</option>
              </select>
            </div>
            <div>
              <label className="block font-poppins text-xs uppercase tracking-widest text-luxury-gray mb-2">Sizes (comma separated)</label>
              <input type="text" name="sizes" placeholder="S, M, L, XL" value={formData.sizes} onChange={handleChange} className="w-full bg-luxury-dark border border-luxury-gray/30 px-4 py-3 text-luxury-white focus:outline-none focus:border-luxury-gold transition-colors" />
            </div>
            <div>
              <label className="block font-poppins text-xs uppercase tracking-widest text-luxury-gray mb-2">Colors (comma separated)</label>
              <input type="text" name="colors" placeholder="Black, White, Red" value={formData.colors} onChange={handleChange} className="w-full bg-luxury-dark border border-luxury-gray/30 px-4 py-3 text-luxury-white focus:outline-none focus:border-luxury-gold transition-colors" />
            </div>
          </div>

          <div className="flex items-center gap-3 pt-4">
            <input type="checkbox" name="featured" id="featured" checked={formData.featured} onChange={handleChange} className="w-5 h-5 accent-luxury-gold" />
            <label htmlFor="featured" className="font-inter text-luxury-white cursor-pointer">Mark as Featured Product</label>
          </div>
        </div>

        {/* ── Product Images ── */}
        <div className="glass-card p-8 border-luxury-gray/10 rounded-lg space-y-6">
          <h2 className="text-xl font-playfair text-luxury-gold border-b border-luxury-gray/10 pb-4">
            Product Images
            {isEditMode && <span className="text-luxury-gray text-sm font-inter font-normal ml-3">(Upload new images to replace existing)</span>}
          </h2>

          <div className="border-2 border-dashed border-luxury-gray/30 rounded-lg p-10 text-center hover:border-luxury-gold transition-colors cursor-pointer relative">
            <input
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp"
              onChange={handleImageChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <div className="flex flex-col items-center justify-center">
              <FiUploadCloud className="text-luxury-gray text-4xl mb-4" />
              <p className="text-luxury-white font-inter">Drag & drop images here or click to browse</p>
              <p className="text-luxury-gray text-sm mt-2">Max 5 images · JPEG / PNG / WebP · Max 10MB each</p>
            </div>
          </div>

          {/* Image previews */}
          {previewUrls.length > 0 && (
            <div className="grid grid-cols-5 gap-4 mt-6">
              {previewUrls.map((url, i) => (
                <div key={i} className="relative aspect-square bg-luxury-dark rounded overflow-hidden border border-luxury-gray/20 group">
                  <img src={url} alt={`Preview ${i}`} className="w-full h-full object-cover" />
                  <div className="absolute top-1 left-1 bg-black/70 px-2 py-1 text-[10px] rounded text-white">
                    {i === 0 ? 'Primary' : `#${i + 1}`}
                  </div>
                  {/* Remove button — only for existing images (not new uploads) */}
                  {existingImages[i] && (
                    <button
                      type="button"
                      onClick={() => removeExistingImage(i)}
                      className="absolute top-1 right-1 bg-red-600/80 hover:bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <FiX size={12} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Submit ── */}
        <div className="flex items-center justify-end gap-4 pt-2">
          <Link to="/admin/products" className="text-luxury-gray hover:text-luxury-white font-poppins uppercase tracking-widest text-xs transition-colors py-4 px-6">
            Cancel
          </Link>
          <button type="submit" disabled={loading} className="btn-primary py-4 px-12 text-sm disabled:opacity-50">
            {loading
              ? (isEditMode ? 'Saving...' : 'Publishing...')
              : (isEditMode ? 'Save Changes' : 'Publish Product')}
          </button>
        </div>
      </form>
    </div>
  );
}
