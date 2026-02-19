const { ROLES } = require("../utils/roles");

const requireRole = (...allowedRoles) => (req, res, next) => {
  const userRole = req.user?.role;

  if (!userRole || !allowedRoles.includes(userRole)) {
    return res.status(403).json({ message: "Forbidden" });
  }

  return next();
};

const requireAdmin = requireRole(ROLES.ADMIN, ROLES.SUPER_ADMIN);
const requireSuperAdmin = requireRole(ROLES.SUPER_ADMIN);

module.exports = {
  requireRole,
  requireAdmin,
  requireSuperAdmin
};
