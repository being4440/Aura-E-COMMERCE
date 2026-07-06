const Wishlist = require('../models/Wishlist');
const mongoose = require('mongoose');

// @desc    Get user wishlist
// @route   GET /api/wishlist
// @access  Private
exports.getWishlist = async (req, res) => {
  try {
    // In a real app, you'd use req.user.id from auth middleware.
    // For now we support both query and req.user for flexibility.
    const userId = req.user ? req.user.id : req.query.userId; 
    if (!userId) return res.status(400).json({ message: 'User ID is required' });

    const wishlist = await Wishlist.findOne({ user: userId }).populate('products');
    res.json(wishlist || { products: [] });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Add product to wishlist
// @route   POST /api/wishlist
// @access  Private
exports.addToWishlist = async (req, res) => {
  try {
    const userId = req.user ? req.user.id : req.body.userId;
    const { productId } = req.body;
    
    if (!userId || !productId) return res.status(400).json({ message: 'User ID and Product ID required' });
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ message: 'Invalid product ID' });
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
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// @desc    Remove product from wishlist
// @route   DELETE /api/wishlist/:id
// @access  Private
exports.removeFromWishlist = async (req, res) => {
  try {
    const userId = req.user ? req.user.id : req.query.userId;
    const productId = req.params.id;
    
    if (!userId) return res.status(400).json({ message: 'User ID is required' });
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ message: 'Invalid product ID' });
    }

    let wishlist = await Wishlist.findOne({ user: userId });
    if (wishlist) {
      wishlist.products = wishlist.products.filter(p => p.toString() !== productId);
      await wishlist.save();
    }
    res.json(wishlist);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
