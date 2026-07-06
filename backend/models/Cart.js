const mongoose = require('mongoose');
const { Schema } = mongoose;

const cartItemSchema = new Schema({
  product: {
    productId: { type: String, required: true },
    name: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },

    image: { type: String },
    brand: { type: String },
    size: { type: String },
    color: { type: String },
    maxStock: { type: Number }
  },
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
    return sum + (item.quantity * item.product.price);
  }, 0);
});

// Ensure virtuals are included in JSON and Object outputs
cartSchema.set('toJSON', { virtuals: true });
cartSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Cart', cartSchema);
