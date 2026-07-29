import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiCheckCircle, FiBox, FiCalendar, FiArrowRight } from 'react-icons/fi';
import api from '../api/api';
import { formatOrderId } from '../utils/formatOrderId';

const OrderConfirmation = () => {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  const MAX_RETRIES = 5;

  useEffect(() => {
    let timeoutId;
    const fetchOrder = async () => {
      try {
        const { data } = await api.get(`/orders/${id}`);
        setOrder(data.data);
        setLoading(false);
      } catch (err) {
        // If it's a Stripe session ID and order not found, poll a few times
        if (err.response?.status === 404 && id?.startsWith('cs_') && retryCount < MAX_RETRIES) {
          timeoutId = setTimeout(() => {
            setRetryCount(prev => prev + 1);
          }, 2000);
        } else {
          console.error('Failed to fetch order', err);
          setLoading(false);
        }
      }
    };
    fetchOrder();
    
    return () => clearTimeout(timeoutId);
  }, [id, retryCount]);

  if (loading) {
    return (
      <div className="min-h-screen bg-luxury-dark pt-32 pb-20 px-6 flex items-center justify-center">
        <div className="text-luxury-gold animate-pulse font-poppins uppercase tracking-widest text-sm">
          Loading order details...
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-luxury-dark pt-32 pb-20 px-6 flex flex-col items-center justify-center">
        <h2 className="text-2xl font-playfair text-luxury-white mb-4">Order Not Found</h2>
        <Link to="/" className="text-luxury-gold hover:text-white transition-colors border-b border-luxury-gold pb-1 font-poppins uppercase tracking-widest text-xs">
          Return to Home
        </Link>
      </div>
    );
  }

  // Calculate expected delivery date (7 days from order date)
  const orderDate = new Date(order.createdAt);
  const expectedDelivery = new Date(orderDate);
  expectedDelivery.setDate(expectedDelivery.getDate() + 7);

  const formatDate = (date) => {
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  return (
    <div className="min-h-screen bg-luxury-dark pt-32 pb-20 px-6 lg:px-12 flex justify-center">
      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-2xl bg-[#111] border border-luxury-gray/10 p-8 md:p-12 text-center"
      >
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center text-green-500">
            <FiCheckCircle size={40} />
          </div>
        </div>

        <h1 className="text-3xl md:text-4xl font-playfair text-luxury-white mb-2">Order Placed Successfully</h1>
        <p className="text-luxury-gray font-inter mb-10">Thank you for shopping with us. Your order is confirmed.</p>

        <div className="bg-luxury-dark/50 border border-luxury-gray/20 rounded-lg p-6 mb-8 text-left space-y-6">
          <div className="flex items-start gap-4">
            <FiBox className="text-luxury-gold mt-1" size={24} />
            <div>
              <p className="text-xs font-poppins uppercase tracking-widest text-luxury-gray mb-1">Order ID</p>
              <p className="text-lg font-inter text-luxury-white font-mono">{formatOrderId(order._id)}</p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-6 h-6 rounded-full bg-luxury-gold/20 flex items-center justify-center text-luxury-gold mt-1">
              <span className="w-2 h-2 rounded-full bg-luxury-gold"></span>
            </div>
            <div>
              <p className="text-xs font-poppins uppercase tracking-widest text-luxury-gray mb-1">Status</p>
              <p className="text-lg font-inter text-luxury-white capitalize">{order.status || 'Processing'}</p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <FiCalendar className="text-luxury-gold mt-1" size={24} />
            <div>
              <p className="text-xs font-poppins uppercase tracking-widest text-luxury-gray mb-1">Expected Delivery</p>
              <p className="text-lg font-inter text-luxury-white">{formatDate(expectedDelivery)}</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link 
            to="/orders"
            className="flex items-center justify-center gap-2 bg-luxury-gold hover:opacity-90 text-luxury-dark py-4 px-8 font-poppins uppercase tracking-widest text-xs transition-all duration-300"
          >
            View All Orders <FiArrowRight />
          </Link>
          <a 
            href={`${import.meta.env.VITE_API_URL}/api/orders/${order._id}/invoice?token=${localStorage.getItem('token')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center py-4 px-8 border border-luxury-gray/30 text-luxury-white hover:border-luxury-gold hover:text-luxury-gold font-poppins uppercase tracking-widest text-xs transition-all duration-300"
          >
            Download Invoice
          </a>
          <Link 
            to="/"
            className="flex items-center justify-center py-4 px-8 border border-luxury-gray/30 text-luxury-white hover:border-luxury-gold hover:text-luxury-gold font-poppins uppercase tracking-widest text-xs transition-all duration-300"
          >
            Continue Shopping
          </Link>
        </div>
      </motion.div>
    </div>
  );
};

export default OrderConfirmation;
