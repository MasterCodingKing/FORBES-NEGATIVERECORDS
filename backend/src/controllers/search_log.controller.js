const { prisma } = require("../models");

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

const getMyLogs = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page || 1, 10), 1);
    const limit = Math.min(parseInt(req.query.limit || DEFAULT_LIMIT, 10), MAX_LIMIT);
    const skip = (page - 1) * limit;

    const where = { userId: req.user.id };

    const [data, total] = await Promise.all([
      prisma.searchLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.searchLog.count({ where }),
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

const getClientAffiliateLogs = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page || 1, 10), 1);
    const limit = Math.min(parseInt(req.query.limit || DEFAULT_LIMIT, 10), MAX_LIMIT);
    const skip = (page - 1) * limit;

    const currentUser = await prisma.user.findUnique({
      where: { id: req.user.id },
    });
    if (!currentUser || !currentUser.clientId) {
      return res.status(403).json({ message: "No client assigned" });
    }

    const where = { clientId: currentUser.clientId };
    if (req.query.from && req.query.to) {
      where.createdAt = {
        gte: new Date(req.query.from),
        lte: new Date(req.query.to),
      };
    }

    const [data, total] = await Promise.all([
      prisma.searchLog.findMany({
        where,
        include: {
          user: {
            select: { id: true, email: true, firstName: true, lastName: true },
          },
        },
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.searchLog.count({ where }),
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

module.exports = { getMyLogs, getClientAffiliateLogs };
