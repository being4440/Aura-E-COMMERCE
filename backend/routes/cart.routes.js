const express = require('express');
const router = express.Router();
const { 
  getCart, 
  addToCart, 
  removeItem, 
  updateQuantity, 
  clearCart 
} = require('../controllers/cart.controller');
const { verifyToken } = require('../middleware/auth.middleware');

router.use(verifyToken);

router.get('/', getCart);
router.post('/add', addToCart);
router.patch('/:itemId', updateQuantity);
router.delete('/:itemId', removeItem);
router.delete('/', clearCart);

module.exports = router;
