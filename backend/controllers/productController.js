const Product = require('../models/Product');
const mongoose = require('mongoose');

const asyncHandler = require("../middleware/asyncHandler");

// @desc    Fetch all active products with filtering, sorting, and search
// @route   GET /api/products
// @access  Public
exports.getProducts = asyncHandler(async (req, res) => {
  const { category, brand, minPrice, maxPrice, size, color, search, sort, page, limit, featured, inStock } = req.query;

  // Always filter active products
  let filter = { isActive: true };

  if (category) filter.category = category;
  if (brand) filter.brand = { $regex: brand, $options: 'i' };

  if (minPrice || maxPrice) {
    filter.price = {};
    if (minPrice) filter.price.$gte = Number(minPrice);
    if (maxPrice) filter.price.$lte = Number(maxPrice);
  }

  if (size) filter.sizes = { $in: [size] };
  if (color) filter.colors = { $in: [color] };
  if (inStock === 'true') filter.stock = { $gt: 0 };
  if (featured === 'true') filter.featured = true;

  let searchString = search ? String(search).trim() : '';
  if (searchString.length > 100) {
    searchString = searchString.substring(0, 100);
  }

  if (searchString) {
    const safeSearch = searchString.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.$or = [
      { title: { $regex: safeSearch, $options: 'i' } },
      { description: { $regex: safeSearch, $options: 'i' } }
    ];
  }

  // Sort mapping
  let sortObj = { createdAt: -1 };
  switch (sort) {
    case 'newest':     sortObj = { createdAt: -1 }; break;
    case 'price_asc':  sortObj = { price: 1 }; break;
    case 'price_desc': sortObj = { price: -1 }; break;
    case 'popular':    sortObj = { sold: -1 }; break;
    default:           sortObj = { createdAt: -1 };
  }

  // Pagination
  const pageNum = Math.max(1, parseInt(page) || 1);
  let limitNum = parseInt(limit) || 12;
  if (limitNum < 1) limitNum = 1;
  if (limitNum > 100) limitNum = 100;
  const skip = (pageNum - 1) * limitNum;

  const [products, total] = await Promise.all([
    Product.find(filter)
      .sort(sortObj)
      .skip(skip)
      .limit(limitNum)
      .select('title brand category price images sizes colors stock sold rating isFeatured isActive createdAt')
      .exec(),
    Product.countDocuments(filter)
  ]);

  res.json({
    success: true,
    data: {
      products,
      pagination: {
        total,
        page: pageNum,
        pages: Math.ceil(total / limitNum),
        limit: limitNum,
        hasMore: pageNum < Math.ceil(total / limitNum)
      }
    }
  });
});

// @desc    Fetch single active product with related
// @route   GET /api/products/:id
// @access  Public
exports.getProductById = asyncHandler(async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    const error = new Error('Invalid product ID');
    error.status = 400;
    throw error;
  }
  const product = await Product.findOne({ _id: req.params.id, isActive: true });

  if (!product) {
    const error = new Error('Product not found');
    error.status = 404;
    throw error;
  }

  // Related products (same category, excluding current)
  const relatedProducts = await Product.find({
    category: product.category,
    _id: { $ne: product._id },
    isActive: true,
    stock: { $gt: 0 }
  }).limit(6);

  // Return exact stock, virtual, and isInStock result
  const productData = product.toJSON();
  productData.availableStock = product.availableStock;
  productData.isInStock = product.isInStock();

  res.json({
    success: true,
    data: {
      product: productData,
      relatedProducts
    }
  });
});

// @desc    Get featured products
// @route   GET /api/products/featured
// @access  Public
exports.getFeaturedProducts = asyncHandler(async (req, res) => {
  const products = await Product.find({ featured: true, isActive: true })
    .sort({ sold: -1 })
    .limit(8);

  res.json({ success: true, data: products });
});

// @desc    Get new arrivals
// @route   GET /api/products/new-arrivals
// @access  Public
exports.getNewArrivals = asyncHandler(async (req, res) => {
  const products = await Product.find({ isActive: true })
    .sort({ createdAt: -1 })
    .limit(12);

  res.json({ success: true, data: products });
});

// @desc    Check product stock
// @route   GET /api/products/:id/stock
// @access  Public
exports.checkProductStock = asyncHandler(async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    const error = new Error('Invalid product ID');
    error.status = 400;
    throw error;
  }
  const product = await Product.findById(req.params.id);

  if (!product || !product.isActive) {
    const error = new Error('Product not found or inactive');
    error.status = 404;
    throw error;
  }

  let message = 'In Stock';
  if (product.availableStock === 0) {
    message = 'Out of Stock';
  } else if (product.availableStock <= 5) {
    message = 'Low Stock';
  }

  res.json({
    success: true,
    data: {
      productId: product._id,
      stock: product.stock,
      availableStock: product.availableStock,
      isInStock: product.isInStock(),
      message
    }
  });
});
