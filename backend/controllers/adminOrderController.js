const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');
const mongoose = require('mongoose');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const PDFDocument = require('pdfkit');
const asyncHandler = require('../middleware/asyncHandler');
const auditService = require('../services/auditService');

const STATUS_FLOW = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['packed', 'cancelled'],
  processing: ['packed', 'cancelled'], // handling legacy or existing 'processing'
  packed: ['shipped'],
  shipped: ['outForDelivery'],
  outForDelivery: ['delivered'],
  delivered: [],
  cancelled: []
};

// Search & Filter Orders
exports.getAllOrders = asyncHandler(async (req, res) => {
  const { 
    page = 1, 
    limit = 10, 
    search = '', 
    status, 
    paymentMethod, 
    paymentStatus,
    returnStatus,
    sortBy = 'createdAt', 
    sortOrder = 'desc',
    minPrice,
    maxPrice,
    city
  } = req.query;

  const query = {};

  // Filters
  if (status) query.status = status;
  if (paymentMethod) query.paymentMethod = paymentMethod;
  if (paymentStatus) query.paymentStatus = paymentStatus;
  if (returnStatus) query.returnStatus = returnStatus;
  
  if (minPrice || maxPrice) {
    query.totalAmount = {};
    if (minPrice) query.totalAmount.$gte = Number(minPrice);
    if (maxPrice) query.totalAmount.$lte = Number(maxPrice);
  }

  if (city) {
    query['shippingAddress.city'] = { $regex: city, $options: 'i' };
  }

  // Search (Order ID, Customer Name/Email)
  if (search) {
    const cleanSearch = search.replace(/^#/, '').trim();
    const searchRegex = new RegExp(cleanSearch, 'i');
    const searchConditions = [
      { 'shippingAddress.fullName': searchRegex },
      { invoiceNumber: searchRegex }
    ];

    if (mongoose.Types.ObjectId.isValid(cleanSearch)) {
      searchConditions.push({ _id: cleanSearch });
    } else {
      searchConditions.push({
        $expr: {
          $regexMatch: {
            input: { $toString: '$_id' },
            regex: cleanSearch,
            options: 'i'
          }
        }
      });
    }

    // To search by user email/username, we need to find matching users first
    const users = await User.find({
      $or: [{ username: searchRegex }, { email: searchRegex }]
    }).select('_id');
    
    if (users.length > 0) {
      searchConditions.push({ user: { $in: users.map(u => u._id) } });
    }

    query.$or = searchConditions;
  }

  // Sorting
  const sortObj = {};
  const sortDirection = sortOrder === 'desc' ? -1 : 1;
  
  // Map custom sort fields if needed
  if (sortBy === 'customerName') {
    sortObj['shippingAddress.fullName'] = sortDirection;
  } else {
    sortObj[sortBy] = sortDirection;
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const orders = await Order.find(query)
    .populate('user', 'username email mobile')
    .sort(sortObj)
    .skip(skip)
    .limit(parseInt(limit));

  const totalOrders = await Order.countDocuments(query);

  res.status(200).json({
    success: true,
    data: orders,
    pagination: {
      total: totalOrders,
      page: parseInt(page),
      pages: Math.ceil(totalOrders / limit)
    }
  });
});

// Get Order Details
exports.getOrderById = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id)
    .populate('user', 'username email mobile')
    .populate('items.productId', 'title images brand category price')
    .populate('statusHistory.changedBy', 'username');

  if (!order) {
    const error = new Error('Order not found');
    error.status = 404;
    throw error;
  }

  res.status(200).json({ success: true, data: order });
});

// Update Order Status
exports.updateOrderStatus = asyncHandler(async (req, res) => {
  const { status, note } = req.body;
  const orderId = req.params.id;

  if (!status) {
    const error = new Error('Status is required');
    error.status = 400;
    throw error;
  }

  const order = await Order.findById(orderId);
  if (!order) {
    const error = new Error('Order not found');
    error.status = 404;
    throw error;
  }

  const currentStatus = order.status;
  const allowedTransitions = STATUS_FLOW[currentStatus] || [];

  if (!allowedTransitions.includes(status)) {
    const error = new Error(`Invalid status transition from ${currentStatus} to ${status}`);
    error.status = 400;
    throw error;
  }

  const changes = [];
  if (req.body.status !== undefined && req.body.status !== order.status) {
    changes.push({
      field: 'status',
      oldValue: order.status,
      newValue: req.body.status
    });
  }

  // Update status and history
  order.status = status;
  order.statusTimeline.push({
    status,
    timestamp: new Date(),
    message: note || `Order marked as ${status}`
  });
  
  order.statusHistory.push({
    fromStatus: currentStatus,
    toStatus: status,
    changedBy: req.user.id,
    changedAt: new Date(),
    note: note || `Status updated by Admin`
  });

  await order.save();

  if (changes.length > 0) {
    await auditService.logChange({
      entityType: 'Order',
      entityId: order._id,
      action: 'STATUS_CHANGE',
      performedBy: req.user.id,
      changes
    });
  }

  res.status(200).json({ success: true, message: `Order status updated to ${status}`, data: order });
});

