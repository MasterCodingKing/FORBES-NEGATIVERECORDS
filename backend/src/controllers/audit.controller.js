const { prisma } = require("../models");
const { parsePaginationParams, paginatedResponse } = require("../utils/pagination");

/**
 * GET /api/audit-logs
 * Admin-only: List all audit log entries with user info,
 * with pagination, search, and date filtering.
 */
const listAuditLogs = async (req, res) => {
  try {
    const { page, limit, skip, orderBy } = parsePaginationParams(req.query, {
      searchableFields: [],
      defaultSort: "createdAt",
      defaultOrder: "desc",
      sortableFields: ["createdAt", "action", "module"],
    });

    const where = {};

    // Filter by action
    if (req.query.action) {
      where.action = { contains: req.query.action.trim(), mode: "insensitive" };
    }

    // Filter by module
    if (req.query.module) {
      where.module = { contains: req.query.module.trim(), mode: "insensitive" };
    }

    // Filter by userId
    if (req.query.userId) {
      where.userId = parseInt(req.query.userId, 10);
    }

    // Filter by search term (matches action, module, or user info)
    if (req.query.search) {
      const term = req.query.search.trim();
      where.OR = [
        { action: { contains: term, mode: "insensitive" } },
        { module: { contains: term, mode: "insensitive" } },
        { ipAddress: { contains: term, mode: "insensitive" } },
        { user: { email: { contains: term, mode: "insensitive" } } },
        { user: { firstName: { contains: term, mode: "insensitive" } } },
        { user: { lastName: { contains: term, mode: "insensitive" } } },
        { user: { username: { contains: term, mode: "insensitive" } } },
      ];
    }

    // Date range filter
    if (req.query.from || req.query.to) {
      where.createdAt = {};
      if (req.query.from) {
        where.createdAt.gte = new Date(req.query.from);
      }
      if (req.query.to) {
        where.createdAt.lte = new Date(req.query.to);
      }
    }

    const [data, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          user: {
            select: {
              id: true,
              username: true,
              email: true,
              firstName: true,
              lastName: true,
              role: { select: { name: true } },
              client: { select: { id: true, name: true } },
            },
          },
        },
      }),
      prisma.auditLog.count({ where }),
    ]);

    return res.json(paginatedResponse(data, total, page, limit));
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

/**
 * GET /api/audit-logs/actions
 * Admin-only: Get distinct action types for filter dropdown.
 */
const getDistinctActions = async (req, res) => {
  try {
    const actions = await prisma.auditLog.findMany({
      select: { action: true },
      distinct: ["action"],
      orderBy: { action: "asc" },
    });
    return res.json(actions.map((a) => a.action));
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

/**
 * GET /api/audit-logs/modules
 * Admin-only: Get distinct module names for filter dropdown.
 */
const getDistinctModules = async (req, res) => {
  try {
    const modules = await prisma.auditLog.findMany({
      select: { module: true },
      distinct: ["module"],
      orderBy: { module: "asc" },
    });
    return res.json(modules.map((m) => m.module));
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

module.exports = {
  listAuditLogs,
  getDistinctActions,
  getDistinctModules,
};
