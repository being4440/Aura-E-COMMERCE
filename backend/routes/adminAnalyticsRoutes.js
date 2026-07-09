const express = require('express');
const router = express.Router();
const { verifyToken, isAdmin } = require('../middleware/auth.middleware');
const {
  getSalesAnalytics,
  getProductAnalytics,
  getUserAnalytics,
  getPaymentAnalytics
} = require('../controllers/adminAnalyticsController');

router.use(verifyToken, isAdmin);

router.get('/sales', getSalesAnalytics);
router.get('/products', getProductAnalytics);
router.get('/users', getUserAnalytics);
router.get('/payments', getPaymentAnalytics);

module.exports = router;
