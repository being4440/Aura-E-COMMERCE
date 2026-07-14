import React from 'react';
import { motion } from 'framer-motion';
import { FiShoppingBag, FiHeart, FiStar } from 'react-icons/fi';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { toggleWishlistItem } from '../store/wishlistSlice';
import toast from 'react-hot-toast';
import AddToCartButton from './AddToCartButton';

export default function ProductCard({ product, index = 0 }) {
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth?.user) || JSON.parse(localStorage.getItem('user'));
  const wishlistItems = useSelector((state) => state.wishlist?.items || []);
  const isWishlisted = wishlistItems.some(p => (p._id || p) === product._id);

  const handleWishlistToggle = (e) => {
    e.preventDefault(); // Prevent link click
    e.stopPropagation();
    const token = localStorage.getItem('token');
    if (!token) {
      toast.error('Please log in to add to wishlist');
      return;
    }
    dispatch(toggleWishlistItem(product));
  };

  // Use a fallback image if none provided
  // Optimize Cloudinary URLs: auto quality + webp format + resize to 600px wide
  const rawImage = product.images?.[0] || '';
  const image = rawImage
    ? (rawImage.includes('f_auto') ? rawImage : rawImage.replace('/upload/', '/upload/f_auto,q_auto,w_600/'))
    : 'https://images.unsplash.com/photo-1523170335258-f5ed11844a49?q=80&w=600&auto=format&fit=crop';
  
  return (
    <motion.div 
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.35, delay: Math.min(index * 0.05, 0.3) }}
      style={{ opacity: product.stock === 0 ? 0.6 : 1 }}
      className="group flex flex-col bg-luxury-secondary/30 border border-luxury-gray/10 hover:border-luxury-gold/50 transition-all duration-500"
    >
      {/* Image Container */}
      <div className="relative aspect-[4/5] overflow-hidden bg-luxury-dark cursor-pointer">
        {/* Category Badge */}
        <div className="absolute top-4 left-4 z-10 bg-luxury-dark/80 backdrop-blur-md px-3 py-1 border border-luxury-gold/30">
          <span className="text-[10px] font-poppins uppercase tracking-widest text-luxury-gold">{product.category}</span>
        </div>
        
        {/* Stock Badges */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex flex-col gap-2">
          {product.stock === 0 && (
            <div className="bg-red-600/90 text-white px-3 py-1 text-xs font-poppins uppercase tracking-widest">
              Out of Stock
            </div>
          )}
          {product.stock > 0 && product.stock <= 5 && (
            <div className="bg-orange-500/90 text-white px-3 py-1 text-xs font-poppins uppercase tracking-widest">
              Only {product.stock} left
            </div>
          )}
        </div>
        
        {/* Wishlist Button */}
        {user?.role !== 'admin' && (
          <button 
            onClick={handleWishlistToggle}
            className={`absolute top-4 right-4 z-10 p-2 transition-colors duration-300 ${isWishlisted ? 'text-luxury-gold opacity-100' : 'text-luxury-white hover:text-luxury-gold opacity-0 group-hover:opacity-100'}`}
          >
            <FiHeart size={20} className={isWishlisted ? 'fill-current text-luxury-gold' : ''} />
          </button>
        )}

        <Link to={`/products/${product._id}`}>
          <img 
            src={image} 
            alt={product.title} 
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110 opacity-90 group-hover:opacity-100"
          />
        </Link>
        
        {/* Add to Cart Overlay */}
        {user?.role !== 'admin' && (
          <div className="absolute bottom-0 left-0 w-full p-4 transform translate-y-full group-hover:translate-y-0 transition-transform duration-500 ease-out">
            {product.stock === 0 ? (
              <button disabled className="w-full bg-luxury-gray/20 text-luxury-gray py-3 px-6 font-poppins uppercase tracking-widest text-sm cursor-not-allowed">
                Out of Stock
              </button>
            ) : (
              <AddToCartButton product={product} />
            )}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-6 flex flex-col flex-grow justify-between items-center text-center">
        <div className="flex flex-col items-center">
          {product.brand && (
            <p className="text-[10px] md:text-xs font-poppins text-luxury-gray uppercase tracking-wider mb-1">
              {product.brand}
            </p>
          )}
          <Link to={`/products/${product._id}`}>
            <h3 className="text-xl font-playfair text-luxury-white mb-2 line-clamp-1 group-hover:text-luxury-gold transition-colors">
              {product.title}
            </h3>
          </Link>
          <p className="text-sm font-inter text-luxury-gray line-clamp-2 mb-3">
            {product.description}
          </p>
          <div className="flex items-center justify-center gap-1 mb-2">
            <FiStar className="text-luxury-gold fill-current" size={14} />
            <span className="text-xs font-inter text-luxury-white">{product.rating || 'New'}</span>
          </div>
          {(product.sizes?.length > 0 || product.colors?.length > 0) && (
            <div className="flex flex-col items-center justify-center gap-1 mb-2 text-[10px] font-poppins text-luxury-gray uppercase tracking-widest">
              {product.sizes?.length > 0 && <span>Sizes: {product.sizes.join(', ')}</span>}
              {product.colors?.length > 0 && <span>Colors: {product.colors.join(', ')}</span>}
            </div>
          )}
        </div>
        
        <div className="flex items-center justify-center w-full mt-auto pt-4 border-t border-luxury-gray/10">
          <div className="flex items-center gap-2">
              <span className="text-lg font-inter text-luxury-white tracking-wide">
                ₹{product.price?.toLocaleString()}
              </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
