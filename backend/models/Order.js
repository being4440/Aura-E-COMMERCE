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
    enum: ['pending','paid', 'failed'],
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
 
  statusHistory: [{
    fromStatus: String,
    toStatus: String,
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    changedAt: { type: Date, default: Date.now },
    note: String
  }],
  invoiceNumber: { type: String, unique: true, sparse: true },
  invoiceGeneratedAt: { type: Date },
  stripePaymentIntentId: { type: String }
});

// Automatically generate invoiceNumber from _id on order creation if not present
OrderSchema.pre('save', function(next) {
  if (!this.invoiceNumber && this._id) {
    const last8 = this._id.toString().slice(-8).toUpperCase();
    this.invoiceNumber = `INV-${last8}`;
    if (!this.invoiceGeneratedAt) {
      this.invoiceGeneratedAt = new Date();
    }
  }
  next();
});

// Indexes for server-side search and filtering performance
OrderSchema.index({ createdAt: -1 });
OrderSchema.index({ status: 1 });
OrderSchema.index({ paymentMethod: 1 });
OrderSchema.index({ returnStatus: 1 });

module.exports = mongoose.model('Order', OrderSchema);
