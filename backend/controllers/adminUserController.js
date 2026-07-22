const User = require('../models/User');
const Order = require('../models/Order');
const Wishlist = require('../models/Wishlist');
const mongoose = require('mongoose');
const asyncHandler = require('../middleware/asyncHandler');
const auditService = require('../services/auditService');

// @desc    Get all users (paginated, searchable, filterable)
exports.getUsers = asyncHandler(async (req, res) => {
  const { 
    page = 1, 
    limit = 10, 
    search = '', 
    status, // 'active', 'blocked'
    sortBy = 'createdAt', 
    sortOrder = 'desc' 
  } = req.query;

  const query = { isDeleted: { $ne: true } };

  // Status filter
  if (status === 'blocked') {
    query.isBlocked = true;
  } else if (status === 'active') {
    query.isBlocked = false;
  }

  // Search by username, email, mobile
  if (search) {
    const searchString = String(search).trim();
    const safeSearch = searchString.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    query.$or = [
      { username: { $regex: safeSearch, $options: 'i' } },
      { email: { $regex: safeSearch, $options: 'i' } },
      { mobile: { $regex: safeSearch, $options: 'i' } }
    ];
  }

  const pageNum = Math.max(1, parseInt(page) || 1);
  let limitNum = parseInt(limit) || 10;
  if (limitNum < 1) limitNum = 1;

  const skip = (pageNum - 1) * limitNum;
  const sortObj = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

  const [usersWithOrderCount, totalUsers] = await Promise.all([
    User.aggregate([
      { $match: query },
      { $sort: sortObj },
      { $skip: skip },
      { $limit: limitNum },
      {
        $lookup: {
          from: 'orders',
          localField: '_id',
          foreignField: 'user',
          as: 'userOrders'
        }
      },
      {
        $addFields: {
          orderCount: { $size: "$userOrders" }
        }
      },
      {
        $project: {
          password: 0,
          userOrders: 0
        }
      }
    ]),
    User.countDocuments(query)
  ]);

  res.status(200).json({
    success: true,
    data: usersWithOrderCount,
    pagination: {
      total: totalUsers,
      page: pageNum,
      pages: Math.ceil(totalUsers / limitNum)
    }
  });
});

// @desc    Get single user full profile (Orders, Wishlist)
exports.getUserById = asyncHandler(async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    const error = new Error('Invalid user ID');
    error.status = 400;
    throw error;
  }

  const user = await User.findById(req.params.id).select('-password');
  if (!user || user.isDeleted) {
    const error = new Error('User not found');
    error.status = 404;
    throw error;
  }

  // Fetch Orders and Wishlist concurrently
  const [orders, wishlist] = await Promise.all([
    Order.find({ user: user._id }).sort({ createdAt: -1 }),
    Wishlist.findOne({ user: user._id }).populate('items.productId')
  ]);

  res.status(200).json({
    success: true,
    data: {
      profile: user,
      orders,
      wishlist: wishlist ? wishlist.items : []
    }
  });
});

// @desc    Block or Unblock a user
exports.toggleBlockUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { isBlocked, blockedReason } = req.body;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    const error = new Error('Invalid user ID');
    error.status = 400;
    throw error;
  }

  const user = await User.findById(id);
  if (!user || user.isDeleted) {
    const error = new Error('User not found');
    error.status = 404;
    throw error;
  }

  if (user.role === 'admin') {
    const error = new Error('Cannot block an admin account');
    error.status = 403;
    throw error;
  }

  const changes = [];
  if (isBlocked !== undefined && isBlocked !== user.isBlocked) {
    changes.push({
      field: 'isBlocked',
      oldValue: user.isBlocked,
      newValue: isBlocked
    });
  }

  user.isBlocked = isBlocked;
  user.blockedAt = isBlocked ? new Date() : null;
  user.blockedReason = isBlocked ? (blockedReason || 'Blocked by Admin') : null;

  await user.save();

  if (changes.length > 0) {
    const action = isBlocked ? 'BLOCK' : 'UNBLOCK';
    await auditService.logChange({
      entityType: 'User',
      entityId: user._id,
      action,
      performedBy: req.user.id,
      changes
    });
  }

  res.status(200).json({
    success: true,
    message: `User successfully ${isBlocked ? 'blocked' : 'unblocked'}`,
    data: user
  });
});

// @desc    Delete user
exports.deleteUser = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    const error = new Error('Invalid user ID');
    error.status = 400;
    throw error;
  }

  const user = await User.findById(id);
  if (!user || user.isDeleted) {
    const error = new Error('User not found');
    error.status = 404;
    throw error;
  }

  if (user.role === 'admin') {
    const error = new Error('Cannot delete an admin account');
    error.status = 403;
    throw error;
  }

  const orderCount = await Order.countDocuments({ user: id });

  if (orderCount > 0) {
    const wasBlocked = user.isBlocked;
    // Force a block instead of soft delete if they have orders
    user.isBlocked = true;
    user.blockedAt = new Date();
    user.blockedReason = 'System Action: Blocked instead of deleted due to existing orders.';
    await user.save();

    if (wasBlocked === false) {
      await auditService.logChange({
        entityType: 'User',
        entityId: user._id,
        action: 'BLOCK',
        performedBy: req.user.id,
        changes: [{ field: 'isBlocked', oldValue: false, newValue: true }]
      });
    }

    return res.status(409).json({
      success: false,
      message: 'Cannot delete a user with existing orders. The account has been permanently blocked instead.',
      data: user
    });
  }

  // Soft delete if no orders exist
  user.isDeleted = true;
  user.isBlocked = true;
  await user.save();

  await auditService.logChange({
    entityType: 'User',
    entityId: user._id,
    action: 'DELETE',
    performedBy: req.user.id,
    changes: [{ field: 'isDeleted', oldValue: false, newValue: true }]
  });

  res.status(200).json({
    success: true,
    message: 'User account successfully deleted.'
  });
});
