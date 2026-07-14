const express = require('express');
const router = express.Router();
const { getOrders, getOrderById, placeOrder, cancelOrder, downloadInvoice } = require('../controllers/orderController');
const { verifyToken } = require('../middleware/auth.middleware');

router.get('/', verifyToken, getOrders);
router.get('/:id', verifyToken, getOrderById);
router.post('/', verifyToken, placeOrder);
router.patch('/:id/cancel', verifyToken, cancelOrder);
router.get('/:id/invoice', verifyToken, downloadInvoice);

module.exports = router;

