const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Order = require('../models/Order');
const Product = require('../models/Product');
const Cart = require('../models/Cart');
const mongoose = require('mongoose');

exports.createCheckoutSession = async (req, res) => {
  try {
    const { shippingAddress } = req.body;

    if (!shippingAddress || Object.keys(shippingAddress).length === 0) {
      return res.status(400).json({ success: false, message: 'shippingAddress is empty or missing.' });
    }

    const userCart = await Cart.findOne({ user: req.user.id });
    if (!userCart || userCart.items.length === 0) {
      return res.status(400).json({ success: false, message: 'Cannot place order with an empty cart' });
    }

    let calculatedTotalAmount = 0;
    const line_items = [];
    const validatedItems = [];

    // Verify stock and prepare line items
    for (const item of userCart.items) {
      if (!item.quantity || item.quantity <= 0) continue;
      
      const product = await Product.findById(item.product.productId);
      if (!product || !product.isActive) {
        return res.status(404).json({ success: false, message: `Product ${item.product.productId} not found or is inactive` });
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
      return res.status(400).json({ success: false, message: 'No valid items in cart' });
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

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items,
      mode: 'payment',
      success_url: `${process.env.FRONTEND_URL}/order-confirmation/{CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/checkout`,
      metadata: {
        userId: req.user.id.toString(),
        shippingAddress: JSON.stringify(shippingAddress),
        items: JSON.stringify(validatedItems), // Storing items to reconstruct order in webhook
        totalAmount: calculatedTotalAmount.toString()
      }
    });

    res.status(200).json({
      success: true,
      id: session.id,
      url: session.url
    });

  } catch (err) {
    console.error('Stripe Session Error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

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
      // Idempotency check: see if order already exists for this session
      const existingOrder = await Order.findOne({ stripeSessionId: session.id });
      if (existingOrder) {
        console.log(`Order for session ${session.id} already exists. Skipping.`);
        return res.status(200).json({ received: true });
      }

      const userId = session.metadata.userId;
      const shippingAddress = JSON.parse(session.metadata.shippingAddress);
      const items = JSON.parse(session.metadata.items);
      const totalAmount = parseFloat(session.metadata.totalAmount);

      // Deduct stock atomically
      const orderItems = [];
      for (const item of items) {
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

        if (!updatedProduct) {
          // If stock deduction failed (oversold), we should theoretically refund, but for this exercise we log it.
          console.error(`Failed to deduct stock for product ${item.productId}. Possible oversell.`);
          // We'll still proceed to create the order to have a record, but stock wasn't deducted.
          // Ideally, we'd refund the user here.
        }

        orderItems.push({
          productId: item.productId,
          quantity: item.quantity,
          price: item.price,
          updatedStock: updatedProduct ? updatedProduct.stock : null
        });
      }

      // Create Order
      const newOrder = new Order({
        user: userId,
        items: orderItems,
        shippingAddress,
        paymentInfo: 'Stripe',
        paymentMethod: 'stripe',
        paymentStatus: 'paid',
        totalAmount,
        status: 'pending',
        stripeSessionId: session.id,
        stripePaymentIntentId: session.payment_intent,
        statusTimeline: [{
          status: 'pending',
          timestamp: new Date(),
          message: 'Order placed successfully via Stripe'
        }],
        statusHistory: [{
          fromStatus: null,
          toStatus: 'pending',
          changedBy: null,
          changedAt: new Date(),
          note: 'Order Created via Stripe'
        }]
      });

      await newOrder.save();

      // Clear the cart
      await Cart.findOneAndUpdate(
        { user: userId },
        { $set: { items: [] } }
      );

      console.log(`Order created successfully for session ${session.id}`);

    } catch (error) {
      console.error('Error processing successful checkout session:', error);
      // Return 500 so Stripe retries
      return res.status(500).json({ error: 'Failed to process order' });
    }
  }

  res.status(200).json({ received: true });
};
