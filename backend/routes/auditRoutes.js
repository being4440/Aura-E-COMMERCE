const express = require('express');
const router = express.Router();
const { verifyToken, isAdmin } = require('../middleware/auth.middleware');
const { getAuditLogs } = require('../controllers/auditController');

router.get('/', verifyToken, isAdmin, getAuditLogs);

module.exports = router;
