const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');
const Counter = require('../models/Counter');
const mongoose = require('mongoose');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const PDFDocument = require('pdfkit');

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
exports.getAllOrders = async (req, res) => {
  try {
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
      const searchRegex = new RegExp(search, 'i');
      const searchConditions = [
        { 'shippingAddress.fullName': searchRegex }
      ];

      if (mongoose.Types.ObjectId.isValid(search)) {
        searchConditions.push({ _id: search });
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

  } catch (error) {
    console.error('Error fetching admin orders:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get Order Details
exports.getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('user', 'username email mobile')
      .populate('items.productId', 'title images brand category price')
      .populate('statusHistory.changedBy', 'username');

    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    res.status(200).json({ success: true, data: order });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update Order Status
exports.updateOrderStatus = async (req, res) => {
  try {
    const { status, note } = req.body;
    const orderId = req.params.id;

    if (!status) return res.status(400).json({ success: false, message: 'Status is required' });

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    const currentStatus = order.status;
    const allowedTransitions = STATUS_FLOW[currentStatus] || [];

    if (!allowedTransitions.includes(status)) {
      return res.status(400).json({ 
        success: false, 
        message: `Invalid status transition from ${currentStatus} to ${status}` 
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

    res.status(200).json({ success: true, message: `Order status updated to ${status}`, data: order });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Cancel Order (Transaction)
exports.cancelOrder = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { cancelReason } = req.body;
    const orderId = req.params.id;

    const order = await Order.findById(orderId).session(session);
    if (!order) throw new Error('Order not found');

    // 409 Conflict Validations
    if (order.status === 'cancelled') {
      throw { status: 409, message: 'Order is already cancelled' };
    }
    if (order.status === 'delivered') {
      throw { status: 409, message: 'Cannot cancel a delivered order' };
    }
    if (['Return Requested', 'Approved', 'Refund Processing', 'Refund Processed'].includes(order.returnStatus)) {
      throw { status: 409, message: 'Cannot cancel an order in the return/refund flow' };
    }

    const currentStatus = order.status;
    const allowedTransitions = STATUS_FLOW[currentStatus] || [];
    if (!allowedTransitions.includes('cancelled')) {
      throw { status: 400, message: `Cannot cancel order from status: ${currentStatus}` };
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

    res.status(200).json({ success: true, message: 'Order cancelled successfully', data: order });
  } catch (error) {
    await session.abortTransaction();
    const status = error.status || 500;
    res.status(status).json({ success: false, message: error.message });
  } finally {
    session.endSession();
  }
};

// Process Return Flow
exports.processReturn = async (req, res) => {
  try {
    const { returnStatus, returnReason } = req.body;
    const orderId = req.params.id;

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

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
      return res.status(400).json({ 
        success: false, 
        message: `Invalid return transition from ${current} to ${returnStatus}` 
      });
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

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Generate Invoice Number (Idempotent)
exports.generateInvoiceNumber = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    if (order.invoiceNumber) {
      return res.status(200).json({ success: true, message: 'Invoice already generated', data: order });
    }

    const currentYear = new Date().getFullYear();
    const counter = await Counter.findByIdAndUpdate(
      { _id: `invoice_${currentYear}` },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );

    const seqString = counter.seq.toString().padStart(6, '0');
    const invoiceNumber = `INV-${currentYear}-${seqString}`;

    order.invoiceNumber = invoiceNumber;
    order.invoiceGeneratedAt = new Date();
    await order.save();

    res.status(200).json({ success: true, message: 'Invoice generated successfully', data: order });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Download Invoice PDF
exports.downloadInvoice = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate('user', 'username email mobile');
    if (!order) return res.status(404).send('Order not found');
    if (!order.invoiceNumber) return res.status(400).send('Invoice not generated for this order yet');

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
    doc.fontSize(10).text(`Invoice Number: ${order.invoiceNumber}`);
    doc.text(`Invoice Date: ${new Date(order.invoiceGeneratedAt).toLocaleDateString()}`);
    doc.text(`Order ID: ${order._id}`);
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

  } catch (error) {
    console.error('Invoice Generation Error:', error);
    res.status(500).send('Error generating invoice');
  }
};
