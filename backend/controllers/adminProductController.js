const Product = require('../models/Product');
const Category = require('../models/Category');
const Order = require('../models/Order');
const { uploadImage, deleteImage } = require('../utils/cloudinary');
const mongoose = require('mongoose');
const auditService = require('../services/auditService');

const asyncHandler = require("../middleware/asyncHandler");

// GET Admin Products
exports.getAdminProducts = asyncHandler(async (req, res) => {
  const { 
    page = 1, 
    limit = 10, 
    search = '', 
    category, 
    stockStatus, 
    isActive,
    sortBy = 'createdAt', 
    sortOrder = 'desc' 
  } = req.query;

  const query = {};

  if (category) {
    const catDoc = await Category.findOne({ name: category });
    if (catDoc) query.category = catDoc._id;
    else query.category = null;
  }
  if (isActive !== undefined) query.isActive = isActive === 'true';

  // Stock Status Logic
  if (stockStatus === 'inStock') {
    query.stock = { $gt: 10 };
  } else if (stockStatus === 'lowStock') {
    query.stock = { $gt: 0, $lte: 10 };
  } else if (stockStatus === 'outOfStock') {
    query.stock = { $lte: 0 };
  }

  if (search) {
    query.$or = [
      { title: { $regex: search, $options: 'i' } },
      { brand: { $regex: search, $options: 'i' } }
    ];
    if (mongoose.Types.ObjectId.isValid(search)) {
      query.$or.push({ _id: search });
    }
  }

  const sortObj = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const productsRaw = await Product.find(query)
    .populate('category', 'name')
    .sort(sortObj)
    .skip(skip)
    .limit(parseInt(limit));
    
  const products = productsRaw.map(p => {
    const pObj = p.toJSON();
    if (pObj.category && typeof pObj.category === 'object') {
      pObj.category = pObj.category.name;
    }
    return pObj;
  });

  const totalProducts = await Product.countDocuments(query);

  res.status(200).json({
    success: true,
    data: products,
    pagination: {
      total: totalProducts,
      page: parseInt(page),
      pages: Math.ceil(totalProducts / limit)
    }
  });
});

// @desc    Get single product for admin (including inactive)
// @route   GET /api/admin/products/:id
// @access  Private/Admin
exports.getAdminProductById = asyncHandler(async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    const error = new Error('Invalid product ID');
    error.status = 400;
    throw error;
  }

  const productRaw = await Product.findById(req.params.id).populate('category', 'name');

  if (!productRaw) {
    const error = new Error('Product not found');
    error.status = 404;
    throw error;
  }

  const product = productRaw.toJSON();
  if (product.category && typeof product.category === 'object') {
    product.category = product.category.name;
  }

  res.status(200).json({ success: true, data: product });
});

// POST Create Product
exports.createProduct = asyncHandler(async (req, res) => {
  const { title, description, category, brand, price, stock, sizes, colors, isActive, featured } = req.body;

  let categoryId = category;
  if (category) {
    const catDoc = await Category.findOne({ name: category });
    if (catDoc) categoryId = catDoc._id;
  }

  const imageUrls = [];
  if (req.files && req.files.length > 0) {
    for (const file of req.files) {
      const url = await uploadImage(file.buffer, file.mimetype, 'ecommerce/products');
      imageUrls.push(url);
    }
  }

  const product = new Product({
    title,
    description,
    category: categoryId,
    brand,
    price: Number(price),
    stock: Number(stock),
    sizes: sizes ? (Array.isArray(sizes) ? sizes : sizes.split(',').map(s => s.trim())) : [],
    colors: colors ? (Array.isArray(colors) ? colors : colors.split(',').map(c => c.trim())) : [],
    isActive: isActive === 'true' || isActive === true,
    featured: featured === 'true' || featured === true,
    images: imageUrls
  });

  await product.save();

  await auditService.logChange({
    entityType: 'Product',
    entityId: product._id,
    action: 'CREATE',
    performedBy: req.user.id,
    changes: [
      { field: 'title', oldValue: null, newValue: product.title },
      { field: 'price', oldValue: null, newValue: product.price },
      { field: 'stock', oldValue: null, newValue: product.stock }
    ]
  });

  res.status(201).json({ success: true, data: product, message: 'Product created successfully' });
});

