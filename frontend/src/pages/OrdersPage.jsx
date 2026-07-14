import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiBox, FiPackage, FiTruck, FiCheck, FiXCircle, FiAlertTriangle } from 'react-icons/fi';
import { Link } from 'react-router-dom';
import api from '../api/api';
import toast from 'react-hot-toast';

// Statuses from which a user can cancel
const CANCELLABLE_STATUSES = ['processing', 'confirmed', 'pending', 'packed'];

const OrdersPage = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  // Track which order ID is currently showing the cancel confirmation
  const [cancellingId, setCancellingId] = useState(null);
  const [cancelLoading, setCancelLoading] = useState(false);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const { data } = await api.get('/orders');
        setOrders(data.data);
      } catch (err) {
        console.error('Failed to fetch orders:', err);
        toast.error('Failed to load orders');
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, []);

  const handleCancelOrder = async (orderId) => {
    setCancelLoading(true);
    try {
      const { data } = await api.patch(`/orders/${orderId}/cancel`);
      // Update the order in local state so UI reflects immediately
      setOrders(prev =>
        prev.map(o => (o._id === orderId ? { ...o, status: 'cancelled', statusTimeline: data.data?.statusTimeline } : o))
      );
      toast.success('Order cancelled successfully');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to cancel order');
    } finally {
      setCancelLoading(false);
      setCancellingId(null);
    }
  };

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'processing': return <FiPackage className="text-luxury-gold" />;
      case 'shipped':    return <FiTruck className="text-blue-400" />;
      case 'delivered':  return <FiCheck className="text-green-400" />;
      case 'cancelled':  return <FiXCircle className="text-red-400" />;
      default:           return <FiBox className="text-luxury-gray" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'processing': return 'text-luxury-gold bg-luxury-gold/10 border-luxury-gold/20';
      case 'confirmed':  return 'text-blue-300 bg-blue-400/10 border-blue-400/20';
      case 'packed':     return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20';
      case 'shipped':    return 'text-blue-400 bg-blue-400/10 border-blue-400/20';
      case 'delivered':  return 'text-green-400 bg-green-400/10 border-green-400/20';
      case 'cancelled':  return 'text-red-400 bg-red-400/10 border-red-400/20';
      default:           return 'text-luxury-gray bg-luxury-gray/10 border-luxury-gray/20';
    }
  };

  const calculateExpectedDelivery = (createdAt) => {
    const orderDate = new Date(createdAt);
    orderDate.setDate(orderDate.getDate() + 7);
    return orderDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-luxury-dark pt-32 pb-20 px-6 flex items-center justify-center">
        <div className="text-luxury-gold animate-pulse font-poppins uppercase tracking-widest text-sm">
          Loading your orders...
        </div>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="min-h-screen bg-luxury-dark pt-32 pb-20 px-6 flex flex-col items-center justify-center">
        <div className="w-24 h-24 rounded-full bg-luxury-secondary/50 flex items-center justify-center mb-6 text-luxury-gray">
          <FiBox size={40} />
        </div>
        <h2 className="text-3xl font-playfair text-luxury-white mb-4">No Orders Yet</h2>
        <p className="text-luxury-gray font-inter mb-8 text-center max-w-md">Looks like you haven't placed any orders yet. Discover our latest collections and find something you love.</p>
        <Link to="/collections" className="bg-luxury-gold hover:opacity-90 text-luxury-dark transition-colors py-3 px-8 font-poppins uppercase tracking-widest text-xs">
          Start Shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-luxury-dark pt-32 pb-20 px-6 lg:px-12">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-4xl font-playfair text-luxury-white mb-10 border-b border-luxury-gray/10 pb-6">Your Orders</h1>

        <div className="space-y-8">
          {orders.map((order, index) => {
            const isCancellable = CANCELLABLE_STATUSES.includes(order.status?.toLowerCase());
            const isConfirmingCancel = cancellingId === order._id;

            return (
              <motion.div
                key={order._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.08 }}
                className="bg-[#111] border border-luxury-gray/10 p-6 md:p-8"
              >
                {/* ── Order Header ── */}
                <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-luxury-gray/10 pb-6 mb-6 gap-4">
                  <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
                    <div>
                      <p className="text-[10px] font-poppins uppercase tracking-widest text-luxury-gray mb-1">Order Placed</p>
                      <p className="text-luxury-white font-inter text-sm">
                        {new Date(order.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-poppins uppercase tracking-widest text-luxury-gray mb-1">Total Amount</p>
                      <p className="text-luxury-white font-inter text-sm tracking-wide">₹{order.totalAmount?.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-poppins uppercase tracking-widest text-luxury-gray mb-1">Order ID</p>
                      <p className="text-luxury-white font-inter text-sm">#{order._id.substring(0, 10)}...</p>
                    </div>
                  </div>

                  {/* Status badge + Cancel button */}
                  <div className="flex flex-col items-end gap-3">
                    <div className={`flex items-center gap-2 px-4 py-2 rounded-full border font-poppins uppercase tracking-widest text-[10px] ${getStatusColor(order.status)}`}>
                      {getStatusIcon(order.status)}
                      {order.status || 'Processing'}
                    </div>

                    {isCancellable && !isConfirmingCancel && (
                      <button
                        onClick={() => setCancellingId(order._id)}
                        className="text-[10px] font-poppins uppercase tracking-widest text-red-400 hover:text-red-300 border border-red-400/30 hover:border-red-400/60 px-3 py-1.5 rounded transition-all duration-200"
                      >
                        Cancel Order
                      </button>
                    )}

                    <a
                      href={`${import.meta.env.VITE_API_URL}/api/orders/${order._id}/invoice?token=${localStorage.getItem('token')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] font-poppins uppercase tracking-widest text-luxury-gold hover:text-luxury-white border border-luxury-gold/30 hover:border-luxury-gold/60 px-3 py-1.5 rounded transition-all duration-200"
                    >
                      Download Invoice
                    </a>
                  </div>
                </div>

                {/* ── Cancel Confirmation Inline Panel ── */}
                <AnimatePresence>
                  {isConfirmingCancel && (
                    <motion.div
                      key="cancel-confirm"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.25 }}
                      className="overflow-hidden"
                    >
                      <div className="flex items-start gap-4 bg-red-900/15 border border-red-500/30 rounded-lg p-5 mb-6">
                        <FiAlertTriangle className="text-red-400 mt-0.5 flex-shrink-0" size={20} />
                        <div className="flex-1">
                          <p className="text-red-300 font-poppins uppercase tracking-widest text-xs font-semibold mb-1">
                            Confirm Cancellation
                          </p>
                          <p className="text-luxury-gray font-inter text-sm mb-4">
                            Are you sure you want to cancel this order? Stock will be restored and this action cannot be undone.
                          </p>
                          <div className="flex gap-3">
                            <button
                              onClick={() => handleCancelOrder(order._id)}
                              disabled={cancelLoading}
                              className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white font-poppins uppercase tracking-widest text-[10px] rounded transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                              {cancelLoading ? (
                                <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              ) : null}
                              {cancelLoading ? 'Cancelling...' : 'Yes, Cancel'}
                            </button>
                            <button
                              onClick={() => setCancellingId(null)}
                              disabled={cancelLoading}
                              className="px-5 py-2 border border-luxury-gray/30 hover:border-luxury-gold/50 text-luxury-gray hover:text-luxury-white font-poppins uppercase tracking-widest text-[10px] rounded transition-colors disabled:opacity-60"
                            >
                              Keep Order
                            </button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* ── Expected Delivery ── */}
                {order.status !== 'delivered' && order.status !== 'cancelled' && (
                  <div className="bg-luxury-secondary/30 border border-luxury-gold/20 p-4 mb-6 flex items-center gap-4">
                    <FiTruck className="text-luxury-gold" size={20} />
                    <div>
                      <p className="text-[10px] font-poppins uppercase tracking-widest text-luxury-gold mb-1">Expected Delivery</p>
                      <p className="text-luxury-white font-inter text-sm font-medium">{calculateExpectedDelivery(order.createdAt)}</p>
                    </div>
                  </div>
                )}

                {/* ── Order Items ── */}
                <div className="space-y-6">
                  {order.items?.map((item, idx) => (
                    <div key={idx} className="flex gap-6 items-center">
                      <div className="w-20 h-20 bg-luxury-secondary/50 border border-luxury-gray/10 flex-shrink-0">
                        <img
                          src={item.productId?.images?.[0] || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=200&auto=format&fit=crop'}
                          alt={item.productId?.title || 'Product'}
                          className="w-full h-full object-cover opacity-80"
                        />
                      </div>
                      <div className="flex-1">
                        <h4 className="text-luxury-white font-playfair text-lg mb-1">{item.productId?.title || 'Product'}</h4>
                        <div className="flex flex-wrap items-center gap-3 text-xs font-inter text-luxury-gray">
                          <span className="font-poppins uppercase tracking-widest">Qty: {item.quantity}</span>
                          <span>•</span>
                          <span className="tracking-wider">₹{item.price?.toLocaleString()}</span>
                          {(item.productId?.size) && (
                            <>
                              <span>•</span>
                              <span className="tracking-wider uppercase">Size: {item.productId.size}</span>
                            </>
                          )}
                          {(item.productId?.color) && (
                            <>
                              <span>•</span>
                              <span className="tracking-wider uppercase">Color: {item.productId.color}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default OrdersPage;
