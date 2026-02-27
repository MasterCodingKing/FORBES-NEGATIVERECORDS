// All models are now defined in prisma/schema.prisma
// This file re-exports the Prisma client for backward compatibility
const { prisma } = require("../config/prisma");

module.exports = { prisma };
