import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { adminGetOrderByIdAPI, adminUpdateOrderStatusAPI, adminCancelOrderAPI, adminReturnOrderAPI, adminGenerateInvoiceAPI } from '../../api/api';
import { toast } from 'react-hot-toast';
import { FiArrowLeft, FiDownload, FiXCircle, FiCheck, FiRefreshCcw, FiFileText } from 'react-icons/fi';

const STATUS_FLOW = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['packed', 'cancelled'],
  processing: ['packed', 'cancelled'],
  packed: ['shipped'],
  shipped: ['outForDelivery'],
  outForDelivery: ['delivered'],
  delivered: [],
  cancelled: []
};

const RETURN_FLOW = {
  'None': ['Return Requested'],
  'Return Requested': ['Approved', 'Rejected'],
  'Approved': ['Refund Processing'],
  'Refund Processing': ['Refund Processed', 'Refund Failed'],
  'Rejected': [],
  'Refund Processed': [],
  'Refund Failed': ['Refund Processing']
};

const FULL_TIMELINE = ['pending', 'confirmed', 'packed', 'shipped', 'outForDelivery', 'delivered'];

const formatStatus = (status) => {
  if (!status) return '';
  if (status === 'outForDelivery') return 'Out for Delivery';
  return status.charAt(0).toUpperCase() + status.slice(1);
};

