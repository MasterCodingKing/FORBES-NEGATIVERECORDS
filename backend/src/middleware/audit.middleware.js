const { prisma } = require("../models");

const logAudit = async (req, action, moduleName, recordId) => {
  if (!req.user) {
    return;
  }

  await prisma.auditLog.create({
    data: {
      userId: req.user.id,
      action,
      module: moduleName,
      recordId,
      ipAddress: req.ip,
    },
  });
};

module.exports = { logAudit };
