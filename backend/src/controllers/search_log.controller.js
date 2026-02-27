const { prisma } = require("../models");
const { parsePaginationParams, paginatedResponse } = require("../utils/pagination");

const getMyLogs = async (req, res) => {
  try {
    const { page, limit, skip, where, orderBy } = parsePaginationParams(req.query, {
      searchableFields: ["searchTerm"],
      defaultSort: "createdAt",
      defaultOrder: "desc",
      sortableFields: ["createdAt", "searchType", "fee"],
    });

    where.userId = req.user.id;

    const [data, total] = await Promise.all([
      prisma.searchLog.findMany({ where, skip, take: limit, orderBy }),
      prisma.searchLog.count({ where }),
    ]);

    return res.json(paginatedResponse(data, total, page, limit));
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

const getClientAffiliateLogs = async (req, res) => {
  try {
    const { page, limit, skip, where, orderBy } = parsePaginationParams(req.query, {
      searchableFields: ["searchTerm"],
      defaultSort: "createdAt",
      defaultOrder: "desc",
      sortableFields: ["createdAt", "searchType", "fee"],
    });

    const currentUser = await prisma.user.findUnique({
      where: { id: req.user.id },
    });
    if (!currentUser || !currentUser.clientId) {
      return res.status(403).json({ message: "No client assigned" });
    }

    where.clientId = currentUser.clientId;
    if (req.query.from && req.query.to) {
      where.createdAt = {
        ...(where.createdAt || {}),
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
        orderBy,
      }),
      prisma.searchLog.count({ where }),
    ]);

    return res.json(paginatedResponse(data, total, page, limit));
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

module.exports = { getMyLogs, getClientAffiliateLogs };
