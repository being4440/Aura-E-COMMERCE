const mongoose = require('mongoose');
const { Schema } = mongoose;

const cartItemSchema = new Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  size: { type: String },
  color: { type: String },
  quantity: { type: Number, required: true, default: 1, min: 1, max: 10 }
});

const cartSchema = new Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  items: [cartItemSchema],
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

// Add virtuals
cartSchema.virtual('totalItems').get(function() {
  return this.items.reduce((sum, item) => sum + item.quantity, 0);
});

cartSchema.virtual('totalPrice').get(function() {
  return this.items.reduce((sum, item) => {
    const price = item.product && item.product.price ? item.product.price : 0;
    return sum + (item.quantity * price);
  }, 0);
});

// Ensure virtuals are included in JSON and Object outputs
cartSchema.set('toJSON', { virtuals: true });
cartSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Cart', cartSchema);
