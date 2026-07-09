const mongoose = require('mongoose');

function arrayLimit(val) {
  return val.length <= 5;
}

const ProductSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    minlength: 3,
    maxlength: 100
  },
  description: {
    type: String,
    required: true,
    minlength: 20,
    maxlength: 5000
  },
  category: {
    type: String,
    required: true
  },
  brand: {
    type: String,
    default: 'Generic',
    trim: true,
    maxlength: 50
  },
  sizes: [{
    type: String
  }],
  colors: [{
    type: String
  }],
  price: {
    type: Number,
    required: true,
    min: 0,
    max: 1000000
  },

  stock: {
    type: Number,
    required: true,
    default: 0,
    min: 0,
    max: 10000
  },
  reservedStock: {
    type: Number,
    default: 0
  },
  sold: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  images: {
    type: [{
      type: String
    }],
    validate: [arrayLimit, 'Cannot exceed 5 images']
  },
  featured: {
    type: Boolean,
    default: false
  },
  rating: {
    type: Number,
    default: 0
  },
  numReviews: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, {
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for available stock
ProductSchema.virtual('availableStock').get(function () {
  return this.stock - this.reservedStock;
});



// Methods
ProductSchema.methods.isInStock = function () {
  return this.availableStock > 0;
};

ProductSchema.methods.canAddToCart = function (qty) {
  return this.availableStock >= qty;
};

// Pre-save hook
ProductSchema.pre('save', function (next) {
  if (this.isModified('stock')) {
    this.lastUpdated = Date.now();
  }
  next();
});

// Static methods
ProductSchema.statics.deductStock = async function (productId, quantity) {
  const product = await this.findByIdAndUpdate(
    productId,
    { $inc: { stock: -quantity, sold: +quantity } },
    { new: true, runValidators: true }
  );
  if (!product) throw new Error('Product not found');
  return product;
};

ProductSchema.statics.restoreStock = async function (productId, quantity) {
  const product = await this.findByIdAndUpdate(
    productId,
    { $inc: { stock: +quantity, sold: -quantity } },
    { new: true }
  );
  if (!product) throw new Error('Product not found');
  return product;
};

// Indexes for fast filtering + sorting (matches productController query patterns)
ProductSchema.index({ category: 1, createdAt: -1 });  // category filter + newest sort
ProductSchema.index({ category: 1, price: 1 });        // category filter + price asc sort
ProductSchema.index({ category: 1, price: -1 });       // category filter + price desc sort
ProductSchema.index({ category: 1, rating: -1 });      // category filter + rating sort
ProductSchema.index({ title: 'text', description: 'text' }); // full-text search

module.exports = mongoose.model('Product', ProductSchema);
