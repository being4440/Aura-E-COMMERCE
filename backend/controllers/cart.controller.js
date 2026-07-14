const Cart = require('../models/Cart');
const Product = require('../models/Product');
const mongoose = require('mongoose');

const asyncHandler = require("../middleware/asyncHandler");

const catchAsync = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// ─── GET /api/cart ──────────────────────────────────────────────────────────
exports.getCart = catchAsync(async (req, res) => {
  let cart = await Cart.findOne({ user: req.user.id }).populate('items.product');
  if (!cart) {
    return res.status(200).json({
      success: true,
      data: { items: [], totalItems: 0, totalPrice: 0 }
    });
  }

  const responseCart = cart.toJSON({ virtuals: true });

  responseCart.items.forEach(item => {
    if (item.product) {
      item.product.maxStock = item.product.stock; // Map stock for frontend
      item.isAvailable = true;
    } else {
      item.isAvailable = false;
    }
  });

  res.status(200).json({ success: true, data: responseCart });
});

// ─── POST /api/cart/add ─────────────────────────────────────────────────────
// Uses a single atomic findOneAndUpdate with $push / $set — one DB round-trip
exports.addToCart = catchAsync(async (req, res) => {
  const { productId, size, color, quantity = 1 } = req.body;

  if (!Number.isInteger(quantity) || quantity < 1) {
    const error = new Error('Quantity must be an integer >= 1');
    error.status = 400;
    throw error;
  }

  if (!mongoose.Types.ObjectId.isValid(productId)) {
    const error = new Error('Invalid product ID');
    error.status = 400;
    throw error;
  }

  // Fetch live product from MongoDB
  const productDb = await Product.findById(productId);
  
  if (!productDb || !productDb.isActive) {
    const error = new Error('Product not available');
    error.status = 404;
    throw error;
  }

  if (productDb.stock <= 0) {
    const error = new Error('Product is out of stock');
    error.status = 400;
    throw error;
  }

  if (quantity > productDb.stock) {
    const error = new Error(`Only ${productDb.stock} items available`);
    error.status = 400;
    throw error;
  }

  const name = productDb.title;
  const price = productDb.price;
  const image = productDb.images?.[0] || '';
  const brand = productDb.brand;
  const maxStock = productDb.stock;

  // First fetch user cart
  let cart = await Cart.findOne({ user: req.user.id });

  if (cart) {
    const itemIndex = cart.items.findIndex(
      i => i.product.toString() === productId &&
           (i.size || null) === (size || null) &&
           (i.color || null) === (color || null)
    );
    
    if (itemIndex > -1) {
      const item = cart.items[itemIndex];
      const existingQtyInCart = item.quantity || 0;
      
      if (existingQtyInCart + quantity > productDb.stock) {
        const error = new Error('Cannot add more — insufficient stock');
        error.status = 400;
        throw error;
      }

      const newQty = existingQtyInCart + quantity;

      cart = await Cart.findOneAndUpdate(
        { user: req.user.id, 'items._id': item._id },
        {
          $set: {
            'items.$.quantity': newQty,
            updatedAt: Date.now()
          }
        },
        { new: true }
      );
    } else {
      cart = await Cart.findOneAndUpdate(
        { user: req.user.id },
        {
          $push: {
            items: {
              product: productId,
              size: size,
              color: color,
              quantity: quantity
            }
          },
          $set: { updatedAt: Date.now() }
        },
        { new: true }
      );
    }
  } else {
    // Push new item — upsert the cart document if it doesn't exist
    cart = await Cart.findOneAndUpdate(
      { user: req.user.id },
      {
        $push: {
          items: {
            product: productId,
            size: size,
            color: color,
            quantity: quantity
          }
        },
        $set: { updatedAt: Date.now() }
      },
      { new: true, upsert: true }
    );
  }

  if (!cart) {
    const error = new Error('Failed to update or create cart');
    error.status = 500;
    throw error;
  }

  await cart.populate('items.product');
  res.status(200).json({ success: true, data: cart });
});

// ─── DELETE /api/cart/:itemId ────────────────────────────────────────────────
exports.removeItem = catchAsync(async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.itemId)) {
    const error = new Error('Invalid item ID');
    error.status = 400;
    throw error;
  }

  const cart = await Cart.findOneAndUpdate(
    { user: req.user.id },
    {
      $pull: { items: { _id: req.params.itemId } },
      $set: { updatedAt: Date.now() }
    },
    { new: true }
  );

  if (!cart) {
    const error = new Error('Cart not found');
    error.status = 404;
    throw error;
  }

  await cart.populate('items.product');
  res.status(200).json({ success: true, data: cart });
});

// ─── PATCH /api/cart/:itemId ─────────────────────────────────────────────────
exports.updateQuantity = catchAsync(async (req, res) => {
  const { quantity } = req.body;
  if (!Number.isInteger(quantity) || quantity < 1) {
    const error = new Error('Quantity must be an integer >= 1');
    error.status = 400;
    throw error;
  }

  if (!mongoose.Types.ObjectId.isValid(req.params.itemId)) {
    const error = new Error('Invalid item ID');
    error.status = 400;
    throw error;
  }

  // Get current cart to find the productId
  const currentCart = await Cart.findOne({ user: req.user.id });
  if (!currentCart) {
    const error = new Error('Cart not found');
    error.status = 404;
    throw error;
  }

  const item = currentCart.items.id(req.params.itemId);
  if (!item) {
    const error = new Error('Item not found in cart');
    error.status = 404;
    throw error;
  }

  // Fetch live product stock
  const product = await Product.findById(item.product);
  if (!product) {
    const error = new Error('Product not found');
    error.status = 404;
    throw error;
  }

  if (quantity > product.stock) {
    const error = new Error(`Only ${product.stock} available`);
    error.status = 400;
    error.availableStock = product.stock;
    throw error;
  }

  const cart = await Cart.findOneAndUpdate(
    { user: req.user.id, 'items._id': req.params.itemId },
    {
      $set: {
        'items.$.quantity': quantity,
        updatedAt: Date.now()
      }
    },
    { new: true }
  );

  await cart.populate('items.product');
  res.status(200).json({ success: true, data: cart });
});

// ─── DELETE /api/cart ────────────────────────────────────────────────────────
exports.clearCart = catchAsync(async (req, res) => {
  const cart = await Cart.findOneAndUpdate(
    { user: req.user.id },
    { $set: { items: [], updatedAt: Date.now() } },
    { new: true }
  );

  res.status(200).json({
    success: true,
    data: cart || { items: [], totalItems: 0, totalPrice: 0 }
  });
});
