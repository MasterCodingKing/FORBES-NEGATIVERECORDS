const bcrypt = require("bcryptjs");
const { prisma } = require("../models");
const { ROLES } = require("../utils/roles");

const seedRolesAndAdmin = async () => {
  try {
    const roles = [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.USER];
    for (const name of roles) {
      await prisma.role.upsert({
        where: { name },
        update: {},
        create: { name },
      });
    }
    console.log("Roles seeded");

    const superAdminRole = await prisma.role.findFirst({
      where: { name: ROLES.SUPER_ADMIN },
    });

    const existingAdmin = await prisma.user.findUnique({
      where: { email: "admin@negrect.com" },
    });

    if (!existingAdmin) {
      const hash = await bcrypt.hash("admin123", 10);
      await prisma.user.create({
        data: {
          email: "admin@negrect.com",
          passwordHash: hash,
          firstName: "System",
          lastName: "Admin",
          username: "admin",
          roleId: superAdminRole.id,
          isApproved: 1,
        },
      });
      console.log("Default Super Admin created: admin@negrect.com / admin123");
    }
  } catch (err) {
    console.error("Seeder error", err);
  }
};

module.exports = { seedRolesAndAdmin };
