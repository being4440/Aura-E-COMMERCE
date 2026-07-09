const Product = require('../models/Product');
const Order = require('../models/Order');
const { uploadImage } = require('../utils/cloudinary');
const mongoose = require('mongoose');

// GET Admin Products
exports.getAdminProducts = async (req, res) => {
  try {
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

    if (category) query.category = category;
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

    console.log("Admin get products query:", query);
    const products = await Product.find(query)
      .sort(sortObj)
      .skip(skip)
      .limit(parseInt(limit));
    console.log("Admin get products returned length:", products.length);

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

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get single product for admin (including inactive)
// @route   GET /api/admin/products/:id
// @access  Private/Admin
exports.getAdminProductById = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid product ID' });
    }

    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    res.status(200).json({ success: true, data: product });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST Create Product
exports.createProduct = async (req, res) => {
  try {
    const { title, description, category, brand, price, stock, sizes, colors, isActive, featured } = req.body;

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
      category,
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

    res.status(201).json({ success: true, data: product, message: 'Product created successfully' });
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// PUT Update Product
exports.updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, category, brand, price, stock, sizes, colors, isActive, featured } = req.body;

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    // Process new images if uploaded
    let imageUrls = product.images;
    if (req.files && req.files.length > 0) {
      imageUrls = []; // replace existing images or append based on requirements? Usually replace if new files sent.
      for (const file of req.files) {
        const url = await uploadImage(file.buffer, file.mimetype, 'ecommerce/products');
        imageUrls.push(url);
      }
    }

    product.title = title || product.title;
    product.description = description || product.description;
    product.category = category || product.category;
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

    res.status(200).json({ success: true, data: product, message: 'Product updated successfully' });
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// PATCH Quick Stock Update
exports.quickUpdateStock = async (req, res) => {
  try {
    const { id } = req.params;
    const { stock } = req.body;

    if (stock === undefined || isNaN(stock)) {
      return res.status(400).json({ success: false, message: 'Valid stock number is required' });
    }

    const product = await Product.findByIdAndUpdate(
      id,
      { $set: { stock: Number(stock), lastUpdated: Date.now() } },
      { new: true, runValidators: true }
    );

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    res.status(200).json({ success: true, data: product, message: 'Stock updated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// DELETE Soft Delete Product
exports.deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    // Check if product is referenced in any active orders
    const orderCount = await Order.countDocuments({
      'items.productId': id,
      status: { $nin: ['delivered', 'cancelled'] } // Only worry about active/pending orders
    });

    const totalOrders = await Order.countDocuments({ 'items.productId': id });

    if (totalOrders > 0) {
      // It has orders (past or present), soft delete it
      product.isActive = false;
      product.lastUpdated = Date.now();
      await product.save();
      return res.status(200).json({ 
        success: true, 
        message: 'Product deactivated (soft-deleted) because it has existing orders.' 
      });
    } else {
      // No orders ever placed for this product, safe to hard delete
      await Product.findByIdAndDelete(id);
      return res.status(200).json({ 
        success: true, 
        message: 'Product permanently deleted.' 
      });
    }

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