// Cancel Order (Transaction)
exports.cancelOrder = asyncHandler(async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { cancelReason } = req.body;
    const orderId = req.params.id;

    const order = await Order.findById(orderId).session(session);
    if (!order) {
      const error = new Error('Order not found');
      error.status = 404;
      throw error;
    }

    // 409 Conflict Validations
    if (order.status === 'cancelled') {
      const error = new Error('Order is already cancelled');
      error.status = 409;
      throw error;
    }
    if (order.status === 'delivered') {
      const error = new Error('Cannot cancel a delivered order');
      error.status = 409;
      throw error;
    }
    if (['Return Requested', 'Approved', 'Refund Processing', 'Refund Processed'].includes(order.returnStatus)) {
      const error = new Error('Cannot cancel an order in the return/refund flow');
      error.status = 409;
      throw error;
    }

    const currentStatus = order.status;
    const allowedTransitions = STATUS_FLOW[currentStatus] || [];
    if (!allowedTransitions.includes('cancelled')) {
      const error = new Error(`Cannot cancel order from status: ${currentStatus}`);
      error.status = 400;
      throw error;
    }

    // Restock Inventory using $inc
    for (const item of order.items) {
      await Product.findByIdAndUpdate(
        item.productId,
        { $inc: { stock: item.quantity, sold: -item.quantity } },
        { session }
      );
      // We don't fail if product doesn't exist, to avoid breaking cancellation of legacy orders
    }

    const changes = [];
    if (order.status !== 'cancelled') {
      changes.push({
        field: 'status',
        oldValue: order.status,
        newValue: 'cancelled'
      });
    }

    // Update Order
    order.status = 'cancelled';
    order.cancelReason = cancelReason || 'Cancelled by Admin';
    
    order.statusTimeline.push({
      status: 'cancelled',
      timestamp: new Date(),
      message: order.cancelReason
    });

    order.statusHistory.push({
      fromStatus: currentStatus,
      toStatus: 'cancelled',
      changedBy: req.user.id,
      changedAt: new Date(),
      note: order.cancelReason
    });

    await order.save({ session });
    await session.commitTransaction();

    if (changes.length > 0) {
      await auditService.logChange({
        entityType: 'Order',
        entityId: order._id,
        action: 'STATUS_CHANGE',
        performedBy: req.user.id,
        changes
      });
    }

    res.status(200).json({ success: true, message: 'Order cancelled successfully', data: order });
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
});

// Process Return Flow
exports.processReturn = asyncHandler(async (req, res) => {
  const { returnStatus, returnReason } = req.body;
  const orderId = req.params.id;

  const order = await Order.findById(orderId);
  if (!order) {
    const error = new Error('Order not found');
    error.status = 404;
    throw error;
  }

  // Validate transition
  const current = order.returnStatus || 'None';
  const validFlows = {
    'None': ['Return Requested'],
    'Return Requested': ['Approved', 'Rejected'],
    'Approved': ['Refund Processing'],
    'Refund Processing': ['Refund Processed', 'Refund Failed'],
    'Rejected': [],
    'Refund Processed': [],
    'Refund Failed': ['Refund Processing'] // Allow retry
  };

  if (!validFlows[current] || !validFlows[current].includes(returnStatus)) {
    const error = new Error(`Invalid return transition from ${current} to ${returnStatus}`);
    error.status = 400;
    throw error;
  }

  order.returnStatus = returnStatus;
  if (returnReason) order.returnReason = returnReason;

  // Handle Stripe Refund if transitioning to Refund Processing
  if (returnStatus === 'Refund Processing' && order.paymentMethod === 'stripe') {
    try {
      let paymentIntentId = order.stripePaymentIntentId;
      
      if (!paymentIntentId && order.stripeSessionId) {
        // Fetch from Stripe if not stored
        const stripeSession = await stripe.checkout.sessions.retrieve(order.stripeSessionId);
        paymentIntentId = stripeSession.payment_intent;
      }

      if (paymentIntentId) {
        await stripe.refunds.create({ payment_intent: paymentIntentId });
        order.returnStatus = 'Refund Processed'; // Auto transition on success
      } else {
        order.returnStatus = 'Refund Failed';
        order.returnReason = 'Missing Payment Intent ID for Refund';
      }
    } catch (stripeError) {
      console.error('Stripe Refund Error:', stripeError);
      order.returnStatus = 'Refund Failed';
      order.returnReason = stripeError.message;
    }
  }

  order.statusHistory.push({
    fromStatus: current,
    toStatus: order.returnStatus,
    changedBy: req.user.id,
    changedAt: new Date(),
    note: `Return status updated to ${order.returnStatus}`
  });

  await order.save();
  res.status(200).json({ success: true, message: `Return status updated to ${order.returnStatus}`, data: order });
});

