const express = require('express');
const router = express.Router();
const { verifyToken, isAdmin } = require('../middleware/auth.middleware');
const upload = require('../middleware/upload.middleware');
const {
  getAdminProducts,
  getAdminProductById,
  createProduct,
  updateProduct,
  quickUpdateStock,
  deleteProduct
} = require('../controllers/adminProductController');

router.use(verifyToken, isAdmin);

router.get('/', getAdminProducts);
router.get('/:id', getAdminProductById);
router.post('/', upload.array('images', 5), createProduct);
router.put('/:id', upload.array('images', 5), updateProduct);
router.patch('/:id/stock', quickUpdateStock);
router.delete('/:id', deleteProduct);

module.exports = router;