export default function AdminOrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  
  // Modals
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  const fetchOrder = async () => {
    try {
      const res = await adminGetOrderByIdAPI(id);
      if (res.data.success) {
        setOrder(res.data.data);
      }
    } catch (error) {
      toast.error('Failed to fetch order details');
      navigate('/admin/orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrder();
  }, [id]);

  const handleUpdateStatus = async (newStatus) => {
    try {
      setIsUpdating(true);
      const res = await adminUpdateOrderStatusAPI(id, newStatus);
      if (res.data.success) {
        toast.success(`Order marked as ${formatStatus(newStatus)}`);
        fetchOrder();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update status');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCancelOrder = async () => {
    try {
      setIsUpdating(true);
      const res = await adminCancelOrderAPI(id, cancelReason);
      if (res.data.success) {
        toast.success('Order cancelled and stock restored');
        setShowCancelModal(false);
        fetchOrder();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to cancel order');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleReturnAction = async (newReturnStatus) => {
    try {
      setIsUpdating(true);
      const res = await adminReturnOrderAPI(id, { returnStatus: newReturnStatus });
      if (res.data.success) {
        toast.success(`Return status updated to ${newReturnStatus}`);
        fetchOrder();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update return status');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleGenerateInvoice = async () => {
    try {
      setIsUpdating(true);
      const res = await adminGenerateInvoiceAPI(id);
      if (res.data.success) {
        toast.success('Invoice generated successfully');
        fetchOrder();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to generate invoice');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDownloadInvoice = () => {
    if (!order?.invoiceNumber) {
      toast.error('Generate the invoice first');
      return;
    }
    const token = localStorage.getItem('token');
    window.open(`${import.meta.env.VITE_API_URL}/api/admin/orders/${id}/invoice?token=${token}`, '_blank');
  };

  if (loading || !order) {
    return <div className="p-8 text-center text-luxury-white">Loading order details...</div>;
  }

  const validNextStatuses = STATUS_FLOW[order.status] || [];
  const canCancel = validNextStatuses.includes('cancelled') && !['Return Requested', 'Approved', 'Refund Processing', 'Refund Processed'].includes(order.returnStatus);

  const subtotal = order.items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const shipping = subtotal > 499 ? 0 : 49;
  const grandTotal = order.totalAmount;

  return (
    <div className="p-6 max-w-6xl mx-auto text-inter text-sm">
      {/* Header Actions */}
      <div className="flex flex-wrap items-center justify-between mb-8 gap-4">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/admin/orders')} className="p-2 text-luxury-gray hover:text-luxury-white transition-colors border border-luxury-gray/20 rounded">
            <FiArrowLeft size={18} />
          </button>
          <h2 className="text-2xl font-playfair text-luxury-white">Order Details</h2>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          {/* Status Transitions */}
          {validNextStatuses.filter(s => s !== 'cancelled').map(nextStatus => (
            <button
              key={nextStatus}
              onClick={() => handleUpdateStatus(nextStatus)}
              disabled={isUpdating}
              className="px-4 py-2 bg-luxury-white text-luxury-dark font-medium hover:bg-luxury-gold transition-colors text-xs uppercase tracking-wider"
            >
              Mark as {formatStatus(nextStatus)}
            </button>
          ))}

          {canCancel && (
            <button
              onClick={() => setShowCancelModal(true)}
              disabled={isUpdating}
              className="px-4 py-2 border border-red-500/50 text-red-500 hover:bg-red-500/10 transition-colors text-xs uppercase tracking-wider flex items-center gap-2"
            >
              <FiXCircle /> Cancel Order
            </button>
          )}

          {/* Invoice Actions */}
          {!order.invoiceNumber ? (
            <button
              onClick={handleGenerateInvoice}
              disabled={isUpdating || order.status === 'cancelled'}
              className="px-4 py-2 border border-luxury-gold/50 text-luxury-gold hover:bg-luxury-gold/10 transition-colors text-xs uppercase tracking-wider flex items-center gap-2 disabled:opacity-30"
            >
              <FiFileText /> Generate Invoice
            </button>
          ) : (
            <button
              onClick={handleDownloadInvoice}
              className="px-4 py-2 bg-luxury-gold text-luxury-dark font-medium hover:bg-white transition-colors text-xs uppercase tracking-wider flex items-center gap-2"
            >
              <FiDownload /> Download Invoice
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Details & Items */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          
          {/* Order Info & Customer */}
          <div className="bg-luxury-secondary/30 border border-luxury-gray/10 p-6">
            <h3 className="text-lg font-playfair text-luxury-white border-b border-luxury-gray/10 pb-3 mb-4">Summary</h3>
            <div className="grid grid-cols-2 gap-4 text-luxury-gray">
              <div>
                <span className="block text-xs uppercase tracking-wider mb-1 text-luxury-white/50">Order ID</span>
                <span className="text-luxury-white font-mono">{order._id}</span>
              </div>
              <div>
                <span className="block text-xs uppercase tracking-wider mb-1 text-luxury-white/50">Date Placed</span>
                <span className="text-luxury-white">{new Date(order.createdAt).toLocaleString()}</span>
              </div>
              <div>
                <span className="block text-xs uppercase tracking-wider mb-1 text-luxury-white/50">Customer</span>
                <span className="text-luxury-white block">{order.user?.username || 'Guest'}</span>
                <span className="text-luxury-white text-xs block">{order.user?.email}</span>
                <span className="text-luxury-white text-xs block">{order.user?.mobile}</span>
              </div>
              <div>
                <span className="block text-xs uppercase tracking-wider mb-1 text-luxury-white/50">Invoice</span>
                <span className="text-luxury-white font-mono">{order.invoiceNumber || 'Not Generated'}</span>
                {order.invoiceGeneratedAt && <span className="block text-xs mt-1">{new Date(order.invoiceGeneratedAt).toLocaleDateString()}</span>}
              </div>
            </div>
          </div>

          {/* Items */}
          <div className="bg-luxury-secondary/30 border border-luxury-gray/10 p-6">
            <h3 className="text-lg font-playfair text-luxury-white border-b border-luxury-gray/10 pb-3 mb-4">Items Ordered</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-luxury-gray/10 text-luxury-white/50 font-poppins uppercase tracking-wider text-[10px]">
                    <th className="pb-3 font-normal">Product</th>
                    <th className="pb-3 font-normal">Qty</th>
                    <th className="pb-3 font-normal">Unit Price</th>
                    <th className="pb-3 font-normal text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((item, idx) => (
                    <tr key={idx} className="border-b border-luxury-gray/5 last:border-0 text-luxury-white">
                      <td className="py-4">
                        <div className="flex items-center gap-3">
                          <img src={item.productId?.images?.[0] || 'https://via.placeholder.com/40'} alt={item.productId?.title} className="w-10 h-10 object-cover" />
                          <div>
                            <p className="font-medium line-clamp-1">{item.productId?.title || 'Deleted Product'}</p>
                            <p className="text-xs text-luxury-gray">{item.productId?.brand}</p>
                            {(item.productId?.size || item.productId?.color) && (
                              <p className="text-[10px] text-luxury-gray/70 mt-0.5 uppercase tracking-widest">
                                {item.productId.size && `Size: ${item.productId.size}`}
                                {item.productId.size && item.productId.color && ' | '}
                                {item.productId.color && `Color: ${item.productId.color}`}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-4">{item.quantity}</td>
                      <td className="py-4">₹{item.price.toLocaleString()}</td>
                      <td className="py-4 text-right">₹{(item.price * item.quantity).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-6 border-t border-luxury-gray/10 pt-4 flex flex-col items-end gap-2 text-luxury-gray">
              <div className="flex justify-between w-48"><span>Subtotal:</span> <span className="text-luxury-white">₹{subtotal.toLocaleString()}</span></div>
              <div className="flex justify-between w-48"><span>Shipping:</span> <span className="text-luxury-white">₹{shipping.toLocaleString()}</span></div>
              <div className="flex justify-between w-48 pt-2 border-t border-luxury-gray/10 font-medium"><span>Grand Total:</span> <span className="text-luxury-gold">₹{grandTotal.toLocaleString()}</span></div>
            </div>
          </div>
        </div>

        {/* Right Column: Status & Timeline */}
        <div className="flex flex-col gap-6">
          
          {/* Payment & Shipping Info */}
          <div className="bg-luxury-secondary/30 border border-luxury-gray/10 p-6">
            <h3 className="text-lg font-playfair text-luxury-white border-b border-luxury-gray/10 pb-3 mb-4">Payment & Shipping</h3>
            
            <div className="mb-6">
              <span className="block text-xs uppercase tracking-wider mb-2 text-luxury-white/50">Payment Status</span>
              <div className="flex items-center gap-2">
                <span className={`px-2 py-1 text-xs border uppercase tracking-wider ${order.paymentStatus === 'paid' ? 'bg-green-500/20 text-green-500 border-green-500/30' : 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30'}`}>
                  {order.paymentStatus}
                </span>
                <span className="text-luxury-gray text-xs">via {order.paymentMethod.toUpperCase()}</span>
              </div>
            </div>

            <div>
              <span className="block text-xs uppercase tracking-wider mb-2 text-luxury-white/50">Shipping Address</span>
              <div className="text-luxury-white text-sm bg-luxury-dark/50 p-3 border border-luxury-gray/10">
                <p className="font-medium text-luxury-gold mb-1">{order.shippingAddress.fullName}</p>
                <p>{order.shippingAddress.street}</p>
                <p>{order.shippingAddress.city}, {order.shippingAddress.state} - {order.shippingAddress.pincode}</p>
                <p className="mt-2 text-luxury-gray font-mono">Mobile: {order.shippingAddress.mobile}</p>
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div className="bg-luxury-secondary/30 border border-luxury-gray/10 p-6 flex-grow">
            <h3 className="text-lg font-playfair text-luxury-white border-b border-luxury-gray/10 pb-3 mb-6">Order Status Timeline</h3>
            
            <div className="relative pl-6 space-y-6 before:absolute before:inset-y-0 before:left-2.5 before:w-px before:bg-luxury-gray/20">
              
              {/* If Cancelled, show as dominant final state */}
              {order.status === 'cancelled' && (
                <div className="relative">
                  <div className="absolute -left-[29px] top-1 w-3 h-3 rounded-full bg-red-500 ring-4 ring-luxury-dark"></div>
                  <h4 className="text-red-500 font-medium uppercase tracking-wider text-xs">Cancelled</h4>
                  <p className="text-luxury-gray text-xs mt-1">{order.cancelReason}</p>
                </div>
              )}

              {FULL_TIMELINE.map((step, index) => {
                // Find if this step is in history
                const historyEntry = order.statusHistory?.slice().reverse().find(h => h.toStatus === step);
                const isCurrent = order.status === step;
                const isCompleted = order.statusHistory?.some(h => h.toStatus === step);
                const isFuture = !isCompleted && !isCurrent && order.status !== 'cancelled';
                
                if (order.status === 'cancelled' && !isCompleted) return null; // Don't show future steps if cancelled

                return (
                  <div key={step} className={`relative ${isFuture ? 'opacity-30' : ''}`}>
                    <div className={`absolute -left-[29px] top-1 w-3 h-3 rounded-full ring-4 ring-luxury-dark ${isCurrent ? 'bg-luxury-gold' : isCompleted ? 'bg-luxury-white' : 'bg-luxury-gray'}`}></div>
                    
                    <h4 className={`font-medium uppercase tracking-wider text-xs ${isCurrent ? 'text-luxury-gold' : 'text-luxury-white'}`}>
                      {formatStatus(step)}
                    </h4>
                    
                    {historyEntry && (
                      <div className="mt-1 text-xs text-luxury-gray space-y-1">
                        <p>{new Date(historyEntry.changedAt).toLocaleString()}</p>
                        {historyEntry.changedBy && <p>By: Admin ({historyEntry.changedBy.username})</p>}
                        {historyEntry.note && <p className="italic bg-luxury-dark/50 p-2 mt-2 text-luxury-white/70 border-l-2 border-luxury-gold/50">{historyEntry.note}</p>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Return Flow Section */}
            {order.returnStatus && order.returnStatus !== 'None' && (
              <div className="mt-8 pt-6 border-t border-luxury-gray/10">
                <h3 className="text-sm font-playfair text-luxury-white mb-4 uppercase tracking-widest text-luxury-gold">Return Request</h3>
                <div className="bg-luxury-dark/50 p-4 border border-luxury-gray/10">
                  <p className="text-luxury-white font-medium mb-1">{order.returnStatus}</p>
                  {order.returnReason && <p className="text-luxury-gray text-xs mb-4">Reason: {order.returnReason}</p>}
                  
                  {/* Return Actions */}
                  <div className="flex flex-wrap gap-2 mt-2">
                    {order.returnStatus === 'Return Requested' && (
                      <>
                        <button onClick={() => handleReturnAction('Approved')} className="px-3 py-1 bg-green-500/20 text-green-500 border border-green-500/30 hover:bg-green-500/30 text-xs uppercase tracking-wider flex items-center gap-1"><FiCheck /> Approve</button>
                        <button onClick={() => handleReturnAction('Rejected')} className="px-3 py-1 bg-red-500/20 text-red-500 border border-red-500/30 hover:bg-red-500/30 text-xs uppercase tracking-wider flex items-center gap-1"><FiXCircle /> Reject</button>
                      </>
                    )}
                    {order.returnStatus === 'Approved' && (
                      <button onClick={() => handleReturnAction('Refund Processing')} className="px-3 py-1 bg-blue-500/20 text-blue-500 border border-blue-500/30 hover:bg-blue-500/30 text-xs uppercase tracking-wider flex items-center gap-1"><FiRefreshCcw /> Trigger Refund</button>
                    )}
                    {order.returnStatus === 'Refund Failed' && (
                      <button onClick={() => handleReturnAction('Refund Processing')} className="px-3 py-1 bg-yellow-500/20 text-yellow-500 border border-yellow-500/30 hover:bg-yellow-500/30 text-xs uppercase tracking-wider flex items-center gap-1"><FiRefreshCcw /> Retry Refund</button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Cancel Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-luxury-dark border border-luxury-gray/20 w-full max-w-md p-6 shadow-2xl shadow-black/50">
            <h3 className="text-xl font-playfair text-red-500 mb-4">Cancel Order</h3>
            <p className="text-luxury-gray text-sm mb-4">Are you sure you want to cancel this order? This action will atomically restock the inventory.</p>
            
            <label className="block text-xs uppercase tracking-wider mb-2 text-luxury-white/50">Cancellation Reason</label>
            <textarea
              className="w-full bg-luxury-secondary/30 border border-luxury-gray/20 text-luxury-white p-3 focus:outline-none focus:border-red-500 mb-6"
              rows="3"
              placeholder="e.g., Requested by customer, Out of stock..."
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
            ></textarea>
            
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowCancelModal(false)} className="px-4 py-2 border border-luxury-gray/30 text-luxury-white hover:bg-luxury-gray/10 text-xs uppercase tracking-wider">
                Keep Order
              </button>
              <button 
                onClick={handleCancelOrder} 
                disabled={isUpdating || !cancelReason.trim()}
                className="px-4 py-2 bg-red-500/20 text-red-500 border border-red-500/50 hover:bg-red-500/30 text-xs uppercase tracking-wider disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Confirm Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
