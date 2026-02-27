// Database connection is now managed by Prisma.
// Configure DATABASE_URL in your .env file:
// DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public"
//
// See: backend/src/config/prisma.js

const { prisma } = require("./prisma");

module.exports = { prisma };
