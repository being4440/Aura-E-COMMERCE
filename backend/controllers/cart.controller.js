const Cart = require('../models/Cart');
const Product = require('../models/Product');
const mongoose = require('mongoose');

const catchAsync = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// ─── GET /api/cart ──────────────────────────────────────────────────────────
exports.getCart = catchAsync(async (req, res) => {
  let cart = await Cart.findOne({ user: req.user.id });
  if (!cart) {
    return res.status(200).json({
      success: true,
      data: { items: [], totalItems: 0, totalPrice: 0 }
    });
  }

  // Sync prices with latest from DB
  const productIds = cart.items.map(item => item.product.productId);
  const products = await Product.find({ _id: { $in: productIds } }).lean();
  const productMap = {};
  products.forEach(p => productMap[p._id.toString()] = p);

  let updated = false;
  cart.items.forEach(item => {
    const p = productMap[item.product.productId];
    if (p) {
      if (item.product.price !== p.price || item.product.maxStock !== p.stock) {
        item.product.price = p.price;
        item.product.maxStock = p.stock;
        updated = true;
      }
    }
  });

  if (updated) {
    await cart.save();
  }

  res.status(200).json({ success: true, data: cart.toJSON({ virtuals: true }) });
});

// ─── POST /api/cart/add ─────────────────────────────────────────────────────
// Uses a single atomic findOneAndUpdate with $push / $set — one DB round-trip
exports.addToCart = catchAsync(async (req, res) => {
  const { productId, size, color, quantity = 1 } = req.body;

  if (!mongoose.Types.ObjectId.isValid(productId)) {
    return res.status(400).json({ success: false, message: 'Invalid product ID' });
  }

  // Fetch live product from MongoDB
  const productDb = await Product.findById(productId);
  
  if (!productDb || !productDb.isActive) {
    return res.status(404).json({ success: false, message: 'Product not available' });
  }

  if (productDb.stock <= 0) {
    return res.status(400).json({ success: false, message: 'Product is out of stock' });
  }

  if (quantity > productDb.stock) {
    return res.status(400).json({ success: false, message: `Only ${productDb.stock} items available` });
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
      i => i.product.productId === productId &&
           (i.product.size || null) === (size || null) &&
           (i.product.color || null) === (color || null)
    );
    
    if (itemIndex > -1) {
      const item = cart.items[itemIndex];
      const existingQtyInCart = item.quantity || 0;
      
      if (existingQtyInCart + quantity > productDb.stock) {
        return res.status(400).json({ success: false, message: 'Cannot add more — insufficient stock' });
      }

      const newQty = existingQtyInCart + quantity;

      cart = await Cart.findOneAndUpdate(
        { user: req.user.id, 'items._id': item._id },
        {
          $set: {
            'items.$.quantity': newQty,
            'items.$.product.price': price,
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
              product: { productId, name, price, image, brand, size, color, maxStock },
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
            product: { productId, name, price, image, brand, size, color, maxStock },
            quantity: quantity
          }
        },
        $set: { updatedAt: Date.now() }
      },
      { new: true, upsert: true }
    );
  }

  res.status(200).json({ success: true, data: cart });
});

// ─── DELETE /api/cart/:itemId ────────────────────────────────────────────────
exports.removeItem = catchAsync(async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.itemId)) {
    return res.status(400).json({ success: false, message: 'Invalid item ID' });
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
    return res.status(404).json({ success: false, message: 'Cart not found' });
  }

  res.status(200).json({ success: true, data: cart });
});

// ─── PATCH /api/cart/:itemId ─────────────────────────────────────────────────
exports.updateQuantity = catchAsync(async (req, res) => {
  const { quantity } = req.body;
  if (!Number.isInteger(quantity) || quantity < 1) {
    return res.status(400).json({ success: false, message: 'Quantity must be an integer >= 1' });
  }

  if (!mongoose.Types.ObjectId.isValid(req.params.itemId)) {
    return res.status(400).json({ success: false, message: 'Invalid item ID' });
  }

  // Get current cart to find the productId
  const currentCart = await Cart.findOne({ user: req.user.id });
  if (!currentCart) {
    return res.status(404).json({ success: false, message: 'Cart not found' });
  }

  const item = currentCart.items.id(req.params.itemId);
  if (!item) {
    return res.status(404).json({ success: false, message: 'Item not found in cart' });
  }

  // Fetch live product stock
  const product = await Product.findById(item.product.productId);
  if (!product) {
    return res.status(404).json({ success: false, message: 'Product not found' });
  }

  if (quantity > product.stock) {
    return res.status(400).json({ 
      success: false, 
      message: `Only ${product.stock} available`,
      availableStock: product.stock 
    });
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
