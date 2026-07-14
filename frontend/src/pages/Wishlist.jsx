import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { FiHeart, FiTrash2, FiShoppingCart } from 'react-icons/fi';
import api from '../api/api';
import ProductCard from '../components/ProductCard';
import { useDispatch, useSelector } from 'react-redux';
import { addToCart, optimisticAdd } from '../store/cartSlice';
import { toggleWishlistItem } from '../store/wishlistSlice';
import toast from 'react-hot-toast';

export default function Wishlist() {
  const dispatch = useDispatch();
  const { items: wishlistProducts, isLoading: loading } = useSelector((state) => state.wishlist || { items: [], isLoading: false });

  const removeFromWishlist = async (product) => {
    dispatch(toggleWishlistItem(product));
  };

  const moveToCart = async (product) => {
    if (product.stock === 0) {
      toast.error('Product is out of stock');
      return;
    }
    try {
      const payload = {
        ...product,
        productId: product._id || product.id || product.productId,
        quantity: 1
      };
      dispatch(optimisticAdd(payload));
      const result = await dispatch(addToCart(payload));
      if (addToCart.fulfilled.match(result)) {
        toast.success('Moved to cart!');
        removeFromWishlist(product);
      } else {
        toast.error(result.payload || 'Failed to move to cart');
      }
    } catch (err) {
      toast.error('Error moving to cart');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-luxury-dark pt-32 pb-20 px-6 lg:px-12 flex justify-center items-center">
        <div className="text-luxury-gold font-poppins uppercase tracking-widest animate-pulse">
          Loading Wishlist...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-luxury-dark pt-32 pb-20 px-6 lg:px-12">
      <div className="text-center mb-16">
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-4xl lg:text-5xl font-playfair text-luxury-white mb-6 tracking-wide"
        >
          My Wishlist
        </motion.h1>
      </div>

      <div className="max-w-7xl mx-auto">
        {wishlistProducts.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {wishlistProducts.map((product) => (
              <div key={product._id} className="relative group">
                <ProductCard product={product} />
                <div className="absolute top-4 right-4 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                  <button
                    onClick={() => removeFromWishlist(product)}
                    className="p-2 bg-red-500/80 text-white rounded-full hover:bg-red-600"
                    title="Remove from Wishlist"
                  >
                    <FiTrash2 size={16} />
                  </button>
                  <button
                    onClick={() => moveToCart(product)}
                    className="p-2 bg-luxury-gold/80 text-luxury-dark rounded-full hover:bg-luxury-gold"
                    title="Move to Cart"
                  >
                    <FiShoppingCart size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 flex flex-col items-center">
            <FiHeart size={64} className="text-luxury-gray mb-6 opacity-50" />
            <h2 className="text-2xl font-playfair text-luxury-white mb-4">Your Wishlist is Empty</h2>
            <p className="text-luxury-gray font-inter max-w-md mb-8">
              Save your favorite luxury items here to review and purchase them later.
            </p>
            <Link to="/collections" className="btn-primary px-8 py-3 rounded">
              Explore Collections
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
