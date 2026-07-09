const User = require('../models/User');
const Product = require('../models/Product');
const Order = require('../models/Order');
const dayjs = require('dayjs');

exports.getSalesAnalytics = async (req, res) => {
  try {
    const { period = 'monthly' } = req.query; // daily, weekly, monthly

    let startDate;
    let formatString;

    if (period === 'daily') {
      startDate = dayjs().subtract(30, 'day').toDate();
      formatString = '%Y-%m-%d';
    } else if (period === 'weekly') {
      startDate = dayjs().subtract(12, 'week').toDate();
      formatString = '%Y-%U';
    } else { // monthly
      startDate = dayjs().subtract(12, 'month').toDate();
      formatString = '%Y-%m';
    }

    const sales = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
          $or: [
            { paymentStatus: { $in: ['paid', 'completed'] } },
            { status: 'delivered' }
          ]
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: formatString, date: '$createdAt' } },
          revenue: { $sum: '$totalAmount' },
          orders: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.status(200).json({ success: true, data: sales });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getProductAnalytics = async (req, res) => {
  try {
    // Left outer join from Products to Orders to include 0 sales
    const productStats = await Product.aggregate([
      { $match: { isActive: true } },
      {
        $lookup: {
          from: 'orders',
          let: { productId: '$_id' },
          pipeline: [
            { $unwind: '$items' },
            { $match: { $expr: { $eq: ['$items.productId', '$$productId'] } } }
          ],
          as: 'orderData'
        }
      },
      {
        $project: {
          title: 1,
          price: 1,
          stock: 1,
          images: 1,
          unitsSold: {
            $reduce: {
              input: '$orderData',
              initialValue: 0,
              in: { $add: ['$$value', '$$this.items.quantity'] }
            }
          },
          revenue: {
            $reduce: {
              input: '$orderData',
              initialValue: 0,
              in: { $add: ['$$value', { $multiply: ['$$this.items.quantity', '$$this.items.price'] }] }
            }
          }
        }
      }
    ]);

    // Sort in JS or Mongo, since we need both best and worst, we can sort in JS to avoid two aggregations
    productStats.sort((a, b) => b.unitsSold - a.unitsSold);

    const bestSelling = productStats.slice(0, 10);
    
    // For worst selling, find the 10 lowest units sold
    const worstSelling = [...productStats].reverse().slice(0, 10);

    res.status(200).json({
      success: true,
      data: {
        bestSelling,
        worstSelling
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getUserAnalytics = async (req, res) => {
  try {
    const { period = 'monthly' } = req.query;

    let startDate;
    let formatString;

    if (period === 'daily') {
      startDate = dayjs().subtract(30, 'day').toDate();
      formatString = '%Y-%m-%d';
    } else if (period === 'weekly') {
      startDate = dayjs().subtract(12, 'week').toDate();
      formatString = '%Y-%U';
    } else { // monthly
      startDate = dayjs().subtract(12, 'month').toDate();
      formatString = '%Y-%m';
    }

    // 1. New Registrations
    const registrations = await User.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: { $dateToString: { format: formatString, date: '$createdAt' } },
          users: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // 2. Active Users (placed order in last 30 days)
    const thirtyDaysAgo = dayjs().subtract(30, 'day').toDate();
    const activeUsersResult = await Order.aggregate([
      { $match: { createdAt: { $gte: thirtyDaysAgo } } },
      { $group: { _id: '$user' } }, // unique users
      { $count: 'activeUserCount' }
    ]);

    const activeUsers = activeUsersResult.length > 0 ? activeUsersResult[0].activeUserCount : 0;
    const totalUsers = await User.countDocuments();

    res.status(200).json({
      success: true,
      data: {
        registrations,
        activeUsers,
        totalUsers
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getPaymentAnalytics = async (req, res) => {
  try {
    const payments = await Order.aggregate([
      {
        $group: {
          _id: {
            method: '$paymentMethod',
            status: '$paymentStatus'
          },
          count: { $sum: 1 },
          amount: { $sum: '$totalAmount' }
        }
      }
    ]);

    // Transform data for pie charts
    const transformed = {
      methods: {},
      statuses: {}
    };

    payments.forEach(p => {
      const method = p._id.method;
      const status = p._id.status;

      // Group by Method
      if (!transformed.methods[method]) transformed.methods[method] = { count: 0, amount: 0 };
      transformed.methods[method].count += p.count;
      transformed.methods[method].amount += p.amount;

      // Group by Status
      if (!transformed.statuses[status]) transformed.statuses[status] = { count: 0, amount: 0 };
      transformed.statuses[status].count += p.count;
      transformed.statuses[status].amount += p.amount;
    });

    res.status(200).json({
      success: true,
      data: {
        raw: payments,
        summary: transformed
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
