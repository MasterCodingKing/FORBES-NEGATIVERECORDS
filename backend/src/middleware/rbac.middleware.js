const { ROLES } = require("../utils/roles");

const requireRole = (...allowedRoles) => (req, res, next) => {
  const userRole = req.user?.role;

  if (!userRole) {
    return res.status(403).json({ message: "Forbidden: No role assigned" });
  }

  // Normalize roles for comparison (case-insensitive, trim whitespace)
  const normalizedUserRole = userRole.trim().toLowerCase();
  const normalizedAllowedRoles = allowedRoles.map((r) => r.trim().toLowerCase());

  if (!normalizedAllowedRoles.includes(normalizedUserRole)) {
    console.warn(
      `Access denied for user ${req.user.id}. Role: '${userRole}', Allowed: ${allowedRoles.join(", ")}`
    );
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
