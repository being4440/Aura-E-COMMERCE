const Review = require('../models/Review');
const Product = require('../models/Product');
const mongoose = require('mongoose');

const updateProductRating = async (productId) => {
  const reviews = await Review.find({ product: productId });
  const numReviews = reviews.length;
  const rating = numReviews === 0 
    ? 0 
    : reviews.reduce((acc, item) => item.rating + acc, 0) / numReviews;

  await Product.findByIdAndUpdate(productId, {
    rating: Number(rating.toFixed(1)),
    numReviews
  });
};

// @desc    Get all reviews for a product
// @route   GET /api/products/:productId/reviews
// @access  Public
exports.getProductReviews = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.productId)) {
      return res.status(400).json({ success: false, message: 'Invalid product ID' });
    }
    const reviews = await Review.find({ product: req.params.productId }).populate('user', 'username name');
    res.json({ success: true, reviews });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Add review to product
// @route   POST /api/products/:productId/reviews
// @access  Private
exports.addReview = async (req, res) => {
  try {
    const { rating, comment } = req.body;
    const productId = req.params.productId;
    const userId = req.user.id;

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ success: false, message: 'Invalid product ID' });
    }

    // Check if product exists
    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

    // Check if user already reviewed
    const existingReview = await Review.findOne({ product: productId, user: userId });
    if (existingReview) return res.status(400).json({ success: false, message: 'You have already reviewed this product' });

    const review = new Review({
      product: productId,
      user: userId,
      rating,
      comment
    });

    await review.save();
    await updateProductRating(productId);
    
    res.status(201).json({ success: true, review });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Update review
// @route   PUT /api/products/:productId/reviews/:id
// @access  Private
exports.updateReview = async (req, res) => {
  try {
    const { rating, comment } = req.body;
    const reviewId = req.params.id;
    const productId = req.params.productId;
    const userId = req.user.id;

    if (!mongoose.Types.ObjectId.isValid(reviewId) || !mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ success: false, message: 'Invalid ID' });
    }

    let review = await Review.findById(reviewId);

    if (!review) {
      return res.status(404).json({ success: false, message: 'Review not found' });
    }

    if (review.user.toString() !== userId) {
      return res.status(401).json({ success: false, message: 'Not authorized to update this review' });
    }

    review.rating = rating || review.rating;
    review.comment = comment || review.comment;
    await review.save();

    await updateProductRating(productId);

    res.json({ success: true, review });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Delete review
// @route   DELETE /api/products/:productId/reviews/:id
// @access  Private
exports.deleteReview = async (req, res) => {
  try {
    const reviewId = req.params.id;
    const productId = req.params.productId;
    const userId = req.user.id;

    if (!mongoose.Types.ObjectId.isValid(reviewId) || !mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ success: false, message: 'Invalid ID' });
    }

    const review = await Review.findById(reviewId);

    if (!review) {
      return res.status(404).json({ success: false, message: 'Review not found' });
    }

    if (review.user.toString() !== userId) {
      return res.status(401).json({ success: false, message: 'Not authorized to delete this review' });
    }

    await review.deleteOne();
    await updateProductRating(productId);

    res.json({ success: true, message: 'Review removed' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
