const User = require('../models/User');
const Order = require('../models/Order');
const Wishlist = require('../models/Wishlist');

// @desc    Get all users (paginated, searchable, filterable)
exports.getUsers = async (req, res) => {
  try {
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
      query.$or = [
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { mobile: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortObj = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

    const users = await User.find(query)
      .select('-password')
      .sort(sortObj)
      .skip(skip)
      .limit(parseInt(limit));

    // Get order counts for each user (optional enhancement, but useful for list view)
    const usersWithOrderCount = await Promise.all(users.map(async (user) => {
      const orderCount = await Order.countDocuments({ user: user._id });
      return { ...user.toObject(), orderCount };
    }));

    const totalUsers = await User.countDocuments(query);

    res.status(200).json({
      success: true,
      data: usersWithOrderCount,
      pagination: {
        total: totalUsers,
        page: parseInt(page),
        pages: Math.ceil(totalUsers / limit)
      }
    });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get single user full profile (Orders, Wishlist)
exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user || user.isDeleted) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Fetch Orders
    const orders = await Order.find({ user: user._id }).sort({ createdAt: -1 });
    
    // Fetch Wishlist
    const wishlist = await Wishlist.findOne({ user: user._id }).populate('items.productId');

    res.status(200).json({
      success: true,
      data: {
        profile: user,
        orders,
        wishlist: wishlist ? wishlist.items : []
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Block or Unblock a user
exports.toggleBlockUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { isBlocked, blockedReason } = req.body;

    const user = await User.findById(id);
    if (!user || user.isDeleted) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (user.role === 'admin') {
      return res.status(403).json({ success: false, message: 'Cannot block an admin account' });
    }

    user.isBlocked = isBlocked;
    user.blockedAt = isBlocked ? new Date() : null;
    user.blockedReason = isBlocked ? (blockedReason || 'Blocked by Admin') : null;

    await user.save();

    res.status(200).json({
      success: true,
      message: `User successfully ${isBlocked ? 'blocked' : 'unblocked'}`,
      data: user
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete user
exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user || user.isDeleted) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (user.role === 'admin') {
      return res.status(403).json({ success: false, message: 'Cannot delete an admin account' });
    }

    const orderCount = await Order.countDocuments({ user: id });

    if (orderCount > 0) {
      // Force a block instead of soft delete if they have orders
      user.isBlocked = true;
      user.blockedAt = new Date();
      user.blockedReason = 'System Action: Blocked instead of deleted due to existing orders.';
      await user.save();

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

    res.status(200).json({
      success: true,
      message: 'User account successfully deleted.'
    });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
