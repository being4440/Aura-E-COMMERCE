const express = require('express');
const router = express.Router();
const { verifyToken, isAdmin } = require('../middleware/auth.middleware');
const { adminLogin } = require('../controllers/adminAuthController');

router.post('/login', adminLogin);

// The following routes have been modularized and moved to their respective route files:
// - /users -> adminUserRoutes.js
// - /products -> adminProductRoutes.js
// - /orders -> adminOrderRoutes.js

module.exports = router;
