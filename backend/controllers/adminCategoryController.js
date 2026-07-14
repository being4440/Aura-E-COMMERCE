const Category = require('../models/Category');
const asyncHandler = require('../middleware/asyncHandler');

exports.getCategories = asyncHandler(async (req, res) => {
  const categories = await Category.find().sort({ createdAt: -1 }).lean();
  const Product = require('../models/Product');
  
  for (let cat of categories) {
    cat.itemCount = await Product.countDocuments({ category: cat.name });
  }
  
  res.status(200).json({ success: true, data: categories });
});

exports.createCategory = asyncHandler(async (req, res) => {
  const { name, isActive } = req.body;
  
  if (!name) {
    const error = new Error('Category name is required');
    error.status = 400;
    throw error;
  }

  const existing = await Category.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } });
  if (existing) {
    const error = new Error('Category already exists');
    error.status = 400;
    throw error;
  }

  const category = new Category({ name, isActive });
  await category.save();

  res.status(201).json({ success: true, data: category });
});

exports.updateCategory = asyncHandler(async (req, res) => {
  const { name, isActive } = req.body;
  const category = await Category.findById(req.params.id);
  
  if (!category) {
    const error = new Error('Category not found');
    error.status = 404;
    throw error;
  }

  if (name) {
    const existing = await Category.findOne({ 
      name: { $regex: new RegExp(`^${name}$`, 'i') }, 
      _id: { $ne: req.params.id } 
    });
    if (existing) {
      const error = new Error('Another category with this name already exists');
      error.status = 400;
      throw error;
    }
    category.name = name;
  }
  
  if (isActive !== undefined) {
    category.isActive = isActive;
  }

  await category.save();
  res.status(200).json({ success: true, data: category });
});

exports.deleteCategory = asyncHandler(async (req, res) => {
  // Soft delete to avoid breaking products that reference this category string
  const category = await Category.findByIdAndUpdate(
    req.params.id, 
    { isActive: false }, 
    { new: true }
  );
  if (!category) {
    const error = new Error('Category not found');
    error.status = 404;
    throw error;
  }
  
  res.status(200).json({ success: true, message: 'Category deactivated' });
});