// PUT Update Product
exports.updateProduct = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { title, description, category, brand, price, stock, sizes, colors, isActive, featured } = req.body;

  let categoryId = category;
  if (category) {
    const catDoc = await Category.findOne({ name: category });
    if (catDoc) categoryId = catDoc._id;
  }

  const product = await Product.findById(id);
  if (!product) {
    const error = new Error('Product not found');
    error.status = 404;
    throw error;
  }

  const trackedFields = ['price', 'stock', 'title'];
  const changes = [];

  for (const field of trackedFields) {
    if (req.body[field] !== undefined && req.body[field] != product[field]) {
      changes.push({
        field,
        oldValue: product[field],
        newValue: req.body[field],
      });
    }
  }

  // Process new images if uploaded
  let imageUrls = product.images;
  if (req.files && req.files.length > 0) {
    // Delete existing images from Cloudinary before replacing
    if (product.images && product.images.length > 0) {
      await Promise.all(
        product.images.map(imgUrl => deleteImage(imgUrl))
      );
    }
    
    imageUrls = [];
    for (const file of req.files) {
      const url = await uploadImage(file.buffer, file.mimetype, 'ecommerce/products');
      imageUrls.push(url);
    }
  }

  product.title = title || product.title;
  product.description = description || product.description;
  if (categoryId) product.category = categoryId;
  product.brand = brand || product.brand;
  product.price = price !== undefined ? Number(price) : product.price;
  product.stock = stock !== undefined ? Number(stock) : product.stock;

  if (sizes) product.sizes = Array.isArray(sizes) ? sizes : sizes.split(',').map(s => s.trim());
  if (colors) product.colors = Array.isArray(colors) ? colors : colors.split(',').map(c => c.trim());

  if (isActive !== undefined) product.isActive = isActive === 'true' || isActive === true;
  if (featured !== undefined) product.featured = featured === 'true' || featured === true;

  product.images = imageUrls;
  product.lastUpdated = Date.now();

  await product.save();

  if (changes.length > 0) {
    await auditService.logChange({
      entityType: 'Product',
      entityId: product._id,
      action: 'UPDATE',
      performedBy: req.user.id,
      changes
    });
  }

  res.status(200).json({ success: true, data: product, message: 'Product updated successfully' });
});

// PATCH Quick Stock Update
exports.quickUpdateStock = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { stock } = req.body;

  if (stock === undefined || isNaN(stock)) {
    const error = new Error('Valid stock number is required');
    error.status = 400;
    throw error;
  }

  const existingProduct = await Product.findById(id);
  if (!existingProduct) {
    const error = new Error('Product not found');
    error.status = 404;
    throw error;
  }

  const oldStock = existingProduct.stock;
  const newStock = Number(stock);

  existingProduct.stock = newStock;
  existingProduct.lastUpdated = Date.now();
  await existingProduct.save();

  if (oldStock !== newStock) {
    await auditService.logChange({
      entityType: 'Product',
      entityId: existingProduct._id,
      action: 'UPDATE',
      performedBy: req.user.id,
      changes: [{ field: 'stock', oldValue: oldStock, newValue: newStock }]
    });
  }

  res.status(200).json({ success: true, data: existingProduct, message: 'Stock updated successfully' });
});

// DELETE Soft Delete / Hard Delete Product
exports.deleteProduct = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const product = await Product.findById(id);
  if (!product) {
    const error = new Error('Product not found');
    error.status = 404;
    throw error;
  }

  const totalOrders = await Order.countDocuments({ 'items.productId': id });

  if (totalOrders > 0) {
    // Soft delete (deactivate) because it has existing orders
    const wasActive = product.isActive;
    product.isActive = false;
    product.lastUpdated = Date.now();
    await product.save();

    await auditService.logChange({
      entityType: 'Product',
      entityId: product._id,
      action: 'DELETE',
      performedBy: req.user.id,
      changes: [
        { field: 'isActive', oldValue: wasActive, newValue: false }
      ],
      metadata: { type: 'soft_delete', reason: 'Deactivated due to existing orders' }
    });

    return res.status(200).json({ 
      success: true, 
      message: 'Product deactivated (soft-deleted) because it has existing orders.' 
    });
  } else {
    // Hard delete
    if (product.images && product.images.length > 0) {
      await Promise.all(
        product.images.map(imgUrl => deleteImage(imgUrl))
      );
    }

    await Product.findByIdAndDelete(id);

    await auditService.logChange({
      entityType: 'Product',
      entityId: product._id,
      action: 'DELETE',
      performedBy: req.user.id,
      changes: [
        { field: 'title', oldValue: product.title, newValue: null }
      ],
      metadata: { type: 'hard_delete' }
    });

    return res.status(200).json({ 
      success: true, 
      message: 'Product permanently deleted.' 
    });
  }
});
