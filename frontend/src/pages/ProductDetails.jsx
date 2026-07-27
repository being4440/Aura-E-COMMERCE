import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiShoppingBag, FiHeart, FiStar, FiArrowLeft, FiMinus, FiPlus, FiTrash2 } from 'react-icons/fi';
import {
  getProductByIdAPI, checkProductStockAPI,
  getWishlistAPI, addToWishlistAPI, removeFromWishlistAPI,
  getProductReviewsAPI, addReviewAPI, updateReviewAPI, deleteReviewAPI
} from '../api/api';
import { useDispatch, useSelector } from 'react-redux';
import { addToCart, optimisticAdd } from '../store/cartSlice';
import toast from 'react-hot-toast';

export default function ProductDetails() {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [related, setRelated] = useState([]);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [error, setError] = useState('');
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const user = useSelector(state => state.auth?.user) || JSON.parse(localStorage.getItem('user'));
  const cartItems = useSelector(state => state.cart.items);
  const [selectedImage, setSelectedImage] = useState('');

  const [inWishlist, setInWishlist] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [userReview, setUserReview] = useState(null);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');

  useEffect(() => {
    const fetchProductAndData = async () => {
      try {
        const res = await getProductByIdAPI(id);
        setProduct(res.data.data.product);
        const productData = res.data.data.product;

        setProduct(productData);
        setSelectedImage(productData.images?.[0] || '');
        setRelated(res.data.data.relatedProducts);

        const reviewsRes = await getProductReviewsAPI(id);
        setReviews(reviewsRes.data.reviews || []);

        if (user) {
          const uReview = reviewsRes.data.reviews?.find(r => (r.user?._id || r.user) === (user._id || user.id));
          if (uReview) {
            setUserReview(uReview);
            setRating(uReview.rating);
            setComment(uReview.comment);
          }

          const wishRes = await getWishlistAPI();
          const wishlisted = wishRes.data?.products?.some(p => (p._id || p) === id);
          setInWishlist(wishlisted);
        }
      } catch (err) {
        setError('Product not found or error loading details.');
      } finally {
        setLoading(false);
      }
    };
    fetchProductAndData();
  }, [id, user]);

  const handleAddToCart = async () => {
    if (!user) {
      navigate('/login', { state: { from: location.pathname, message: 'Please log in to add items to your cart' } });
      return;
    }

    // fetch fresh stock before adding
    try {
      const stockRes = await checkProductStockAPI(product._id);
      const { availableStock } = stockRes.data.data;

      if (availableStock === 0) {
        toast.error('Sorry, this item is now out of stock');
        setProduct(prev => ({ ...prev, stock: 0 }));
        return;
      }

      if (quantity > availableStock) {
        toast.error(`Only ${availableStock} available`);
        return;
      }

      const payload = {
        ...product,
        productId: product._id || product.id || product.productId,
        quantity
      };

      dispatch(optimisticAdd(payload));
      const result = await dispatch(addToCart(payload));
      if (addToCart.fulfilled.match(result)) {
        toast.success('Added to cart!');
      } else {
        toast.error(result.payload || 'Failed to add to cart');
      }
    } catch (error) {
      toast.error('Error checking stock');
    }
  };

  const handleWishlistToggle = async () => {
    if (!user) {
      navigate('/login', { state: { from: location.pathname, message: 'Please log in to use Wishlist' } });
      return;
    }
    try {
      if (inWishlist) {
        await removeFromWishlistAPI(id);
        setInWishlist(false);
        toast.success('Removed from wishlist');
      } else {
        await addToWishlistAPI(id);
        setInWishlist(true);
        toast.success('Added to wishlist');
      }
    } catch (err) {
      toast.error('Failed to update wishlist');
    }
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!rating) return toast.error('Please select a rating');
    try {
      if (userReview) {
        await updateReviewAPI(id, userReview._id, { rating, comment });
        toast.success('Review updated');
      } else {
        await addReviewAPI(id, { rating, comment });
        toast.success('Review added');
      }

      const reviewsRes = await getProductReviewsAPI(id);
      setReviews(reviewsRes.data.reviews || []);
      const uReview = reviewsRes.data.reviews?.find(r => (r.user?._id || r.user) === (user._id || user.id));
      if (uReview) setUserReview(uReview);

      const prodRes = await getProductByIdAPI(id);
      setProduct(prodRes.data.data.product);

      // Clear the form fields after successful submission
      setRating(0);
      setComment('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error submitting review');
    }
  };

  const handleReviewDelete = async (reviewId) => {
    try {
      await deleteReviewAPI(id, reviewId);
      toast.success('Review deleted');

      if (userReview && userReview._id === reviewId) {
        setRating(0);
        setComment('');
        setUserReview(null);
      }

      const reviewsRes = await getProductReviewsAPI(id);
      setReviews(reviewsRes.data.reviews || []);
      const prodRes = await getProductByIdAPI(id);
      setProduct(prodRes.data.data.product);
    } catch (err) {
      toast.error('Error deleting review');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-luxury-dark flex items-center justify-center">
        <div className="text-luxury-gold font-poppins uppercase tracking-widest animate-pulse">Loading Details...</div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-luxury-dark flex flex-col items-center justify-center">
        <h2 className="text-2xl font-playfair text-luxury-white mb-4">{error}</h2>
        <Link to="/collections" className="text-luxury-gold hover:text-luxury-white font-poppins uppercase tracking-widest border-b border-luxury-gold pb-1 transition-colors">
          Return to Collections
        </Link>
      </div>
    );
  }

  const image = selectedImage || 'https://images.unsplash.com/photo-1523170335258-f5ed11844a49?q=80&w=800&auto=format&fit=crop';
  const renderStars = (rating) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <FiStar
          key={i}
          className={i <= Math.round(rating) ? "text-luxury-gold fill-current" : "text-luxury-gray"}
          size={16}
        />
      );
    }
    return stars;
  };

  return (
    <div className="min-h-screen bg-luxury-dark pt-32 pb-20 px-6 lg:px-12">
      <div className="max-w-7xl mx-auto">
        <Link to="/collections" className="inline-flex items-center text-luxury-gray hover:text-luxury-white font-poppins uppercase tracking-widest text-xs mb-10 transition-colors">
          <FiArrowLeft className="mr-2" /> Back to Collections
        </Link>

        <div className="flex flex-col lg:flex-row gap-16">
          {/* Left Side - Image Gallery */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="w-full lg:w-1/2"
          >
            <div className="aspect-square bg-[#111] overflow-hidden border border-luxury-gray/10 relative">
              <img
                src={image}
                alt={product.title}
                className="w-full h-full object-cover"
              />
              {user?.role !== 'admin' && (
                <button
                  onClick={handleWishlistToggle}
                  className="absolute top-6 right-6 p-3 bg-luxury-dark/50 backdrop-blur-md rounded-full text-luxury-white hover:text-luxury-gold transition-colors border border-luxury-gray/20"
                >
                  <FiHeart size={24} className={inWishlist ? "fill-luxury-gold text-luxury-gold" : ""} />
                </button>
              )}
            </div>
            {product.images?.length > 1 && (
              <div className="flex gap-4 mt-4">
                {product.images.map((img, idx) => (
                  <div
                    key={idx}
                    onClick={() => setSelectedImage(img)}
                    className={`w-24 h-24 cursor-pointer overflow-hidden border transition-all
      ${selectedImage === img
                        ? "border-luxury-gold"
                        : "border-luxury-gray/10 hover:border-luxury-gold"
                      }`}
                  >
                    <img
                      src={img}
                      alt={`${product.title} view ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            )}
          </motion.div>

          {/* Right Side - Product Details */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="w-full lg:w-1/2 flex flex-col justify-center"
          >
            <div className="text-luxury-gold font-poppins uppercase tracking-widest text-xs mb-4">
              {product.category}
            </div>

            <h1 className="text-4xl md:text-5xl font-playfair text-luxury-white leading-tight mb-6">
              {product.title}
            </h1>

            <div className="flex items-center gap-4 mb-8">
              <div className="flex items-center gap-4">
                <span className="text-3xl font-inter text-luxury-white tracking-wide">
                  ₹{product.price?.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center gap-1 border-l border-luxury-gray/30 pl-4">
                {renderStars(product.rating || 0)}
                <span className="text-luxury-gray text-sm ml-2 font-inter">({product.rating || 0})</span>
                {product.numReviews > 0 && (
                  <span className="text-luxury-gray text-sm ml-2 font-inter hidden sm:inline">
                    Based on {product.numReviews} reviews
                  </span>
                )}
              </div>
            </div>

            <p className="text-luxury-gray font-inter leading-relaxed text-lg mb-6">
              {product.description}
            </p>

            {(product.sizes?.length > 0 || product.colors?.length > 0) && (
              <div className="flex gap-8 mb-10 border-t border-b border-luxury-gray/10 py-4">
                {product.sizes?.length > 0 && (
                  <div>
                    <span className="font-poppins uppercase tracking-widest text-xs text-luxury-gray block mb-1">Sizes</span>
                    <span className="text-luxury-white font-inter text-sm">{product.sizes.join(', ')}</span>
                  </div>
                )}
                {product.colors?.length > 0 && (
                  <div>
                    <span className="font-poppins uppercase tracking-widest text-xs text-luxury-gray block mb-1">Colors</span>
                    <span className="text-luxury-white font-inter text-sm">{product.colors.join(', ')}</span>
                  </div>
                )}
              </div>
            )}

            {user?.role !== 'admin' && (
              <div className="mb-10">
                <div className="flex items-center justify-between mb-4">
                  <span className="font-poppins uppercase tracking-widest text-xs text-luxury-white">Quantity</span>
                  <span className="font-inter text-sm">
                    {product.stock === 0 && (
                      <span className="text-red-500">Out of Stock</span>
                    )}
                    {product.stock > 0 && product.stock <= 5 && (
                      <span className="text-orange-500">Only {product.stock} left in stock — order soon!</span>
                    )}
                    {product.stock > 5 && product.stock <= 10 && (
                      <span className="text-orange-500">Only {product.stock} items left</span>
                    )}
                    {product.stock > 10 && (
                      <span className="text-green-500">In Stock</span>
                    )}
                  </span>
                </div>

                <div className="flex items-center gap-6">
                  {/* Quantity Selector */}
                  <div className="flex items-center border border-luxury-gray/30 w-fit">
                    <button
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="p-4 text-luxury-gray hover:text-luxury-white transition-colors"
                      disabled={product.stock === 0}
                    >
                      <FiMinus />
                    </button>
                    <span className="w-12 text-center font-inter text-luxury-white">{quantity}</span>
                    <button
                      onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                      className="p-4 text-luxury-gray hover:text-luxury-white transition-colors"
                      disabled={product.stock === 0}
                    >
                      <FiPlus />
                    </button>
                  </div>

                  {/* Add to Cart Button */}
                  <div className="flex-grow">
                    <button
                      onClick={handleAddToCart}
                      disabled={product.stock === 0}
                      className={`w-full py-4 px-6 font-poppins uppercase tracking-widest text-sm transition-all duration-300 ${product.stock === 0
                          ? 'bg-luxury-gray/20 text-luxury-gray cursor-not-allowed'
                          : 'bg-luxury-gold hover:opacity-90 text-luxury-dark'
                        }`}
                    >
                      {product.stock === 0 ? 'Out of Stock' : 'Add to Cart'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Accordion Info */}
            <div className="border-t border-luxury-gray/20 pt-8 mt-4 space-y-6">
              <div>
                <h4 className="font-playfair text-xl text-luxury-white mb-2">Shipping & Returns</h4>
                <p className="text-luxury-gray font-inter text-sm">Complimentary secure shipping on all orders. Free returns within 30 days of delivery.</p>
              </div>
              <div>
                <h4 className="font-playfair text-xl text-luxury-white mb-2">Authenticity Guaranteed</h4>
                <p className="text-luxury-gray font-inter text-sm">Every piece comes with a certificate of authenticity.</p>
              </div>
            </div>

            {/* Reviews Section */}
            <div className="border-t border-luxury-gray/20 pt-8 mt-8">
              <h3 className="text-2xl font-playfair text-luxury-white mb-6">
                Customer Reviews <span className="text-luxury-gray text-lg ml-2">({reviews.length})</span>
              </h3>

              {user ? (
                <form id="review-form" onSubmit={handleReviewSubmit} className="mb-10 bg-[#111] p-6 border border-luxury-gray/20">
                  <h4 className="text-luxury-white font-playfair mb-4">{userReview ? 'Update Your Review' : 'Write a Review'}</h4>
                  <div className="flex gap-2 mb-4">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <FiStar
                        key={star}
                        size={24}
                        className={`cursor-pointer transition-colors ${star <= (hoverRating || rating) ? 'text-luxury-gold fill-luxury-gold' : 'text-luxury-gray'
                          }`}
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(0)}
                        onClick={() => setRating(star)}
                      />
                    ))}
                  </div>
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Share your thoughts about this product..."
                    className="w-full bg-luxury-dark border border-luxury-gray/20 text-luxury-white p-3 font-inter text-sm focus:border-luxury-gold focus:outline-none mb-4"
                    rows="4"
                    required
                    maxLength="500"
                  ></textarea>
                  <div className="flex gap-4">
                    <button type="submit" className="bg-luxury-gold text-luxury-dark px-6 py-2 font-poppins uppercase tracking-widest text-xs hover:opacity-90 transition-opacity">
                      {userReview ? 'Update' : 'Submit'}
                    </button>
                    {userReview && (
                      <button type="button" onClick={() => handleReviewDelete(userReview._id)} className="bg-red-500/80 text-white px-6 py-2 font-poppins uppercase tracking-widest text-xs hover:bg-red-600 transition-colors flex items-center gap-2">
                        <FiTrash2 size={14} /> Delete
                      </button>
                    )}
                  </div>
                </form>
              ) : (
                <div className="mb-10 p-4 border border-luxury-gray/20 text-luxury-gray font-inter text-sm bg-[#111]">
                  Please <Link to="/login" className="text-luxury-gold hover:underline">login</Link> to write a review.
                </div>
              )}

              <div className="space-y-6">
                {reviews.length > 0 ? reviews.map((rev) => {
                  const isOwner = user && (rev.user?._id || rev.user) === (user._id || user.id);
                  const isAdmin = user && user.role === 'admin';
                  const canDelete = isOwner || isAdmin;
                  return (
                    <div key={rev._id} className="border-b border-luxury-gray/10 pb-6">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="flex text-luxury-gold">{renderStars(rev.rating)}</div>
                        <span className="text-luxury-white font-inter text-sm ml-2">{rev.user?.name || rev.user?.username || 'User'}</span>
                        <span className="text-luxury-gray font-inter text-xs ml-auto">{new Date(rev.createdAt).toLocaleDateString()}</span>
                      </div>
                      <p className="text-luxury-gray font-inter text-sm mb-3">{rev.comment}</p>
                      {canDelete && (
                        <div className="flex gap-4">
                          {isOwner && (
                            <button
                              onClick={() => {
                                const form = document.getElementById('review-form');
                                if (form) window.scrollTo({ top: form.offsetTop - 100, behavior: 'smooth' });
                              }}
                              className="text-luxury-gold font-inter text-xs uppercase tracking-widest hover:text-white transition-colors"
                            >
                              Edit
                            </button>
                          )}
                          <button
                            onClick={() => handleReviewDelete(rev._id)}
                            className="text-red-500 font-inter text-xs uppercase tracking-widest hover:text-red-400 transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  )
                }) : (
                  <p className="text-luxury-gray font-inter text-sm mb-6">No reviews yet. Be the first to review this product!</p>
                )}
              </div>
            </div>

          </motion.div>
        </div>
      </div>
    </div>
  );
}
