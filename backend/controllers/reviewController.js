const asyncHandler = require('../middleware/asyncHandler');
const Review = require('../models/Review');
const Product = require('../models/Product');
const mongoose = require('mongoose');

exports.updateProductRating = async (productId) => {
  const result = await Review.aggregate([
    { 
      $match: { 
        product: new mongoose.Types.ObjectId(productId),
        isHidden: { $ne: true }
      } 
    },
    { 
      $group: { 
        _id: '$product', 
        avgRating: { $avg: '$rating' }, 
        numReviews: { $sum: 1 } 
      } 
    }
  ]);

  const stats = result.length > 0 ? result[0] : { avgRating: 0, numReviews: 0 };
  const finalRating = Number((stats.avgRating || 0).toFixed(1));

  await Product.findByIdAndUpdate(productId, {
    rating: finalRating,
    numReviews: stats.numReviews
  });
};

// @desc    Get all reviews for a product
// @route   GET /api/products/:productId/reviews
// @access  Public
exports.getProductReviews = asyncHandler(async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.productId)) {
    const error = new Error('Invalid product ID');
    error.status = 400;
    throw error;
  }
  const reviews = await Review.find({ product: req.params.productId, isHidden: { $ne: true } }).populate('user', 'username name');
  res.json({ success: true, reviews });
});

// @desc    Add review to product
// @route   POST /api/products/:productId/reviews
// @access  Private
exports.addReview = asyncHandler(async (req, res) => {
  const { rating, comment } = req.body;
  const productId = req.params.productId;
  const userId = req.user.id;

  if (!mongoose.Types.ObjectId.isValid(productId)) {
    const error = new Error('Invalid product ID');
    error.status = 400;
    throw error;
  }

  // Check if product exists
  const product = await Product.findById(productId);
  if (!product) {
    const error = new Error('Product not found');
    error.status = 404;
    throw error;
  }

  // Check if user already reviewed
  const existingReview = await Review.findOne({ product: productId, user: userId });
  if (existingReview) {
    const error = new Error('You have already reviewed this product');
    error.status = 400;
    throw error;
  }

  const review = new Review({
    product: productId,
    user: userId,
    rating,
    comment
  });

  await review.save();
  await exports.updateProductRating(productId);
  
  res.status(201).json({ success: true, review });
});

// @desc    Update review
// @route   PUT /api/products/:productId/reviews/:id
// @access  Private
exports.updateReview = asyncHandler(async (req, res) => {
  const { rating, comment } = req.body;
  const reviewId = req.params.id;
  const productId = req.params.productId;
  const userId = req.user.id;

  if (!mongoose.Types.ObjectId.isValid(reviewId) || !mongoose.Types.ObjectId.isValid(productId)) {
    const error = new Error('Invalid ID');
    error.status = 400;
    throw error;
  }

  let review = await Review.findById(reviewId);

  if (!review) {
    const error = new Error('Review not found');
    error.status = 404;
    throw error;
  }

  if (review.user.toString() !== userId) {
    const error = new Error('Not authorized to update this review');
    error.status = 401;
    throw error;
  }

  review.rating = rating || review.rating;
  review.comment = comment || review.comment;
  await review.save();

  await exports.updateProductRating(productId);

  res.json({ success: true, review });
});

// @desc    Delete review
// @route   DELETE /api/products/:productId/reviews/:id
// @access  Private
exports.deleteReview = asyncHandler(async (req, res) => {
  const reviewId = req.params.id;
  const productId = req.params.productId;
  const userId = req.user.id;

  if (!mongoose.Types.ObjectId.isValid(reviewId) || !mongoose.Types.ObjectId.isValid(productId)) {
    const error = new Error('Invalid ID');
    error.status = 400;
    throw error;
  }

  const review = await Review.findById(reviewId);

  if (!review) {
    const error = new Error('Review not found');
    error.status = 404;
    throw error;
  }

  if (review.user.toString() !== userId && req.user.role !== 'admin') {
    const error = new Error('Not authorized to delete this review');
    error.status = 401;
    throw error;
  }

  await review.deleteOne();
  await exports.updateProductRating(productId);

  res.json({ success: true, message: 'Review removed' });
});

