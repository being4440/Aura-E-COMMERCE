const express = require('express');
const router = express.Router();
const { getOrders, getOrderById, createOrder, cancelOrder } = require('../controllers/orderController');
const { verifyToken } = require('../middleware/auth.middleware');

router.get('/', verifyToken, getOrders);
router.get('/:id', verifyToken, getOrderById);
router.post('/', verifyToken, createOrder);
router.patch('/:id/cancel', verifyToken, cancelOrder);

module.exports = router;

