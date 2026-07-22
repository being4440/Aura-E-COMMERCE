const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Order = require('../models/Order');
const Product = require('../models/Product');
const Cart = require('../models/Cart');
const mongoose = require('mongoose');
const asyncHandler = require('../middleware/asyncHandler');

exports.createCheckoutSession = asyncHandler(async (req, res) => {
  const { shippingAddress } = req.body;

  if (!shippingAddress || Object.keys(shippingAddress).length === 0) {
    const error = new Error('shippingAddress is empty or missing.');
    error.status = 400;
    throw error;
  }

  const userCart = await Cart.findOne({ user: req.user.id });
  if (!userCart || userCart.items.length === 0) {
    const error = new Error('Cannot place order with an empty cart');
    error.status = 400;
    throw error;
  }

  let calculatedTotalAmount = 0;
  const line_items = [];
  const validatedItems = [];

  // Verify stock and prepare line items
  for (const item of userCart.items) {
    if (!item.quantity || item.quantity <= 0) continue;
    
    const product = await Product.findById(item.product);
    if (!product || !product.isActive) {
      const error = new Error(`Product ${item.product} not found or is inactive`);
      error.status = 404;
      throw error;
    }
    if (product.stock < item.quantity) {
      const error = new Error(`${product.title} is out of stock. Only ${product.stock} available.`);
      error.status = 400;
      throw error;
    }

    const itemPrice = product.price;
    calculatedTotalAmount += itemPrice * item.quantity;
    
    validatedItems.push({
      productId: product._id.toString(),
      quantity: item.quantity,
      price: itemPrice
    });

    line_items.push({
      price_data: {
        currency: 'inr',
        product_data: {
          name: product.title,
          images: product.images && product.images.length > 0 ? [product.images[0].url] : [],
        },
        unit_amount: itemPrice * 100, // Stripe expects amounts in cents/paise
      },
      quantity: item.quantity,
    });
  }

  if (validatedItems.length === 0) {
    const error = new Error('No valid items in cart');
    error.status = 400;
    throw error;
  }

  // Calculate shipping (matching frontend logic: free if total > 499)
  const shipping = calculatedTotalAmount > 499 ? 0 : 49;
  if (shipping > 0) {
    line_items.push({
      price_data: {
        currency: 'inr',
        product_data: { name: 'Shipping Charge' },
        unit_amount: shipping * 100,
      },
      quantity: 1,
    });
    calculatedTotalAmount += shipping;
  }

  // 1. Create Pending Order in database
  const pendingOrder = new Order({
    user: req.user.id,
    items: validatedItems,
    shippingAddress,
    paymentInfo: 'Stripe',
    paymentMethod: 'stripe',
    paymentStatus: 'pending',
    totalAmount: calculatedTotalAmount,
    status: 'pending',
    statusTimeline: [{
      status: 'pending',
      timestamp: new Date(),
      message: 'Order initiated via Stripe'
    }],
    statusHistory: [{
      fromStatus: null,
      toStatus: 'pending',
      changedBy: null,
      changedAt: new Date(),
      note: 'Order Initiated via Stripe'
    }]
  });

  await pendingOrder.save();

  // 2. Create Stripe session with orderId in metadata (avoids 500-char limit)
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items,
    mode: 'payment',
    success_url: `${process.env.FRONTEND_URL}/order-confirmation/{CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.FRONTEND_URL}/checkout`,
    metadata: {
      orderId: pendingOrder._id.toString(),
      userId: req.user.id.toString()
    }
  });

  // Attach stripeSessionId to pending order
  pendingOrder.stripeSessionId = session.id;
  await pendingOrder.save();

  res.status(200).json({
    success: true,
    id: session.id,
    url: session.url,
    orderId: pendingOrder._id
  });
});

exports.webhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature verification failed.', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    
    try {
      const orderId = session.metadata?.orderId;
      let order;

      if (orderId) {
        order = await Order.findById(orderId);
      } else {
        order = await Order.findOne({ stripeSessionId: session.id });
      }

      if (!order) {
        console.error(`Order not found for session ${session.id}`);
        return res.status(404).json({ error: 'Order not found' });
      }

      if (order.paymentStatus === 'paid') {
        console.log(`Order ${order._id} already marked as paid. Skipping.`);
        return res.status(200).json({ received: true });
      }

      // Deduct stock atomically
      for (const item of order.items) {
        const updatedProduct = await Product.findOneAndUpdate(
          { _id: item.productId, stock: { $gte: item.quantity } },
          {
            $inc: {
              stock: -item.quantity,
              sold: +item.quantity
            }
          },
          { new: true }
        );

        if (updatedProduct) {
          item.updatedStock = updatedProduct.stock;
        } else {
          console.error(`Failed to deduct stock for product ${item.productId}. Possible oversell.`);
        }
      }

      // Update Order Status
      order.paymentStatus = 'paid';
      order.status = 'processing';
      order.stripePaymentIntentId = session.payment_intent;
      order.statusTimeline.push({
        status: 'processing',
        timestamp: new Date(),
        message: 'Payment confirmed via Stripe Webhook'
      });
      order.statusHistory.push({
        fromStatus: 'pending',
        toStatus: 'processing',
        changedBy: null,
        changedAt: new Date(),
        note: 'Payment Confirmed via Stripe Webhook'
      });

      await order.save();

      // Clear the user's cart
      if (order.user) {
        await Cart.findOneAndUpdate(
          { user: order.user },
          { $set: { items: [] } }
        );
      }

      console.log(`Order ${order._id} marked as paid successfully for session ${session.id}`);

    } catch (error) {
      console.error('Error processing successful checkout session:', error);
      return res.status(500).json({ error: 'Failed to process order' });
    }
  }

  res.status(200).json({ received: true });
};
