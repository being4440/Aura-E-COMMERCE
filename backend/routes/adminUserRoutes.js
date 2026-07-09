const express = require('express');
const router = express.Router();
const { verifyToken, isAdmin } = require('../middleware/auth.middleware');
const {
  getUsers,
  getUserById,
  toggleBlockUser,
  deleteUser
} = require('../controllers/adminUserController');

router.use(verifyToken, isAdmin);

router.get('/', getUsers);
router.get('/:id', getUserById);
router.patch('/:id/block', toggleBlockUser);
router.delete('/:id', deleteUser);

module.exports = router;