// Generate Invoice Number (Idempotent)
exports.generateInvoiceNumber = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) {
    const error = new Error('Order not found');
    error.status = 404;
    throw error;
  }

  if (order.invoiceNumber) {
    return res.status(200).json({ success: true, message: 'Invoice already generated', data: order });
  }

  const last8 = order._id.toString().slice(-8).toUpperCase();
  const invoiceNumber = `INV-${last8}`;

  order.invoiceNumber = invoiceNumber;
  order.invoiceGeneratedAt = new Date();
  await order.save();

  res.status(200).json({ success: true, message: 'Invoice generated successfully', data: order });
});

// Download Invoice PDF
exports.downloadInvoice = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id).populate('user', 'username email mobile');
  
  if (!order) {
    const error = new Error('Order not found');
    error.status = 404;
    throw error;
  }
  
  if (!order.invoiceNumber) {
    const error = new Error('Invoice not generated for this order yet');
    error.status = 400;
    throw error;
  }

  const doc = new PDFDocument({ margin: 50 });
  
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=Invoice-${order.invoiceNumber}.pdf`);
  
  doc.pipe(res);

  // Header
  doc.fontSize(20).text('AURA', { align: 'right' });
  doc.fontSize(10).text('CRAFTED FOR TIMELESS ELEGANCE', { align: 'right' });
  doc.moveDown();
  
  doc.fontSize(20).text('TAX INVOICE', { align: 'left' });
  doc.moveDown();

  // Invoice Info
  const formattedOrderId = `#${order._id.toString().slice(-8).toUpperCase()}`;
  doc.fontSize(10).text(`Invoice Number: ${order.invoiceNumber}`);
  doc.text(`Invoice Date: ${new Date(order.invoiceGeneratedAt).toLocaleDateString()}`);
  doc.text(`Order ID: ${formattedOrderId}`);
  doc.text(`Order Date: ${new Date(order.createdAt).toLocaleDateString()}`);
  doc.text(`Payment Method: ${order.paymentMethod.toUpperCase()}`);
  doc.text(`Payment Status: ${order.paymentStatus.toUpperCase()}`);
  doc.moveDown();

  // Addresses
  const yPos = doc.y;
  doc.text('Billed To:', 50, yPos);
  doc.text(order.user ? order.user.username : 'Guest', 50, yPos + 15);
  if (order.user) doc.text(order.user.email, 50, yPos + 30);
  
  doc.text('Shipped To:', 300, yPos);
  const addr = order.shippingAddress;
  doc.text(addr.fullName, 300, yPos + 15);
  doc.text(`${addr.street}`, 300, yPos + 30);
  doc.text(`${addr.city}, ${addr.state} - ${addr.pincode}`, 300, yPos + 45);
  doc.text(`Phone: ${addr.mobile}`, 300, yPos + 60);
  
  doc.moveDown(5);

  // Table Header
  const tableTop = doc.y;
  doc.font('Helvetica-Bold');
  doc.text('Item', 50, tableTop);
  doc.text('Qty', 300, tableTop);
  doc.text('Unit Price', 380, tableTop);
  doc.text('Total', 480, tableTop);
  doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke();
  
  doc.font('Helvetica');
  let itemY = tableTop + 25;

  let subtotal = 0;
  
  for (const item of order.items) {
    const product = await Product.findById(item.productId);
    const title = product ? product.title : 'Deleted Product';
    const itemTotal = item.quantity * item.price;
    subtotal += itemTotal;

    doc.text(title, 50, itemY, { width: 240 });
    doc.text(item.quantity.toString(), 300, itemY);
    doc.text(`Rs. ${item.price.toLocaleString()}`, 380, itemY);
    doc.text(`Rs. ${itemTotal.toLocaleString()}`, 480, itemY);
    
    itemY += 20;
  }

  doc.moveTo(50, itemY).lineTo(550, itemY).stroke();
  itemY += 15;

  // Totals
  const shippingCharge = subtotal > 499 ? 0 : 49; // Simple assumption based on existing logic
  const grandTotal = order.totalAmount;
  
  doc.text('Subtotal:', 380, itemY);
  doc.text(`Rs. ${subtotal.toLocaleString()}`, 480, itemY);
  itemY += 20;
  
  doc.text('Shipping:', 380, itemY);
  doc.text(`Rs. ${shippingCharge.toLocaleString()}`, 480, itemY);
  itemY += 20;
  
  doc.font('Helvetica-Bold');
  doc.text('Grand Total:', 380, itemY);
  doc.text(`Rs. ${grandTotal.toLocaleString()}`, 480, itemY);

  // Footer
  doc.moveDown(4);
  doc.font('Helvetica').fontSize(10).text('Thank you for shopping with AURA!', { align: 'center' });

  doc.end();
});
