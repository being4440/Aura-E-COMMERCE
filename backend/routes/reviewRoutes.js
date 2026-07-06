const express = require('express');
const router = express.Router({ mergeParams: true }); // Merge params to get productId from parent router
const { getProductReviews, addReview, updateReview, deleteReview } = require('../controllers/reviewController');
const { verifyToken } = require('../middleware/auth.middleware');

router.get('/', getProductReviews);
router.post('/', verifyToken, addReview);
router.put('/:id', verifyToken, updateReview);
router.delete('/:id', verifyToken, deleteReview);

module.exports = router;
