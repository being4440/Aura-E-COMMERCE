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
    default: 'pending'
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
  paymentMethod: {
    type: String,
    enum: ['stripe', 'cod'],
    default: 'cod'
  },
  stripeSessionId: {
    type: String,
    required: false
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'completed', 'paid', 'failed'],
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
  }],
  returnStatus: {
    type: String,
    enum: ['None', 'Return Requested', 'Approved', 'Rejected', 'Refund Processing', 'Refund Processed', 'Refund Failed'],
    default: 'None'
  },
  statusHistory: [{
    fromStatus: String,
    toStatus: String,
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    changedAt: { type: Date, default: Date.now },
    note: String
  }],
  cancelReason: { type: String },
  returnReason: { type: String },
  invoiceNumber: { type: String, unique: true, sparse: true },
  invoiceGeneratedAt: { type: Date },
  stripePaymentIntentId: { type: String }
});

// Indexes for server-side search and filtering performance
OrderSchema.index({ createdAt: -1 });
OrderSchema.index({ status: 1 });
OrderSchema.index({ paymentMethod: 1 });
OrderSchema.index({ returnStatus: 1 });

module.exports = mongoose.model('Order', OrderSchema);
