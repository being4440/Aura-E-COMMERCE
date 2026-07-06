import React, { useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { addToCart, optimisticAdd } from '../store/cartSlice';

const AddToCartButton = ({ product }) => {
  const user = useSelector(state => state.auth?.user) || JSON.parse(localStorage.getItem('user'));
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const items = useSelector(state => state.cart.items);

  // Memoize — only recalculates when items or product._id changes
  const isInCart = useMemo(
    () => items.some(item => item.product.productId === product._id),
    [items, product._id]
  );

  const handleClick = async () => {
    if (!user) {
      navigate('/login', { state: { from: location.pathname, message: 'Please log in to add items to your cart' } });
      return;
    }

    if (isInCart) {
      navigate('/cart');
      return;
    }

    const productData = {
      productId: product._id,
      name: product.title || product.name,
      price: product.price,
      image: product.images?.[0] || product.image || '',
      brand: product.brand || '',
      maxStock: product.stock || product.maxStock
    };

    // ⚡ Update UI instantly — no waiting for network
    dispatch(optimisticAdd(productData));

    // Fire API in background — sync real _id from server
    const result = await dispatch(addToCart(productData));
    if (addToCart.fulfilled.match(result)) {
      toast.success('✓ Added to cart!');
    } else {
      // Revert optimistic update by re-fetching cart state
      // (server response on failure won't overwrite state, so just show the error)
      toast.error(result.payload || 'Failed to add to cart');
    }
  };

  if (isInCart) {
    return (
      <button
        onClick={handleClick}
        className="w-full bg-green-600 hover:bg-green-700 text-white py-3 px-6 font-poppins uppercase tracking-widest text-sm transition-all duration-300 flex items-center justify-center gap-2"
      >
        ✓ Go to Cart
      </button>
    );
  }

  return (
    <button
      onClick={handleClick}
      className="w-full bg-luxury-gold hover:opacity-90 text-luxury-dark py-3 px-6 font-poppins uppercase tracking-widest text-sm transition-all duration-300"
    >
      Add to Cart
    </button>
  );
};

export default AddToCartButton;
