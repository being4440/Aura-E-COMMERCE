import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import api from '../api/api';
import { clearCart } from '../store/cartSlice';
import toast from 'react-hot-toast';

const Checkout = () => {
  const { items, totalPrice } = useSelector((state) => state.cart);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const currentUser = JSON.parse(localStorage.getItem('user')) || {};
  const [address, setAddress] = useState({
    fullName: currentUser?.address?.fullName || currentUser?.username || '',
    mobile: currentUser?.address?.mobile || currentUser?.mobile || '',
    street: currentUser?.address?.street || '',
    pincode: currentUser?.address?.pincode || '',
    city: currentUser?.address?.city || '',
    state: currentUser?.address?.state || ''
  });
  const [paymentInfo, setPaymentInfo] = useState('Stripe');
  const [isProcessing, setIsProcessing] = useState(false);

  const shipping = totalPrice > 499 || totalPrice === 0 ? 0 : 49;
  const finalTotal = totalPrice + shipping;

  const handlePlaceOrder = async (e) => {
    e.preventDefault();
    if (!address.fullName || !address.mobile || !address.street || !address.pincode || !address.city || !address.state) {
      return toast.error('Please complete your shipping address');
    }

    if (!/^\d{6}$/.test(address.pincode)) {
      return toast.error('Pincode must be exactly 6 digits');
    }

    try {
      setIsProcessing(true);
      
      const orderData = {
        items: items.map(item => ({
          productId: item.product.productId || item.product._id,
          quantity: item.quantity,
          price: item.product.price
        })),
        totalAmount: finalTotal,
        shippingAddress: address,
        paymentInfo,
      };

      if (paymentInfo === 'Stripe') {
        // Stripe flow
        const response = await api.post('/payment/create-checkout-session', {
          shippingAddress: address
        });
        
        if (response.data.url) {
          window.location.href = response.data.url;
        } else {
          throw new Error('Failed to create checkout session');
        }
      } else {
        // COD flow
        const response = await api.post('/orders', orderData);
        const savedOrder = response.data.data;
        await dispatch(clearCart()).unwrap();
        navigate(`/order-confirmation/${savedOrder._id}`);
      }
    } catch (err) {
      console.error('Checkout error:', err);
      toast.error(err.response?.data?.message || err.message || 'Failed to process checkout. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="container mx-auto p-4 md:p-8 pt-24 min-h-screen text-center">
        <h2 className="text-2xl font-bold text-white mb-4">Your cart is empty</h2>
        <button onClick={() => navigate('/')} className="bg-blue-600 px-6 py-2 rounded text-white">
          Go Shopping
        </button>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-8 pt-24 min-h-screen flex justify-center">
      <div className="bg-gray-900 rounded-xl p-6 md:p-10 shadow-xl border border-gray-800 max-w-2xl w-full">
        <h1 className="text-3xl font-bold text-white mb-8 border-b border-gray-700 pb-4">Checkout</h1>
        
        <form onSubmit={handlePlaceOrder} className="space-y-6">
          <div>
            <label className="block text-gray-400 mb-2 font-medium">Shipping Address</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input type="text" placeholder="Full Name" required minLength="3" maxLength="50" value={address.fullName} onChange={(e) => setAddress({...address, fullName: e.target.value})} className="bg-gray-800 text-white border border-gray-700 rounded-lg p-3 focus:outline-none focus:border-blue-500" />
              <input type="tel" placeholder="Mobile Number" required pattern="^[6-9]\d{9}$" title="Valid 10-digit Indian mobile number" value={address.mobile} onChange={(e) => setAddress({...address, mobile: e.target.value})} className="bg-gray-800 text-white border border-gray-700 rounded-lg p-3 focus:outline-none focus:border-blue-500" />
            </div>
            <textarea placeholder="Full Street Address" required minLength="10" maxLength="200" value={address.street} onChange={(e) => setAddress({...address, street: e.target.value})} className="w-full bg-gray-800 text-white border border-gray-700 rounded-lg p-3 mt-4 focus:outline-none focus:border-blue-500" rows="3"></textarea>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <input type="text" placeholder="Pincode" required pattern="^\d{6}$" title="6-digit Pincode" value={address.pincode} onChange={(e) => setAddress({...address, pincode: e.target.value})} className="bg-gray-800 text-white border border-gray-700 rounded-lg p-3 focus:outline-none focus:border-blue-500" />
              <input type="text" placeholder="City" required pattern="^[a-zA-Z\s]+$" title="Only letters allowed" value={address.city} onChange={(e) => setAddress({...address, city: e.target.value})} className="bg-gray-800 text-white border border-gray-700 rounded-lg p-3 focus:outline-none focus:border-blue-500" />
              <input type="text" placeholder="State" required value={address.state} onChange={(e) => setAddress({...address, state: e.target.value})} className="bg-gray-800 text-white border border-gray-700 rounded-lg p-3 focus:outline-none focus:border-blue-500" />
            </div>
          </div>

          <div>
            <label className="block text-gray-400 mb-2 font-medium">Payment Method</label>
            <div className="flex flex-col sm:flex-row gap-4 mt-2">
              <label className={`flex-1 flex items-center justify-center p-4 border rounded-lg cursor-pointer transition-colors ${paymentInfo === 'Stripe' ? 'border-blue-500 bg-blue-500/10 text-blue-400' : 'border-gray-700 bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
                <input 
                  type="radio" 
                  name="paymentMethod" 
                  value="Stripe" 
                  checked={paymentInfo === 'Stripe'} 
                  onChange={(e) => setPaymentInfo(e.target.value)} 
                  className="hidden" 
                />
                <span className="font-semibold">Stripe (Card Payment)</span>
              </label>
              
              <label className={`flex-1 flex items-center justify-center p-4 border rounded-lg cursor-pointer transition-colors ${paymentInfo === 'Cash on Delivery' ? 'border-blue-500 bg-blue-500/10 text-blue-400' : 'border-gray-700 bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
                <input 
                  type="radio" 
                  name="paymentMethod" 
                  value="Cash on Delivery" 
                  checked={paymentInfo === 'Cash on Delivery'} 
                  onChange={(e) => setPaymentInfo(e.target.value)} 
                  className="hidden" 
                />
                <span className="font-semibold">Cash on Delivery (COD)</span>
              </label>
            </div>
          </div>

          <div className="border-t border-gray-700 pt-6 mt-8">
            <div className="flex justify-between text-gray-300 mb-2">
              <span>Subtotal</span>
              <span>₹{totalPrice.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between text-gray-300 mb-4">
              <span>Shipping</span>
              <span>{shipping === 0 ? 'FREE' : `₹${shipping}`}</span>
            </div>
            <div className="flex justify-between text-white text-xl font-bold mb-8">
              <span>Total Amount</span>
              <span>₹{finalTotal.toLocaleString('en-IN')}</span>
            </div>

            <button 
              type="submit"
              disabled={isProcessing}
              className={`w-full py-4 rounded-lg font-bold text-lg text-white transition-colors ${
                isProcessing ? 'bg-blue-800 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {isProcessing ? (paymentInfo === 'Stripe' ? 'Redirecting to Stripe...' : 'Processing Order...') : (paymentInfo === 'Stripe' ? 'Pay Now' : 'Place Order')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Checkout;
