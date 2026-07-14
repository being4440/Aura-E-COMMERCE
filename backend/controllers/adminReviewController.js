const Review = require('../models/Review');
const { updateProductRating } = require('./reviewController');

const asyncHandler = require("../middleware/asyncHandler");

exports.getReviews = asyncHandler(async (req, res) => {
  const { 
    page = 1, 
    limit = 10, 
    rating,
    isHidden,
    productId,
    sortBy = 'createdAt', 
    sortOrder = 'desc' 
  } = req.query;

  const query = {};

  if (rating) query.rating = Number(rating);
  if (isHidden !== undefined) query.isHidden = isHidden === 'true';
  if (productId) query.product = productId;

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const sortObj = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

  const reviews = await Review.find(query)
    .populate('user', 'username email')
    .populate('product', 'title images')
    .sort(sortObj)
    .skip(skip)
    .limit(parseInt(limit));

  const totalReviews = await Review.countDocuments(query);

  res.status(200).json({
    success: true,
    data: reviews,
    pagination: {
      total: totalReviews,
      page: parseInt(page),
      pages: Math.ceil(totalReviews / limit)
    }
  });
});

exports.toggleHideReview = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { isHidden, flaggedReason } = req.body;

  const review = await Review.findById(id);
  if (!review) {
    const error = new Error('Review not found');
    error.status = 404;
    throw error;
  }

  review.isHidden = isHidden;
  review.flaggedReason = isHidden ? (flaggedReason || 'Hidden by Admin') : null;

  await review.save();

  // Recalculate product rating to exclude/include this review
  await updateProductRating(review.product);

  res.status(200).json({
    success: true,
    message: `Review successfully ${isHidden ? 'hidden' : 'unhidden'}`,
    data: review
  });
});

exports.deleteSpamReview = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const review = await Review.findById(id);
  if (!review) {
    const error = new Error('Review not found');
    error.status = 404;
    throw error;
  }

  const productId = review.product;
  await review.deleteOne();

  // Recalculate product rating since review is gone
  await updateProductRating(productId);

  res.status(200).json({
    success: true,
    message: 'Spam review permanently deleted.'
  });
});
