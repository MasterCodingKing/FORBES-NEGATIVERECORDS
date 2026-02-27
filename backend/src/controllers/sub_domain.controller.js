const { prisma } = require("../models");
const { logAudit } = require("../middleware/audit.middleware");
const { parsePaginationParams, paginatedResponse } = require("../utils/pagination");

const list = async (req, res) => {
  try {
    const { page, limit, skip, where, orderBy } = parsePaginationParams(req.query, {
      searchableFields: ["name", "clientCode"],
      defaultSort: "createdAt",
      defaultOrder: "desc",
      sortableFields: ["createdAt", "name", "clientCode", "status"],
    });

    where.isDeleted = 0;
    if (req.query.clientId) {
      where.clientId = parseInt(req.query.clientId, 10);
    }

    const [data, total] = await Promise.all([
      prisma.subDomain.findMany({
        where,
        include: {
          client: { select: { id: true, clientCode: true, name: true } },
        },
        skip,
        take: limit,
        orderBy,
      }),
      prisma.subDomain.count({ where }),
    ]);

    return res.json(paginatedResponse(data, total, page, limit));
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

const create = async (req, res) => {
  try {
    const { name, clientId, clientCode, status } = req.body;

    if (!name || !clientId) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const client = await prisma.client.findUnique({
      where: { id: clientId },
    });
    if (!client) {
      return res.status(404).json({ message: "Client not found" });
    }

    const subDomain = await prisma.subDomain.create({
      data: {
        name,
        clientId,
        clientCode: clientCode || client.clientCode,
        status: status || "Active",
      },
    });

    await logAudit(req, "SUB_DOMAIN_CREATE", "sub_domains", subDomain.id);
    return res.status(201).json(subDomain);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

const update = async (req, res) => {
  try {
    const { id } = req.params;
    const subDomain = await prisma.subDomain.findFirst({
      where: { id: parseInt(id, 10), isDeleted: 0 },
    });
    if (!subDomain) {
      return res.status(404).json({ message: "Not found" });
    }

    const { name, clientId, clientCode, status } = req.body;
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (status !== undefined) updateData.status = status;
    if (clientCode !== undefined) updateData.clientCode = clientCode;
    if (clientId !== undefined) {
      const client = await prisma.client.findUnique({
        where: { id: clientId },
      });
      if (!client) return res.status(404).json({ message: "Client not found" });
      updateData.clientId = clientId;
      // Use provided clientCode, otherwise use client's default
      if (!updateData.clientCode) {
        updateData.clientCode = client.clientCode;
      }
    }

    const updated = await prisma.subDomain.update({
      where: { id: subDomain.id },
      data: updateData,
    });

    await logAudit(req, "SUB_DOMAIN_UPDATE", "sub_domains", subDomain.id);
    return res.json(updated);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

const softDelete = async (req, res) => {
  try {
    const { id } = req.params;

    const subDomain = await prisma.subDomain.findFirst({
      where: { id: parseInt(id, 10), isDeleted: 0 },
    });
    if (!subDomain) {
      return res.status(404).json({ message: "Not found" });
    }

    await prisma.subDomain.update({
      where: { id: subDomain.id },
      data: {
        isDeleted: 1,
        deletedAt: new Date(),
        deletedBy: req.user.id,
      },
    });

    await logAudit(req, "SUB_DOMAIN_SOFT_DELETE", "sub_domains", subDomain.id);

    return res.json({ message: "Deleted" });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

const listTrash = async (req, res) => {
  try {
    const { page, limit, skip, where, orderBy } = parsePaginationParams(req.query, {
      searchableFields: ["name", "clientCode"],
      defaultSort: "deletedAt",
      defaultOrder: "desc",
      sortableFields: ["deletedAt", "name", "clientCode"],
    });

    where.isDeleted = 1;

    const [data, total] = await Promise.all([
      prisma.subDomain.findMany({
        where,
        include: {
          client: { select: { id: true, clientCode: true, name: true } },
        },
        skip,
        take: limit,
        orderBy,
      }),
      prisma.subDomain.count({ where }),
    ]);

    return res.json(paginatedResponse(data, total, page, limit));
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

const restore = async (req, res) => {
  try {
    const { id } = req.params;

    const subDomain = await prisma.subDomain.findFirst({
      where: { id: parseInt(id, 10), isDeleted: 1 },
    });
    if (!subDomain) {
      return res.status(404).json({ message: "Not found" });
    }

    await prisma.subDomain.update({
      where: { id: subDomain.id },
      data: {
        isDeleted: 0,
        deletedAt: null,
        deletedBy: null,
      },
    });

    await logAudit(req, "SUB_DOMAIN_RESTORE", "sub_domains", subDomain.id);

    return res.json({ message: "Restored" });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

const forceDelete = async (req, res) => {
  try {
    const { id } = req.params;
    const parsedId = parseInt(id, 10);

    const subDomain = await prisma.subDomain.findUnique({
      where: { id: parsedId },
    });
    if (!subDomain) {
      return res.status(404).json({ message: "Not found" });
    }

    await prisma.subDomain.delete({ where: { id: parsedId } });

    await logAudit(req, "SUB_DOMAIN_FORCE_DELETE", "sub_domains", parsedId);

    return res.json({ message: "Force deleted" });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

module.exports = {
  list,
  create,
  update,
  softDelete,
  listTrash,
  restore,
  forceDelete,
};
