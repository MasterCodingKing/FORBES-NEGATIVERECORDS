const { prisma } = require("../models");
const { parsePaginationParams, paginatedResponse } = require("../utils/pagination");

/**
 * GET /api/billing
 * List all search logs (billing records) with filters for client, affiliate (user), and date range.
 * Admin only.
 */
const getBillingRecords = async (req, res) => {
  try {
    const { page, limit, skip, where, orderBy } = parsePaginationParams(req.query, {
      searchableFields: ["searchTerm"],
      defaultSort: "createdAt",
      defaultOrder: "desc",
      sortableFields: ["createdAt", "searchType", "fee", "searchTerm"],
    });

    // Filter by client
    if (req.query.clientId) {
      where.clientId = parseInt(req.query.clientId, 10);
    }

    // Filter by affiliate (user)
    if (req.query.userId) {
      where.userId = parseInt(req.query.userId, 10);
    }

    // Filter by date range
    if (req.query.from || req.query.to) {
      where.createdAt = {};
      if (req.query.from) where.createdAt.gte = new Date(req.query.from);
      if (req.query.to) {
        const toDate = new Date(req.query.to);
        toDate.setHours(23, 59, 59, 999);
        where.createdAt.lte = toDate;
      }
    }

    const [data, total] = await Promise.all([
      prisma.searchLog.findMany({
        where,
        include: {
          user: {
            select: { id: true, email: true, firstName: true, lastName: true },
          },
          client: {
            select: { id: true, name: true, clientCode: true },
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

/**
 * GET /api/billing/summary
 * Get billing summary stats.
 */
const getBillingSummary = async (req, res) => {
  try {
    const where = {};

    if (req.query.clientId) {
      where.clientId = parseInt(req.query.clientId, 10);
    }
    if (req.query.userId) {
      where.userId = parseInt(req.query.userId, 10);
    }
    if (req.query.from || req.query.to) {
      where.createdAt = {};
      if (req.query.from) where.createdAt.gte = new Date(req.query.from);
      if (req.query.to) {
        const toDate = new Date(req.query.to);
        toDate.setHours(23, 59, 59, 999);
        where.createdAt.lte = toDate;
      }
    }

    const [totalSearches, billedSearches, totalFees] = await Promise.all([
      prisma.searchLog.count({ where }),
      prisma.searchLog.count({ where: { ...where, isBilled: 1 } }),
      prisma.searchLog.aggregate({
        where,
        _sum: { fee: true },
      }),
    ]);

    return res.json({
      totalSearches,
      billedSearches,
      unbilledSearches: totalSearches - billedSearches,
      totalFees: totalFees._sum.fee || 0,
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

module.exports = { getBillingRecords, getBillingSummary };
