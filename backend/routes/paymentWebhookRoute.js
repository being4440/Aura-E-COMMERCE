const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');

// This route specifically doesn't use the protect middleware because it's called by Stripe
router.post('/', paymentController.webhook);

module.exports = router;
