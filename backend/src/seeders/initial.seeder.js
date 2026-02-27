const bcrypt = require("bcryptjs");
const { prisma } = require("../models");
const { ROLES } = require("../utils/roles");

const seedRolesAndAdmin = async () => {
  try {
    // Migrate old "User" role name to "Affiliate"
    const oldRole = await prisma.role.findFirst({ where: { name: "User" } });
    if (oldRole) {
      await prisma.role.update({
        where: { id: oldRole.id },
        data: { name: ROLES.USER },
      });
      console.log('Renamed role "User" to "Affiliate"');
    }

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

    if (!superAdminRole) {
      console.error("Super Admin role not found after seeding!");
      return;
    }

    const existingAdmin = await prisma.user.findUnique({
      where: { email: "admin@negrect.com" },
      include: { role: true },
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
    } else if (!existingAdmin.role || existingAdmin.role.id !== superAdminRole.id) {
      // If admin exists but doesn't have the right role, update it
      await prisma.user.update({
        where: { email: "admin@negrect.com" },
        data: { roleId: superAdminRole.id, isApproved: 1 },
      });
      console.log("Updated admin user with Super Admin role");
    }
  } catch (err) {
    console.error("Seeder error", err);
  }
};

module.exports = { seedRolesAndAdmin };
