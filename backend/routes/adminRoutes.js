const express = require('express');
const router = express.Router();
const { verifyToken, isAdmin } = require('../middleware/auth.middleware');
const upload = require('../middleware/upload.middleware');
const {
  adminLogin,
  getStats,
  getAllUsers,
  updateUser,
  getAdminProducts,
  addProduct,
  updateProduct,
  deleteProduct,
  getAllOrders,
  updateOrderStatus,
  updateStockOnly
} = require('../controllers/adminController');

router.post('/login', adminLogin);

router.get('/stats', verifyToken, isAdmin, getStats);

// The following routes have been modularized and moved to their respective route files:
// - /users -> adminUserRoutes.js
// - /products -> adminProductRoutes.js
// - /orders -> adminOrderRoutes.js

module.exports = router;
