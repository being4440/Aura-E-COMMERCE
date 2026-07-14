const User = require('../models/User');
const Product = require('../models/Product');
const Order = require('../models/Order');

const asyncHandler = require("../middleware/asyncHandler");

// Simple in-memory cache
// Note: In-memory cache is scoped to this single Render instance. 
// Revisit if the backend scales horizontally (e.g., use Redis instead).
let dashboardCache = null;
let cacheTime = null;
const CACHE_DURATION = 60000; // 60 seconds

exports.getStats = asyncHandler(async (req, res) => {
  if (dashboardCache && cacheTime && (Date.now() - cacheTime < CACHE_DURATION)) {
    return res.status(200).json({ success: true, data: dashboardCache });
  }

  // Run aggregations in parallel
  const [
    totalUsers,
    totalProducts,
    outOfStockProducts,
    totalOrders,
    pendingOrders,
    deliveredOrders,
    revenueResult
  ] = await Promise.all([
    User.countDocuments({ isDeleted: { $ne: true } }),
    Product.countDocuments({ isActive: true }),
    Product.countDocuments({ stock: 0 }),
    Order.countDocuments(),
    Order.countDocuments({ status: 'pending' }),
    Order.countDocuments({ status: 'delivered' }),
    Order.aggregate([
      { $match: { paymentStatus: { $in: ['paid', 'completed'] } } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ])
  ]);

  const totalRevenue = revenueResult.length > 0 ? revenueResult[0].total : 0;

  dashboardCache = {
    totalUsers,
    totalProducts,
    outOfStockProducts,
    totalOrders,
    pendingOrders,
    deliveredOrders,
    totalRevenue
  };
  cacheTime = Date.now();

  res.status(200).json({
    success: true,
    data: dashboardCache
  });
});

exports.getRecentOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find()
    .sort({ createdAt: -1 })
    .limit(10)
    .populate('user', 'username email');

  res.status(200).json({
    success: true,
    data: orders
  });
});

exports.getTopProducts = asyncHandler(async (req, res) => {
  const topProducts = await Order.aggregate([
    // Unwind items array so each product is a separate document
    { $unwind: '$items' },
    // Group by product ID and sum quantities
    { 
      $group: { 
        _id: '$items.productId', 
        unitsSold: { $sum: '$items.quantity' } 
      } 
    },
    // Sort descending by units sold
    { $sort: { unitsSold: -1 } },
    // Limit to top 5
    { $limit: 5 },
    // Lookup product details
    {
      $lookup: {
        from: 'products',
        localField: '_id',
        foreignField: '_id',
        as: 'product'
      }
    },
    // Unwind the product array from lookup
    { $unwind: '$product' },
    // Project only what we need
    {
      $project: {
        _id: 1,
        unitsSold: 1,
        'product.title': 1,
        'product.images': 1,
        'product.price': 1,
        'product.sizes': 1,
        'product.colors': 1
      }
    }
  ]);

  res.status(200).json({
    success: true,
    data: topProducts
  });
});
