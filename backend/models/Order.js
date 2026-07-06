const mongoose = require('mongoose');

const OrderItemSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  quantity: {
    type: Number,
    required: true
  },
  price: {
    type: Number,
    required: true
  },
  updatedStock: {
    type: Number
  }
});

const OrderSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  items: [OrderItemSchema],
  totalAmount: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'confirmed', 'packed', 'shipped', 'outForDelivery', 'delivered', 'cancelled'],
    default: 'processing'
  },
  shippingAddress: {
    fullName: { type: String, required: true, minlength: 3, maxlength: 50 },
    mobile: { type: String, required: true, match: /^\d{10}$/ },
    street: { type: String, required: true, minlength: 10, maxlength: 200 },
    pincode: { type: String, required: true, match: /^\d{6}$/ },
    city: { type: String, required: true, match: /^[a-zA-Z\s]+$/ },
    state: { type: String, required: true }
  },
  paymentInfo: {
    type: String,
    required: true
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'completed', 'failed'],
    default: 'pending'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  statusTimeline: [{
    status: {
      type: String,
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    message: {
      type: String
    }
  }]
});

module.exports = mongoose.model('Order', OrderSchema);
