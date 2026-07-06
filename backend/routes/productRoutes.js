const express = require('express');
const router = express.Router();
const {
  getProducts,
  getProductById,
  getFeaturedProducts,
  getNewArrivals,
  checkProductStock
} = require('../controllers/productController');

// Specific routes first to avoid catching by /:id
router.get('/featured', getFeaturedProducts);
router.get('/new-arrivals', getNewArrivals);

// Stock check route
router.get('/:id/stock', checkProductStock);

// General routes
router.get('/', getProducts);
router.get('/:id', getProductById);

module.exports = router;
