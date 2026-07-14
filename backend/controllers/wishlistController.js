const Wishlist = require('../models/Wishlist');
const mongoose = require('mongoose');

const asyncHandler = require("../middleware/asyncHandler");

// @desc    Get user wishlist
// @route   GET /api/wishlist
// @access  Private
exports.getWishlist = asyncHandler(async (req, res) => {
  if (!req.user || !req.user.id) {
    const error = new Error('Unauthorized');
    error.status = 401;
    throw error;
  }
  const userId = req.user.id;

  const wishlist = await Wishlist.findOne({ user: userId }).populate('products');
  res.json(wishlist || { products: [] });
});

// @desc    Add product to wishlist
// @route   POST /api/wishlist
// @access  Private
exports.addToWishlist = asyncHandler(async (req, res) => {
  if (!req.user || !req.user.id) {
    const error = new Error('Unauthorized');
    error.status = 401;
    throw error;
  }
  const userId = req.user.id;
  const { productId } = req.body;

  if (!productId) {
    const error = new Error('Product ID required');
    error.status = 400;
    throw error;
  }
  if (!mongoose.Types.ObjectId.isValid(productId)) {
    const error = new Error('Invalid product ID');
    error.status = 400;
    throw error;
  }

  let wishlist = await Wishlist.findOne({ user: userId });

  if (!wishlist) {
    wishlist = new Wishlist({ user: userId, products: [productId] });
  } else {
    if (!wishlist.products.includes(productId)) {
      wishlist.products.push(productId);
    }
  }
  await wishlist.save();
  res.status(201).json(wishlist);
});

// @desc    Remove product from wishlist
// @route   DELETE /api/wishlist/:id
// @access  Private
exports.removeFromWishlist = asyncHandler(async (req, res) => {
  if (!req.user || !req.user.id) {
    const error = new Error('Unauthorized');
    error.status = 401;
    throw error;
  }
  const userId = req.user.id;
  const productId = req.params.id;
  if (!mongoose.Types.ObjectId.isValid(productId)) {
    const error = new Error('Invalid product ID');
    error.status = 400;
    throw error;
  }

  let wishlist = await Wishlist.findOne({ user: userId });
  if (wishlist) {
    wishlist.products = wishlist.products.filter(p => p.toString() !== productId);
    await wishlist.save();
  }
  res.json(wishlist);
});
