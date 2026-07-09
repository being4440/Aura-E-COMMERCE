const express = require('express');
const router = express.Router();
const { verifyToken, isAdmin } = require('../middleware/auth.middleware');
const {
  getAllOrders,
  getOrderById,
  updateOrderStatus,
  cancelOrder,
  processReturn,
  generateInvoiceNumber,
  downloadInvoice
} = require('../controllers/adminOrderController');

// All routes are protected by verifyToken and isAdmin
router.use(verifyToken, isAdmin);

router.get('/', getAllOrders);
router.get('/:id', getOrderById);
router.patch('/:id/status', updateOrderStatus);
router.patch('/:id/cancel', cancelOrder);
router.patch('/:id/return', processReturn);
router.patch('/:id/generate-invoice', generateInvoiceNumber);
router.get('/:id/invoice', downloadInvoice);

module.exports = router;
