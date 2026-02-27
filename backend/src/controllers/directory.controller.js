const { prisma } = require("../models");
const { parsePaginationParams, paginatedResponse } = require("../utils/pagination");

const getDirectory = async (req, res) => {
  try {
    const { page, limit, skip, where, orderBy } = parsePaginationParams(req.query, {
      searchableFields: ["name", "clientCode"],
      defaultSort: "name",
      defaultOrder: "asc",
      sortableFields: ["name", "clientCode", "createdAt"],
    });

    where.isActive = 1;

    const [data, total] = await Promise.all([
      prisma.client.findMany({
        where,
        include: {
          subDomains: { where: { isDeleted: 0 } },
          users: {
            where: { isApproved: 1 },
            select: { id: true, email: true, firstName: true, lastName: true },
          },
        },
        skip,
        take: limit,
        orderBy,
      }),
      prisma.client.count({ where }),
    ]);

    return res.json(paginatedResponse(data, total, page, limit));
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

module.exports = { getDirectory };
