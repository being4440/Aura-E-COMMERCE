const User = require('../models/User');
const Product = require('../models/Product');
const Order = require('../models/Order');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const { uploadImage } = require('../utils/cloudinary');

// Escape special regex characters to prevent ReDoS
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Wrapper for async errors
const catchAsync = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

exports.adminLogin = catchAsync(async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username });

  if (!user) {
    return res.status(401).json({ success: false, message: 'Invalid credentials' });
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    return res.status(401).json({ success: false, message: 'Invalid credentials' });
  }

  if (user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Not an admin account' });
  }

  const payload = { user: { id: user._id, role: user.role } };
  const accessToken = jwt.sign(payload, process.env.JWT_SECRET || 'ecommerce_secret_jwt_key_2026_gauri_webdev', { expiresIn: '24h' });
  const refreshToken = jwt.sign(payload, process.env.REFRESH_TOKEN_SECRET || '851be0b7c07616d77b83d8422accd3197bc15b603238b87d82087b27258544ec61c0c73f525e', { expiresIn: '7d' });

  // Wait, User model may not have refreshTokens field defined yet.
  // Assuming it does, or we just save it.
  if (!user.refreshTokens) user.refreshTokens = [];
  user.refreshTokens.push(refreshToken);
  await user.save({ validateBeforeSave: false });

  res.cookie('jwt', refreshToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'None', maxAge: 7 * 24 * 60 * 60 * 1000 });

  res.status(200).json({
    success: true,
    message: 'Admin login successful',
    data: {
      user: { id: user._id, username: user.username, email: user.email, role: 'admin' },
      accessToken
    }
  });
});

exports.getStats = catchAsync(async (req, res) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const totalOrders = await Order.countDocuments();
  const ordersToday = await Order.countDocuments({ createdAt: { $gte: today } });
  
  const totalCustomers = await User.countDocuments({ role: 'user' });
  const newCustomersToday = await User.countDocuments({ role: 'user', createdAt: { $gte: today } });
  
  const lowStockProducts = await Product.find({ stock: { $lt: 10 } }).limit(10);
  
  const recentOrders = await Order.find().sort({ createdAt: -1 }).limit(5).populate('user', 'username email');

  const revenueResult = await Order.aggregate([
    { $match: { paymentStatus: 'completed' } },
    { $group: { _id: null, totalRevenue: { $sum: '$totalAmount' } } }
  ]);
  const totalRevenue = revenueResult.length > 0 ? revenueResult[0].totalRevenue : 0;

  res.status(200).json({
    success: true,
    data: {
      totalRevenue,
      totalOrders,
      ordersToday,
      totalCustomers,
      newCustomersToday,
      lowStockProducts,
      recentOrders
    }
  });
});

exports.getAllUsers = catchAsync(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const query = { role: 'user' };
  if (req.query.search) {
    const safe = escapeRegex(req.query.search.substring(0, 100));
    query.$or = [
      { username: { $regex: safe, $options: 'i' } },
      { email: { $regex: safe, $options: 'i' } }
    ];
  }

  const users = await User.find(query).skip(skip).limit(limit).select('-password');
  const total = await User.countDocuments(query);

  res.status(200).json({
    success: true,
    data: {
      users,
      pagination: { total, page, pages: Math.ceil(total / limit) }
    }
  });
});

exports.updateUser = catchAsync(async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ success: false, message: 'Invalid user ID' });
  }
  const { isActive } = req.body;
  const user = await User.findByIdAndUpdate(req.params.id, { isActive }, { new: true }).select('-password');
  
  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }

  res.status(200).json({ success: true, data: user });
});

exports.getAdminProducts = catchAsync(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;

  // NO isActive filter (show all including inactive)
  const query = {};
  if (req.query.search) {
    const safe = escapeRegex(req.query.search.substring(0, 100));
    query.$or = [
      { title: { $regex: safe, $options: 'i' } },
      { brand: { $regex: safe, $options: 'i' } },
      { category: { $regex: safe, $options: 'i' } }
    ];
  }

  // Sort by stock (asc for low stock first) if requested, else newest
  let sortObj = { createdAt: -1 };
  if (req.query.sort === 'stock_asc') sortObj = { stock: 1 };

  const products = await Product.find(query).sort(sortObj).skip(skip).limit(limit).lean();
  const total = await Product.countDocuments(query);

  // Add stockStatus to each product
  const productsWithStatus = products.map(product => {
    let stockStatus = 'in_stock';
    if (product.stock === 0) stockStatus = 'out_of_stock';
    else if (product.stock < 10) stockStatus = 'low_stock';
    
    return { ...product, stockStatus };
  });

  res.status(200).json({
    success: true,
    data: {
      products: productsWithStatus,
      pagination: { total, page, pages: Math.ceil(total / limit) }
    }
  });
});

