const AuditLog = require('../models/AuditLog');

/**
 * Logs an action to the audit log collection.
 * 
 * @param {Object} params
 * @param {String} params.entityType - Type of entity (e.g., 'Product', 'Order', 'User')
 * @param {mongoose.Types.ObjectId|String} params.entityId - ID of the entity being modified
 * @param {String} params.action - Action taken (e.g., 'UPDATE', 'DELETE', 'STATUS_CHANGE', 'BLOCK', 'UNBLOCK')
 * @param {mongoose.Types.ObjectId|String} params.performedBy - ID of the user performing the action
 * @param {Array<{field: String, oldValue: any, newValue: any}>} [params.changes=[]] - Array of field changes
 * @param {Object} [params.metadata={}] - Any additional context or metadata
 */
exports.logChange = async ({
  entityType,
  entityId,
  action,
  performedBy,
  changes = [],
  metadata = {}
}) => {
  try {
    const auditEntry = new AuditLog({
      entityType,
      entityId,
      action,
      performedBy,
      changes,
      metadata
    });

    await auditEntry.save();
  } catch (error) {
    // We log the error but NEVER throw it.
    // A failure in auditing should not break the main operation.
    console.error('AuditLog Error: Failed to save audit log', error);
  }
};
