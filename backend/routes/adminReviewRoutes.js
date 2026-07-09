const express = require('express');
const router = express.Router();
const { verifyToken, isAdmin } = require('../middleware/auth.middleware');
const {
  getReviews,
  toggleHideReview,
  deleteSpamReview
} = require('../controllers/adminReviewController');

router.use(verifyToken, isAdmin);

router.get('/', getReviews);
router.patch('/:id/hide', toggleHideReview);
router.delete('/:id', deleteSpamReview);

module.exports = router;
