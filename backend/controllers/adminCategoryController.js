const Category = require('../models/Category');

exports.getCategories = async (req, res) => {
  try {
    const categories = await Category.find().sort({ createdAt: -1 }).lean();
    const Product = require('../models/Product');
    
    for (let cat of categories) {
      cat.itemCount = await Product.countDocuments({ category: cat.name });
    }
    
    res.status(200).json({ success: true, data: categories });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createCategory = async (req, res) => {
  try {
    const { name, isActive } = req.body;
    
    if (!name) return res.status(400).json({ success: false, message: 'Category name is required' });

    const existing = await Category.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Category already exists' });
    }

    const category = new Category({ name, isActive });
    await category.save();

    res.status(201).json({ success: true, data: category });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateCategory = async (req, res) => {
  try {
    const { name, isActive } = req.body;
    const category = await Category.findById(req.params.id);
    
    if (!category) return res.status(404).json({ success: false, message: 'Category not found' });

    if (name) {
      const existing = await Category.findOne({ 
        name: { $regex: new RegExp(`^${name}$`, 'i') }, 
        _id: { $ne: req.params.id } 
      });
      if (existing) {
        return res.status(400).json({ success: false, message: 'Another category with this name already exists' });
      }
      category.name = name;
    }
    
    if (isActive !== undefined) {
      category.isActive = isActive;
    }

    await category.save();
    res.status(200).json({ success: true, data: category });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteCategory = async (req, res) => {
  try {
    // Soft delete to avoid breaking products that reference this category string
    const category = await Category.findByIdAndUpdate(
      req.params.id, 
      { isActive: false }, 
      { new: true }
    );
    if (!category) return res.status(404).json({ success: false, message: 'Category not found' });
    
    res.status(200).json({ success: true, message: 'Category deactivated' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
