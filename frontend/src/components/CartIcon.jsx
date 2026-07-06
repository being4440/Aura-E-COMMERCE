import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Link } from 'react-router-dom';
import { FiShoppingCart } from 'react-icons/fi';
import { fetchCart } from '../store/cartSlice';

const CartIcon = () => {
  const { totalItems } = useSelector(state => state.cart);
  const user = useSelector(state => state.auth?.user);
  let loggedInUser = user;
  if (!loggedInUser) {
    try {
      loggedInUser = JSON.parse(localStorage.getItem('user'));
    } catch {
      loggedInUser = null;
    }
  }
  const isLoggedIn = !!loggedInUser;
  const dispatch = useDispatch();

  useEffect(() => {
    if (isLoggedIn) {
      dispatch(fetchCart());
    }
  }, [isLoggedIn, dispatch]);

  return (
    <Link to="/cart" className="relative hover:text-luxury-gold transition-colors">
      <FiShoppingCart className="w-5 h-5" />
      {loggedInUser && totalItems > 0 && (
        <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full">
          {totalItems}
        </span>
      )}
    </Link>
  );
};

export default CartIcon;
