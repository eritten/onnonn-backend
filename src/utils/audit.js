const { AuditLog } = require("../models");

async function writeAuditLog({ userId, action, resourceType, resourceId, ipAddress, userAgent, metadata }) {
  await AuditLog.create({
    userId,
    action,
    resourceType,
    resourceId,
    ipAddress,
    userAgent,
    metadata
  });
}

module.exports = { writeAuditLog };
