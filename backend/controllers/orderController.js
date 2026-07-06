const Order = require('../models/Order');
const Product = require('../models/Product');
const Cart = require('../models/Cart');
const mongoose = require('mongoose');

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
      status: 'processing',
      statusTimeline: [{
        status: 'processing',
        timestamp: new Date(),
        message: 'Order placed successfully'
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
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid order ID' });
    }
    const order = await Order.findById(req.params.id).populate('items.productId', 'title images');
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