exports.addProduct = catchAsync(async (req, res) => {
  const { title, description, brand, category, price, sizes, colors, stock, images, isFeatured, isActive } = req.body;
  
  if (Number(stock) < 0) {
    return res.status(400).json({ success: false, message: 'Stock cannot be negative' });
  }

  const imageUrls = [];
  if (req.files && req.files.length > 0) {
    for (const file of req.files) {
      const url = await uploadImage(file.buffer, file.mimetype, 'ecommerce/products');
      imageUrls.push(url);
    }
  }

  const parsedSizes = typeof sizes === 'string' ? sizes.split(',').map(s => s.trim()).filter(Boolean) : sizes;
  const parsedColors = typeof colors === 'string' ? colors.split(',').map(s => s.trim()).filter(Boolean) : colors;

  const productData = {
    title, description, brand, category, price: Number(price),
    sizes: parsedSizes, colors: parsedColors, stock: Number(stock),
    featured: isFeatured === 'true' || isFeatured === true,
    isActive: isActive !== 'false' && isActive !== false
  };

  if (imageUrls.length > 0) {
    productData.images = imageUrls;
  } else if (images) {
    productData.images = Array.isArray(images) ? images : [images];
  }

  const product = await Product.create(productData);
  res.status(201).json({ success: true, message: 'Product added', data: product });
});

exports.updateProduct = catchAsync(async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ success: false, message: 'Invalid product ID' });
  }
  const product = await Product.findById(req.params.id);
  if (!product) {
    return res.status(404).json({ success: false, message: 'Product not found' });
  }

  const updates = { ...req.body };

  if (updates.stock !== undefined && Number(updates.stock) !== product.stock) {
    console.log(`Stock updated via edit: ${product.title} ${product.stock} → ${updates.stock}`);
    product.lastUpdated = Date.now();
  }

  if (req.files && req.files.length > 0) {
    const imageUrls = [];
    for (const file of req.files) {
      const url = await uploadImage(file.buffer, file.mimetype, 'ecommerce/products');
      imageUrls.push(url);
    }
    updates.images = imageUrls;
  }

  if (typeof updates.sizes === 'string') updates.sizes = updates.sizes.split(',').map(s => s.trim()).filter(Boolean);
  if (typeof updates.colors === 'string') updates.colors = updates.colors.split(',').map(s => s.trim()).filter(Boolean);

  Object.assign(product, updates);
  const updatedProduct = await product.save();

  res.status(200).json({ success: true, message: 'Product updated', data: updatedProduct });
});

exports.updateStockOnly = catchAsync(async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ success: false, message: 'Invalid product ID' });
  }
  const { stock, reason } = req.body;
  if (stock === undefined || isNaN(Number(stock)) || Number(stock) < 0 || Number(stock) > 10000) {
    return res.status(400).json({ success: false, message: 'Stock must be a number between 0 and 10000' });
  }
  const product = await Product.findById(req.params.id);
  
  if (!product) {
    return res.status(404).json({ success: false, message: 'Product not found' });
  }

  const oldStock = product.stock;
  product.stock = stock;
  product.lastUpdated = Date.now();
  
  await product.save();
  
  console.log(`Stock updated: ${product.title} ${oldStock} → ${stock} (${reason || 'adjustment'})`);
  
  res.status(200).json({ success: true, message: 'Stock updated', data: product });
});

exports.deleteProduct = catchAsync(async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ success: false, message: 'Invalid product ID' });
  }
  const { permanent } = req.body;
  
  if (permanent) {
    await Product.findByIdAndDelete(req.params.id);
    return res.status(200).json({ success: true, message: 'Product permanently deleted' });
  } else {
    // Soft delete
    const product = await Product.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    return res.status(200).json({ success: true, message: 'Product deactivated' });
  }
});

exports.getAllOrders = catchAsync(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const query = {};
  if (req.query.status && req.query.status !== 'All') {
    query.status = req.query.status;
  }

  const orders = await Order.find(query).skip(skip).limit(limit).populate('user', 'username email');
  const total = await Order.countDocuments(query);

  res.status(200).json({
    success: true,
    data: {
      orders,
      pagination: { total, page, pages: Math.ceil(total / limit) }
    }
  });
});

exports.updateOrderStatus = catchAsync(async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ success: false, message: 'Invalid order ID' });
  }
  const VALID_STATUSES = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
  const { status, message } = req.body;
  if (!status || !VALID_STATUSES.includes(status)) {
    return res.status(400).json({ success: false, message: `Status must be one of: ${VALID_STATUSES.join(', ')}` });
  }
  const order = await Order.findById(req.params.id);
  
  if (!order) {
    return res.status(404).json({ success: false, message: 'Order not found' });
  }

  order.status = status;
  if (!order.statusTimeline) order.statusTimeline = [];
  
  order.statusTimeline.push({
    status,
    timestamp: Date.now(),
    message: message || `Order status updated to ${status}`
  });

  // When delivered, mark payment as completed (handles Cash on Delivery)
  if (status === 'delivered' && order.paymentStatus !== 'completed') {
    order.paymentStatus = 'completed';
  }

  await order.save({ validateModifiedOnly: true });

  res.status(200).json({ success: true, data: order });
});
