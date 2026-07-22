const AuditLog = require('../models/AuditLog');
const asyncHandler = require('../middleware/asyncHandler');
const mongoose = require('mongoose');

// @desc    Get all audit logs
// @route   GET /api/audit-logs
// @access  Private/Admin
exports.getAuditLogs = asyncHandler(async (req, res) => {
  let { entityType, entityId, performedBy, page, limit, startDate, endDate } = req.query;

  page = parseInt(page, 10) || 1;
  limit = parseInt(limit, 10) || 20;

  // Clamp limit to max 100, no unbounded queries
  if (limit > 100) limit = 100;
  if (page < 1) page = 1;

  const query = {};

  if (entityType) query.entityType = entityType;
  if (entityId) {
    if (mongoose.Types.ObjectId.isValid(entityId)) {
      query.entityId = entityId;
    } else {
      query.entityId = null;
    }
  }
  if (performedBy) {
    if (mongoose.Types.ObjectId.isValid(performedBy)) {
      query.performedBy = performedBy;
    } else {
      query.performedBy = null;
    }
  }

  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) {
      const parsedStart = new Date(startDate);
      if (isNaN(parsedStart)) {
        res.status(400);
        throw new Error('Invalid startDate format');
      }
      query.createdAt.$gte = parsedStart;
    }
    if (endDate) {
      const parsedEnd = new Date(endDate);
      if (isNaN(parsedEnd)) {
        res.status(400);
        throw new Error('Invalid endDate format');
      }
      query.createdAt.$lte = parsedEnd;
    }
  }

  const skip = (page - 1) * limit;

  const total = await AuditLog.countDocuments(query);
  const totalPages = Math.ceil(total / limit);

  const logs = await AuditLog.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('performedBy', 'username'); // Using username as name

  res.status(200).json({
    success: true,
    data: logs,
    page,
    limit,
    total,
    totalPages
  });
});
