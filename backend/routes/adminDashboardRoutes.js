const express = require('express');
const router = express.Router();
const { verifyToken, isAdmin } = require('../middleware/auth.middleware');
const {
  getStats,
  getRecentOrders,
  getTopProducts
} = require('../controllers/adminDashboardController');

router.use(verifyToken, isAdmin);

router.get('/stats', getStats);
router.get('/recent-orders', getRecentOrders);
router.get('/top-products', getTopProducts);

module.exports = router;
