const mongoose = require('mongoose');

const AuditLogSchema = new mongoose.Schema({
  entityType: {
    type: String,
    required: true,
    index: true
  },
  entityId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true
  },
  action: {
    type: String,
    required: true,
    // Flexible enum since it's an audit log, or we can just let it be a string.
    // Adding some common actions per requirements.
    enum: ['CREATE', 'UPDATE', 'DELETE', 'STATUS_CHANGE', 'BLOCK', 'UNBLOCK']
  },
  performedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  changes: [{
    field: String,
    oldValue: mongoose.Schema.Types.Mixed,
    newValue: mongoose.Schema.Types.Mixed,
    _id: false
  }],
  metadata: {
    type: mongoose.Schema.Types.Mixed
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Compound index on (entityType, entityId, createdAt)
AuditLogSchema.index({ entityType: 1, entityId: 1, createdAt: -1 });

// Compound index on (performedBy, createdAt)
AuditLogSchema.index({ performedBy: 1, createdAt: -1 });

module.exports = mongoose.model('AuditLog', AuditLogSchema);
