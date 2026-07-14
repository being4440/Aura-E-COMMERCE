import React, { useState, useEffect } from 'react';
import { adminGetCategoriesAPI, adminAddCategoryAPI, adminUpdateCategoryAPI, adminDeleteCategoryAPI } from '../../api/api';
import { toast } from 'react-hot-toast';
import { FiEdit2, FiTrash2, FiPlus, FiX, FiCheck } from 'react-icons/fi';

export default function AdminCategoriesList() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const res = await adminGetCategoriesAPI();
      if (res.data.success) {
        setCategories(res.data.data);
      }
    } catch (error) {
      toast.error('Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleCreateCategory = async (e) => {
    e.preventDefault();
    if (!newCategoryName.trim() || submitting) return;
    
    try {
      setSubmitting(true);
      const res = await adminAddCategoryAPI({ name: newCategoryName });
      if (res.data.success) {
        toast.success('Category created successfully');
        setNewCategoryName('');
        setShowAddForm(false);
        fetchCategories();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create category');
    } finally {
      setSubmitting(false);
    }
  };

  const startEdit = (cat) => {
    setEditingId(cat._id);
    setEditName(cat.name);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName('');
  };

  const handleUpdateCategory = async (id) => {
    if (!editName.trim() || submitting) return;
    try {
      setSubmitting(true);
      const res = await adminUpdateCategoryAPI(id, { name: editName });
      if (res.data.success) {
        toast.success('Category updated successfully');
        cancelEdit();
        fetchCategories();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update category');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (id, currentStatus) => {
    try {
      const res = await adminUpdateCategoryAPI(id, { isActive: !currentStatus });
      if (res.data.success) {
        toast.success('Category status updated');
        fetchCategories();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update category status');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to deactivate this category? It will no longer be available for new products.')) return;
    try {
      const res = await adminDeleteCategoryAPI(id);
      if (res.data.success) {
        toast.success(res.data.message || 'Category deactivated');
        fetchCategories();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to deactivate category');
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-playfair text-luxury-white">Category Management</h1>
        <button 
          onClick={() => setShowAddForm(!showAddForm)}
          className="bg-luxury-gold text-luxury-dark px-4 py-2 font-inter font-medium hover:bg-white transition-colors flex items-center gap-2"
        >
          {showAddForm ? <><FiX /> Cancel</> : <><FiPlus /> New Category</>}
        </button>
      </div>

      {showAddForm && (
        <form onSubmit={handleCreateCategory} className="bg-luxury-secondary/30 border border-luxury-gray/10 p-6 mb-8 flex items-end gap-4">
          <div className="flex flex-col gap-2 flex-grow">
            <label className="text-xs uppercase tracking-wider text-luxury-gray">New Category Name</label>
            <input 
              required 
              autoFocus
              type="text" 
              value={newCategoryName} 
              onChange={(e) => setNewCategoryName(e.target.value)} 
              placeholder="e.g. Footwear, Outerwear..."
              className="w-full bg-luxury-dark border border-luxury-gray/20 text-luxury-white px-4 py-2 focus:border-luxury-gold outline-none" 
            />
          </div>
          <button type="submit" disabled={submitting} className="bg-luxury-gold text-luxury-dark px-6 py-2 font-medium hover:bg-white transition-colors h-[42px] disabled:opacity-50">
            {submitting ? 'Saving...' : 'Save Category'}
          </button>
        </form>
      )}

      <div className="bg-luxury-secondary/30 border border-luxury-gray/10 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-luxury-secondary/50 text-luxury-gray font-poppins text-xs uppercase tracking-widest border-b border-luxury-gray/10">
              <th className="p-4">Category</th>
              <th className="p-4 text-center">Items Count</th>
              <th className="p-4 text-center">Status</th>
              <th className="p-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="text-sm font-inter text-luxury-white">
            {loading ? (
              <tr><td colSpan="4" className="p-8 text-center text-luxury-gray">Loading categories...</td></tr>
            ) : categories.length === 0 ? (
              <tr><td colSpan="4" className="p-8 text-center text-luxury-gray">No categories found.</td></tr>
            ) : (
              categories.map(cat => (
                <tr key={cat._id} className={`border-b border-luxury-gray/10 hover:bg-luxury-secondary/30 transition-colors ${!cat.isActive ? 'opacity-60' : ''}`}>
                  <td className="p-4">
                    {editingId === cat._id ? (
                      <input 
                        type="text" 
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="bg-luxury-dark border border-luxury-gray/20 text-luxury-white px-2 py-1 focus:border-luxury-gold outline-none w-full"
                        autoFocus
                      />
                    ) : (
                      <span className="font-medium text-luxury-white">{cat.name}</span>
                    )}
                  </td>
                  <td className="p-4 text-center text-luxury-gray font-medium">{cat.itemCount || 0}</td>
                  <td className="p-4 text-center">
                    <button 
                      onClick={() => handleToggleActive(cat._id, cat.isActive)}
                      className={`px-2 py-1 text-[10px] uppercase tracking-wider transition-colors ${cat.isActive ? 'bg-green-500/10 text-green-500 border border-green-500/20 hover:bg-green-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20'}`}
                    >
                      {cat.isActive ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center justify-end gap-3">
                      {editingId === cat._id ? (
                        <>
                          <button onClick={() => handleUpdateCategory(cat._id)} disabled={submitting} className="text-green-500 hover:text-green-400 transition-colors disabled:opacity-50" title="Save">
                            <FiCheck size={18} />
                          </button>
                          <button onClick={cancelEdit} className="text-luxury-gray hover:text-luxury-white transition-colors" title="Cancel">
                            <FiX size={18} />
                          </button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => startEdit(cat)} className="text-luxury-gray hover:text-luxury-gold transition-colors" title="Edit">
                            <FiEdit2 size={18} />
                          </button>
                          {cat.isActive && (
                            <button onClick={() => handleDelete(cat._id)} className="text-luxury-gray hover:text-red-500 transition-colors" title="Deactivate">
                              <FiTrash2 size={18} />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
