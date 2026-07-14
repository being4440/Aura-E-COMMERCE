import React, { useEffect, useState, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { fetchCart, clearCart, removeFromCart, updateQuantity } from '../store/cartSlice';
import CartItem from '../components/CartItem';
import { FiShoppingCart, FiLock, FiUser } from 'react-icons/fi';
import api, { checkProductStockAPI } from '../api/api';
import toast from 'react-hot-toast';

const CartPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { items, totalItems, totalPrice, isLoading } = useSelector((state) => state.cart);
  const isValidatingRef = useRef(false);

  // Read current user — check localStorage as source of truth
  const currentUser = (() => {
    try { return JSON.parse(localStorage.getItem('user')); } catch { return null; }
  })();
  const isLoggedIn = !!currentUser && !!localStorage.getItem('token');

  useEffect(() => {
    if (isLoggedIn) {
      // Only fetch from DB when a user is actually logged in
      dispatch(fetchCart());
    }
  }, [dispatch, isLoggedIn]);

  const [isValidated, setIsValidated] = useState(false);

  useEffect(() => {
    const validateCart = async () => {
      isValidatingRef.current = true;
      
      const checks = items.map(async (item) => {
        try {
          // Fallback to title instead of name based on Product schema
          const productId = item.product?._id || item.product?.productId || (typeof item.product === 'string' ? item.product : null);
          if (!productId) return null;
          
          const res = await checkProductStockAPI(productId);
          const { stock } = res.data.data;

          if (stock === 0) {
            return { action: 'remove', item, stock };
          } else if (item.quantity > stock) {
            return { action: 'update', item, stock };
          }
        } catch (error) {
          console.error("Error validating cart item stock", error);
        }
        return null;
      });

      // Fire all API checks concurrently
      const results = await Promise.all(checks);
      const invalidItems = results.filter(Boolean);

      if (invalidItems.length > 0) {
        // Fire all correction dispatches concurrently
        await Promise.all(invalidItems.map(({ action, item, stock }) => {
          if (action === 'remove') {
            toast.error(`${item.product?.title || 'Item'} is out of stock and was removed`);
            return dispatch(removeFromCart(item._id || item.id));
          } else if (action === 'update') {
            toast.error(`${item.product?.title || 'Item'} quantity reduced to ${stock}`);
            return dispatch(updateQuantity({ itemId: item._id || item.id, quantity: stock }));
          }
        }));
      }

      setIsValidated(true);
      isValidatingRef.current = false;
    };

    if (items.length > 0 && !isValidated && !isLoading && !isValidatingRef.current) {
      validateCart();
    }
  }, [items, isValidated, isLoading, dispatch]);



  const shipping = totalPrice > 499 || totalPrice === 0 ? 0 : 49;
  const finalTotal = totalPrice + shipping;

  if (!isLoggedIn) {
    return (
      <div className="container mx-auto p-4 md:p-8 pt-24 min-h-screen flex flex-col items-center justify-center text-center">
        <div className="bg-gray-900 rounded-2xl p-12 border border-gray-800 shadow-2xl max-w-md w-full">
          <div className="flex items-center justify-center w-20 h-20 rounded-full bg-gray-800 mx-auto mb-6">
            <FiUser size={36} className="text-blue-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-3">Sign in to view your cart</h2>
          <p className="text-gray-400 mb-8">Your cart is saved to your account. Log in to see your items and continue shopping.</p>
          <Link
            to="/login"
            state={{ from: '/cart', message: 'Please login to view your cart.' }}
            className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-medium transition-colors w-full"
          >
            Login to your account
          </Link>
          <Link to="/" className="block mt-4 text-gray-400 hover:text-white text-sm transition-colors">
            Continue browsing ›
          </Link>
        </div>
      </div>
    );
  }

  if (isLoading && items.length === 0) {
    return (
      <div className="container mx-auto p-4 md:p-8 pt-24 min-h-screen">
        <div className="animate-pulse flex flex-col gap-8 md:flex-row">
          <div className="flex-1 space-y-6">
            <div className="h-8 bg-gray-700 rounded w-1/3"></div>
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-4">
                <div className="w-24 h-24 bg-gray-700 rounded"></div>
                <div className="flex-1 space-y-4 py-1">
                  <div className="h-4 bg-gray-700 rounded w-3/4"></div>
                  <div className="h-4 bg-gray-700 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
          <div className="w-full md:w-80 h-64 bg-gray-700 rounded-lg"></div>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="container mx-auto p-4 md:p-8 pt-24 min-h-screen flex flex-col items-center justify-center text-center">
        <FiShoppingCart size={64} className="text-gray-500 mb-4" />
        <h2 className="text-2xl font-bold text-white mb-2">Your cart is empty</h2>
        <p className="text-gray-400 mb-8">Looks like you haven't added anything yet.</p>
        <Link
          to="/"
          className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-medium transition-colors"
        >
          Continue Shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-8 pt-24 min-h-screen">
      <div className="flex flex-col md:flex-row gap-8">
        {/* LEFT COLUMN */}
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-white mb-6">
            Your Cart ({totalItems} item{totalItems !== 1 && 's'})
          </h1>
          <div className="bg-gray-900 rounded-xl p-4 md:p-6 shadow-xl border border-gray-800">
            {items.map((item) => (
              <CartItem key={item._id} item={item} />
            ))}
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div className="w-full md:w-80 lg:w-96">
          <div className="bg-gray-900 rounded-xl p-6 shadow-xl border border-gray-800 sticky top-24">
            <h2 className="text-xl font-bold text-white mb-6 border-b border-gray-700 pb-4">
              Order Summary
            </h2>
            
            <div className="space-y-4 mb-6 text-gray-300">
              <div className="flex justify-between">
                <span>Items ({totalItems})</span>
                <span>₹{totalPrice.toLocaleString('en-IN')}</span>
              </div>
              
              <div className="flex justify-between">
                <span>Shipping</span>
                <span>{shipping === 0 ? <span className="text-green-500">FREE</span> : `₹${shipping}`}</span>
              </div>
            </div>
            
            <div className="border-t border-gray-700 pt-4 mb-6">
              <div className="flex justify-between items-center">
                <span className="text-lg font-bold text-white">Total</span>
                <span className="text-2xl font-bold text-white">
                  ₹{finalTotal.toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <Link 
                to="/checkout"
                className="block text-center w-full bg-luxury-gold hover:opacity-90 text-luxury-dark py-4 rounded-lg font-poppins uppercase tracking-widest text-xs transition-all duration-300"
              >
                Proceed to Checkout
              </Link>
            </div>

            <div className="mt-6 flex items-center justify-center gap-2 text-sm text-gray-400">
              <FiLock />
              <span>Secure Checkout</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CartPage;
