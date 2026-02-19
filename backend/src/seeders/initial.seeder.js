const bcrypt = require("bcryptjs");
const { Role, User } = require("../models");
const { ROLES } = require("../utils/roles");

const seedRolesAndAdmin = async () => {
  try {
    const roles = [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.USER];
    for (const name of roles) {
      await Role.findOrCreate({ where: { name } });
    }
    console.log("Roles seeded");

    const superAdminRole = await Role.findOne({ where: { name: ROLES.SUPER_ADMIN } });
    const existingAdmin = await User.findOne({
      where: { email: "admin@negrect.com" }
    });

    if (!existingAdmin) {
      const hash = await bcrypt.hash("admin123", 10);
      await User.create({
        email: "admin@negrect.com",
        passwordHash: hash,
        firstName: "System",
        lastName: "Admin",
        username: "admin",
        roleId: superAdminRole.id,
        isApproved: 1
      });
      console.log("Default Super Admin created: admin@negrect.com / admin123");
    }
  } catch (err) {
    console.error("Seeder error", err);
  }
};

module.exports = { seedRolesAndAdmin };
