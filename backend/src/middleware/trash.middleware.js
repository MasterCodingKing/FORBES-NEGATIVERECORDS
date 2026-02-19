const { SubDomain } = require("../models");
const { ROLES } = require("../utils/roles");

const enforceActiveSubDomain = async (req, res, next) => {
  const id = req.params.id;
  if (!id) {
    return next();
  }

  const subDomain = await SubDomain.findOne({
    where: { id, isDeleted: 0 }
  });

  if (!subDomain) {
    return res.status(404).json({ message: "Not found" });
  }

  req.subDomain = subDomain;
  return next();
};

const allowTrashAccess = (req, res, next) => {
  const role = req.user?.role;
  if (role !== ROLES.ADMIN && role !== ROLES.SUPER_ADMIN) {
    return res.status(403).json({ message: "Forbidden" });
  }

  return next();
};

module.exports = {
  enforceActiveSubDomain,
  allowTrashAccess
};
