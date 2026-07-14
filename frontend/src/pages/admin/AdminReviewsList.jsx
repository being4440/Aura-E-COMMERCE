import React, { useState, useEffect } from 'react';
import { adminGetReviewsAPI, adminUpdateReviewHideAPI, adminDeleteReviewAPI } from '../../api/api';
import { toast } from 'react-hot-toast';
import { FiEyeOff, FiEye, FiTrash2, FiStar, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import dayjs from 'dayjs';

export default function AdminReviewsList() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  
  const [ratingFilter, setRatingFilter] = useState('');
  const [hiddenFilter, setHiddenFilter] = useState('');

  const fetchReviews = async (page = 1) => {
    try {
      setLoading(true);
      
      const params = new URLSearchParams({
        page,
        limit: 10
      });

      if (ratingFilter) params.append('rating', ratingFilter);
      if (hiddenFilter !== '') params.append('isHidden', hiddenFilter);

      const res = await adminGetReviewsAPI(params);
      
      if (res.data.success) {
        setReviews(res.data.data);
        setPagination(res.data.pagination);
      }
    } catch (err) {
      toast.error('Failed to load reviews');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews(1);
  }, [ratingFilter, hiddenFilter]);

  const handleToggleHide = async (id, currentIsHidden) => {
    const action = currentIsHidden ? 'unhide' : 'hide';
    if (!window.confirm(`Are you sure you want to ${action} this review?`)) return;
    
    try {
      let reason = '';
      if (!currentIsHidden) {
        reason = window.prompt('Enter a reason for hiding this review (optional):');
        if (reason === null) return;
      }

      const res = await adminUpdateReviewHideAPI(id, { isHidden: !currentIsHidden, flaggedReason: reason });
      
      if (res.data.success) {
        toast.success(res.data.message);
        fetchReviews(pagination.page);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || `Failed to ${action} review`);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('WARNING: Hard deleting a review should only be done for SPAM or inappropriate content. Are you sure you want to permanently delete this review?')) return;
    
    try {
      const res = await adminDeleteReviewAPI(id);
      
      if (res.data.success) {
        toast.success(res.data.message);
        fetchReviews(pagination.page);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete review');
    }
  };

  const renderStars = (rating) => {
    return (
      <div className="flex gap-0.5 text-luxury-gold">
        {[1, 2, 3, 4, 5].map((star) => (
          <FiStar key={star} size={12} className={star <= rating ? 'fill-current' : 'text-luxury-gray'} />
        ))}
      </div>
    );
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-playfair text-luxury-white">Reviews Management</h1>
      </div>

      <div className="bg-luxury-secondary/30 border border-luxury-gray/10 p-4 mb-6 flex gap-4 items-end">
        <div className="flex flex-col gap-2">
          <label className="text-xs uppercase tracking-wider text-luxury-gray">Filter by Rating</label>
          <select 
            value={ratingFilter} 
            onChange={(e) => setRatingFilter(e.target.value)} 
            className="bg-luxury-dark border border-luxury-gray/20 text-luxury-white px-3 py-2 focus:outline-none focus:border-luxury-gold font-inter text-sm min-w-[150px]"
          >
            <option value="">All Ratings</option>
            <option value="5">5 Stars</option>
            <option value="4">4 Stars</option>
            <option value="3">3 Stars</option>
            <option value="2">2 Stars</option>
            <option value="1">1 Star</option>
          </select>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-xs uppercase tracking-wider text-luxury-gray">Filter by Status</label>
          <select 
            value={hiddenFilter} 
            onChange={(e) => setHiddenFilter(e.target.value)} 
            className="bg-luxury-dark border border-luxury-gray/20 text-luxury-white px-3 py-2 focus:outline-none focus:border-luxury-gold font-inter text-sm min-w-[150px]"
          >
            <option value="">All Statuses</option>
            <option value="false">Visible</option>
            <option value="true">Hidden</option>
          </select>
        </div>
      </div>

      <div className="bg-luxury-secondary/30 border border-luxury-gray/10 overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-luxury-secondary/50 text-luxury-gray font-poppins text-xs uppercase tracking-widest border-b border-luxury-gray/10">
              <th className="p-4 w-1/4">Product & Rating</th>
              <th className="p-4 w-1/4">User Info</th>
              <th className="p-4 w-1/3">Comment</th>
              <th className="p-4 text-center">Status</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="text-sm font-inter text-luxury-white">
            {loading ? (
              <tr><td colSpan="5" className="p-8 text-center text-luxury-gray">Loading reviews...</td></tr>
            ) : reviews.length === 0 ? (
              <tr><td colSpan="5" className="p-8 text-center text-luxury-gray">No reviews found.</td></tr>
            ) : (
              reviews.map(review => (
                <tr key={review._id} className={`border-b border-luxury-gray/10 hover:bg-luxury-secondary/30 transition-colors ${review.isHidden ? 'opacity-60' : ''}`}>
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <img src={review.product?.images?.[0] || 'https://via.placeholder.com/40'} alt="product" className="w-10 h-10 object-cover" />
                      <div>
                        <div className="font-medium text-luxury-white truncate max-w-[200px]" title={review.product?.title}>{review.product?.title}</div>
                        <div className="mt-1">{renderStars(review.rating)}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-luxury-gray">
                    <div className="font-medium text-luxury-white">{review.user?.username || 'Unknown User'}</div>
                    <div className="text-xs">{review.user?.email || 'N/A'}</div>
                    <div className="text-xs mt-1">{dayjs(review.createdAt).format('DD MMM YYYY, HH:mm')}</div>
                  </td>
                  <td className="p-4 text-luxury-gray">
                    <p className="line-clamp-3 text-sm leading-relaxed" title={review.comment}>{review.comment}</p>
                    {review.isHidden && review.flaggedReason && (
                      <p className="text-[10px] text-red-400 mt-2">Reason: {review.flaggedReason}</p>
                    )}
                  </td>
                  <td className="p-4 text-center">
                    <span className={`px-2 py-1 text-[10px] uppercase tracking-wider ${review.isHidden ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 'bg-green-500/10 text-green-500 border border-green-500/20'}`}>
                      {review.isHidden ? 'Hidden' : 'Visible'}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center justify-end gap-4">
                      <button 
                        onClick={() => handleToggleHide(review._id, review.isHidden)} 
                        className={`transition-colors ${review.isHidden ? 'text-green-500 hover:text-green-400' : 'text-yellow-500 hover:text-yellow-400'}`}
                        title={review.isHidden ? 'Unhide Review' : 'Hide Review'}
                      >
                        {review.isHidden ? <FiEye size={18} /> : <FiEyeOff size={18} />}
                      </button>
                      <button 
                        onClick={() => handleDelete(review._id)} 
                        className="text-red-500 hover:text-red-400 transition-colors"
                        title="Permanently Delete Spam"
                      >
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
            onClick={() => fetchReviews(pagination.page - 1)}
            className="p-2 border border-luxury-gray/20 text-luxury-white disabled:opacity-30 hover:border-luxury-gold transition-colors"
          >
            <FiChevronLeft />
          </button>
          <span className="text-luxury-white font-inter text-sm">
            Page {pagination.page} of {pagination.pages}
          </span>
          <button 
            disabled={pagination.page === pagination.pages}
            onClick={() => fetchReviews(pagination.page + 1)}
            className="p-2 border border-luxury-gray/20 text-luxury-white disabled:opacity-30 hover:border-luxury-gold transition-colors"
          >
            <FiChevronRight />
          </button>
        </div>
      )}
    </div>
  );
}
