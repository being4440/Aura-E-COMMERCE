const Order = require('../models/Order');
const Product = require('../models/Product');
const Cart = require('../models/Cart');
const mongoose = require('mongoose');
const PDFDocument = require('pdfkit');
const asyncHandler = require('../middleware/asyncHandler');

// @desc    Create new order (COD or pre-paid verification can happen later)
// @route   POST /api/orders
// @access  Private
exports.placeOrder = asyncHandler(async (req, res) => {
  const { items, shippingAddress, paymentInfo } = req.body;

  if (!items || items.length === 0) {
    const error = new Error('No items in order');
    error.status = 400;
    throw error;
  }

  if (!shippingAddress || Object.keys(shippingAddress).length === 0) {
    const error = new Error('shippingAddress is empty or missing. req.body was: ' + JSON.stringify(req.body));
    error.status = 400;
    throw error;
  }

  const userCart = await Cart.findOne({ user: req.user.id });
  if (!userCart || userCart.items.length === 0) {
    const error = new Error('Cannot place order with an empty cart');
    error.status = 400;
    throw error;
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    let calculatedTotalAmount = 0;
    // Step 1 - Verify all items still in stock and calculate total securely
    for (const item of items) {
      if (!item.quantity || item.quantity <= 0) {
        throw new Error('Invalid quantity');
      }

      if (!mongoose.Types.ObjectId.isValid(item.productId)) {
        throw new Error(`Invalid product ID: ${item.productId}`);
      }

      const product = await Product.findById(item.productId).session(session);
      if (!product || !product.isActive) {
        throw new Error('Product not found or is inactive');
      }
      if (product.stock < item.quantity) {
        throw new Error(`${product.title} is out of stock. Only ${product.stock} available.`);
      }

      calculatedTotalAmount += product.price * item.quantity;
    }

    // Calculate Shipping (assuming simple rule: > 499 is free, else 49)
    const shippingCharge = calculatedTotalAmount > 499 ? 0 : 49;
    calculatedTotalAmount += shippingCharge;

    // Step 2 - Reduce Stock atomically
    for (const item of items) {
      const updatedProduct = await Product.findOneAndUpdate(
        { _id: item.productId, stock: { $gte: item.quantity } },
        {
          $inc: {
            stock: -item.quantity,
            sold: +item.quantity
          }
        },
        { new: true, session }
      );

      if (!updatedProduct) {
        throw new Error(`Failed to place order. Product ${item.productId} went out of stock during checkout.`);
      }
    }

    // Step 3 - Clear user cart
    await Cart.findOneAndUpdate(
      { user: req.user.id },
      { $set: { items: [] } },
      { session }
    );

    const isPaid = paymentInfo;
    const initialStatus = 'confirmed';

    // Step 4 - Create Order Object
    const newOrder = new Order({
      user: req.user.id,
      items,
      shippingAddress,
      paymentInfo,
      paymentMethod: paymentInfo?.method || 'cod',
      paymentStatus: 'pending',
      totalAmount: calculatedTotalAmount,
      status: initialStatus,
      statusTimeline: [{
        status: initialStatus,
        timestamp: new Date(),
        message: isPaid ? 'Order placed and payment confirmed' : 'Order placed successfully'
      }],
      statusHistory: [{
        fromStatus: null,
        toStatus: initialStatus,
        changedBy: null,
        changedAt: new Date(),
        note: isPaid ? 'Order Created & Payment Confirmed' : 'Order Created'
      }]
    });

    const last8 = newOrder._id.toString().slice(-8).toUpperCase();
    newOrder.invoiceNumber = `INV-${last8}`;
    newOrder.invoiceGeneratedAt = new Date();

    const savedOrder = await newOrder.save({ session });

    await session.commitTransaction();
    session.endSession();

    // Step 5 - Return order with updatedStock
    res.status(201).json({
      success: true,
      message: 'Order placed successfully',
      data: savedOrder
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    if (!error.status) error.status = 500;
    throw error;
  }
});

exports.cancelOrder = asyncHandler(async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    const error = new Error('Invalid order ID');
    error.status = 400;
    throw error;
  }
  // Initial read for specific error messaging
  const initialOrder = await Order.findById(req.params.id);

  if (!initialOrder) {
    const error = new Error('Order not found');
    error.status = 404;
    throw error;
  }

  if (initialOrder.user.toString() !== req.user.id) {
    const error = new Error('Not authorized to cancel this order');
    error.status = 403;
    throw error;
  }

  if (initialOrder.status === 'delivered') {
    const error = new Error('Cannot cancel delivered order');
    error.status = 400;
    throw error;
  }

  if (initialOrder.status === 'cancelled') {
    const error = new Error('Order is already cancelled');
    error.status = 400;
    throw error;
  }

  const session = await mongoose.startSession();
  let updatedOrder;

  try {
    await session.withTransaction(async () => {
      // Atomic transition to prevent race conditions during cancellation
      updatedOrder = await Order.findOneAndUpdate(
        {
          _id: req.params.id,
          status: { $nin: ['cancelled', 'delivered'] }
        },
        {
          $set: { status: 'cancelled' },
          $push: {
            statusTimeline: {
              status: 'cancelled',
              timestamp: new Date(),
              message: 'Order cancelled by user'
            }
          }
        },
        { new: true, session }
      );

      if (!updatedOrder) {
        const error = new Error('Failed to cancel order (it may have been modified concurrently)');
        error.status = 409;
        throw error;
      }

      // Restore stock for each item
      await Promise.all(updatedOrder.items.map(item =>
        Product.findByIdAndUpdate(
          item.productId,
          { $inc: { stock: +item.quantity, sold: -item.quantity } },
          { session }
        )
      ));
    });
  } finally {
    session.endSession();
  }

  res.status(200).json({
    success: true,
    message: 'Order cancelled successfully',
    data: updatedOrder
  });
});

exports.getOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({ user: req.user.id })
    .populate('items.productId', 'title images')
    .sort({ createdAt: -1 });
  res.status(200).json({ success: true, data: orders });
});

exports.getOrderById = asyncHandler(async (req, res) => {
  const isValidObjectId = mongoose.Types.ObjectId.isValid(req.params.id);
  let order;

  if (isValidObjectId) {
    order = await Order.findById(req.params.id).populate('items.productId', 'title images');
  } else {
    // If not a valid ObjectId, assume it might be a Stripe session ID
    order = await Order.findOne({ stripeSessionId: req.params.id }).populate('items.productId', 'title images');
  }

  if (!order) {
    const error = new Error('Order not found');
    error.status = 404;
    throw error;
  }

  if (order.user.toString() !== req.user.id) {
    const error = new Error('Not authorized to view this order');
    error.status = 401;
    throw error;
  }

  res.status(200).json({ success: true, data: order });
});

// Download Invoice PDF for User
exports.downloadInvoice = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id)
    .populate('user', 'username email mobile')
    .populate('items.productId', 'title');

  if (!order) {
    const error = new Error('Order not found');
    error.status = 404;
    throw error;
  }

  // Authorization check: User can only download their own invoice
  if (order.user._id.toString() !== req.user.id) {
    const error = new Error('Access denied. You do not own this order.');
    error.status = 403;
    throw error;
  }

  if (!order.invoiceNumber) {
    const last8 = order._id.toString().slice(-8).toUpperCase();
    order.invoiceNumber = `INV-${last8}`;
    order.invoiceGeneratedAt = new Date();
    await order.save();
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
    const title = item.productId ? item.productId.title : 'Deleted Product';
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
  const shippingCharge = subtotal > 499 ? 0 : 49;
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
