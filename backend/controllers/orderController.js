const Order = require('../models/Order');
const Product = require('../models/Product');
const Cart = require('../models/Cart');
const mongoose = require('mongoose');
const PDFDocument = require('pdfkit');

exports.createOrder = async (req, res) => {
  try {
    const { items, shippingAddress, paymentInfo } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ success: false, message: 'No items in order' });
    }
    
    if (!shippingAddress || Object.keys(shippingAddress).length === 0) {
      return res.status(400).json({ success: false, message: 'shippingAddress is empty or missing. req.body was: ' + JSON.stringify(req.body) });
    }

    const userCart = await Cart.findOne({ user: req.user.id });
    if (!userCart || userCart.items.length === 0) {
      return res.status(400).json({ success: false, message: 'Cannot place order with an empty cart' });
    }

    let calculatedTotalAmount = 0;
    const validatedItems = [];

    // Step 1 — Verify all items still in stock and calculate total securely
    for (const item of items) {
      if (!item.quantity || item.quantity <= 0) {
        return res.status(400).json({ success: false, message: 'Invalid quantity' });
      }

      if (!mongoose.Types.ObjectId.isValid(item.productId)) {
        return res.status(400).json({ success: false, message: `Invalid product ID: ${item.productId}` });
      }

      const product = await Product.findById(item.productId);
      if (!product || !product.isActive) {
        return res.status(404).json({ success: false, message: 'Product not found or is inactive' });
      }
      if (product.stock < item.quantity) {
        return res.status(400).json({ 
          success: false, 
          message: `${product.title} is out of stock. Only ${product.stock} available.` 
        });
      }

      const itemPrice = product.price;
      calculatedTotalAmount += itemPrice * item.quantity;
      
      validatedItems.push({
        ...item,
        price: itemPrice
      });
    }

    // Step 2 — Deduct stock atomically
    const updatedProducts = await Promise.all(validatedItems.map(item =>
      Product.findByIdAndUpdate(
        item.productId,
        {
          $inc: {
            stock: -item.quantity,
            sold: +item.quantity
          }
        },
        {
          new: true,
          runValidators: true // prevents stock going below 0
        }
      )
    ));

    // Map updated stock for response
    const stockMap = {};
    updatedProducts.forEach(p => stockMap[p._id.toString()] = p.stock);

    const orderItems = validatedItems.map(item => ({
      ...item,
      updatedStock: stockMap[item.productId]
    }));

    // Step 3 — Clear the cart
    await Cart.findOneAndUpdate(
      { user: req.user.id },
      { $set: { items: [] } }
    );

    // Step 4 — Determine payment status
    // Online payments are considered completed immediately;
    // Cash on Delivery remains pending until physical collection.
    const ONLINE_PAYMENT_METHODS = ['credit card', 'debit card', 'upi', 'net banking'];
    const paymentStatusResolved = ONLINE_PAYMENT_METHODS.includes(
      (paymentInfo || '').toLowerCase()
    ) ? 'completed' : 'pending';

    // Step 5 — Create the order document
    const newOrder = new Order({
      user: req.user.id,
      items: orderItems,
      shippingAddress,
      paymentInfo,
      paymentStatus: paymentStatusResolved,
      totalAmount: calculatedTotalAmount,
      status: 'pending',
      statusTimeline: [{
        status: 'pending',
        timestamp: new Date(),
        message: 'Order placed successfully'
      }],
      statusHistory: [{
        fromStatus: null,
        toStatus: 'pending',
        changedBy: null,
        changedAt: new Date(),
        note: 'Order Created'
      }]
    });

    const savedOrder = await newOrder.save();

    // Step 5 — Return order with updatedStock
    res.status(201).json({
      success: true,
      message: 'Order placed successfully',
      data: savedOrder
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

exports.cancelOrder = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid order ID' });
    }
    const order = await Order.findById(req.params.id);
    
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (order.user.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized to cancel this order' });
    }

    if (order.status === 'delivered') {
      return res.status(400).json({ success: false, message: 'Cannot cancel delivered order' });
    }

    if (order.status === 'cancelled') {
      return res.status(400).json({ success: false, message: 'Order is already cancelled' });
    }

    // Restore stock for each item
    await Promise.all(order.items.map(item =>
      Product.findByIdAndUpdate(
        item.productId,
        { $inc: { stock: +item.quantity, sold: -item.quantity } }
      )
    ));

    // Update order status
    order.status = 'cancelled';
    if (!order.statusTimeline) order.statusTimeline = [];
    order.statusTimeline.push({
      status: 'cancelled',
      timestamp: new Date(),
      message: 'Order cancelled by user'
    });
    const updatedOrder = await order.save({ validateModifiedOnly: true });

    res.status(200).json({
      success: true,
      message: 'Order cancelled successfully',
      data: updatedOrder
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getOrders = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user.id })
      .populate('items.productId', 'title images')
      .sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: orders });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getOrderById = async (req, res) => {
  try {
    const isValidObjectId = mongoose.Types.ObjectId.isValid(req.params.id);
    let order;
    
    if (isValidObjectId) {
      order = await Order.findById(req.params.id).populate('items.productId', 'title images');
    } else {
      // If not a valid ObjectId, assume it might be a Stripe session ID
      order = await Order.findOne({ stripeSessionId: req.params.id }).populate('items.productId', 'title images');
    }
    
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    
    if (order.user.toString() !== req.user.id) {
      return res.status(401).json({ success: false, message: 'Not authorized to view this order' });
    }

    res.status(200).json({ success: true, data: order });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Download Invoice PDF for User
exports.downloadInvoice = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate('user', 'username email mobile');
    
    if (!order) return res.status(404).send('Order not found');
    
    // Authorization check: User can only download their own invoice
    if (order.user._id.toString() !== req.user.id) {
      return res.status(403).send('Access denied. You do not own this order.');
    }

    if (!order.invoiceNumber) {
      const currentYear = new Date().getFullYear();
      const Counter = require('../models/Counter');
      const counter = await Counter.findByIdAndUpdate(
        { _id: `invoice_${currentYear}` },
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
      );
      const seqString = counter.seq.toString().padStart(6, '0');
      order.invoiceNumber = `INV-${currentYear}-${seqString}`;
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

  } catch (error) {
    console.error('Invoice Generation Error:', error);
    res.status(500).send('Error generating invoice');
  }
};
