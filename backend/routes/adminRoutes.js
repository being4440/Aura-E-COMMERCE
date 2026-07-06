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

router.get('/users', verifyToken, isAdmin, getAllUsers);
router.patch('/users/:id', verifyToken, isAdmin, updateUser);

router.get('/products', verifyToken, isAdmin, getAdminProducts);
router.post('/products', verifyToken, isAdmin, upload.array('images', 5), addProduct);
router.patch('/products/:id', verifyToken, isAdmin, upload.array('images', 5), updateProduct);
router.patch('/products/:id/stock', verifyToken, isAdmin, updateStockOnly);
router.delete('/products/:id', verifyToken, isAdmin, deleteProduct);

router.get('/orders', verifyToken, isAdmin, getAllOrders);
router.patch('/orders/:id/status', verifyToken, isAdmin, updateOrderStatus);

module.exports = router;
