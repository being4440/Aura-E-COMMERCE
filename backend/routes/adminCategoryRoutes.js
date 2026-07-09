const express = require('express');
const router = express.Router();
const { verifyToken, isAdmin } = require('../middleware/auth.middleware');
const {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory
} = require('../controllers/adminCategoryController');

// All category routes are protected for admins only, EXCEPT read which is public so frontend can fetch active categories
// Actually, for admin panel we need them all, but frontend needs GET too.
// Let's create an admin-specific GET for all categories (including inactive) and a public GET in productRoutes for active ones.
// But for simplicity, we'll keep this strictly admin for now.

router.use(verifyToken, isAdmin);

router.get('/', getCategories);
router.post('/', createCategory);
router.put('/:id', updateCategory);
router.delete('/:id', deleteCategory);

module.exports = router;
