const { prisma } = require("../models");

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

const getDirectory = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page || 1, 10), 1);
    const limit = Math.min(parseInt(req.query.limit || DEFAULT_LIMIT, 10), MAX_LIMIT);
    const skip = (page - 1) * limit;
    const search = req.query.search || "";

    const where = { isActive: 1 };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { clientCode: { contains: search, mode: "insensitive" } },
      ];
    }

    const [data, total] = await Promise.all([
      prisma.client.findMany({
        where,
        include: {
          subDomains: {
            where: { isDeleted: 0 },
          },
          users: {
            where: { isApproved: 1 },
            select: { id: true, email: true, firstName: true, lastName: true },
          },
        },
        skip,
        take: limit,
        orderBy: { name: "asc" },
      }),
      prisma.client.count({ where }),
    ]);

    return res.json({
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

module.exports = { getDirectory };
