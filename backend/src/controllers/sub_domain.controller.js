const { prisma } = require("../models");
const { logAudit } = require("../middleware/audit.middleware");

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

const list = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page || 1, 10), 1);
    const limit = Math.min(parseInt(req.query.limit || DEFAULT_LIMIT, 10), MAX_LIMIT);
    const skip = (page - 1) * limit;
    const search = req.query.search || "";
    const clientId = req.query.clientId || "";

    const where = { isDeleted: 0 };
    if (clientId) {
      where.clientId = parseInt(clientId, 10);
    }
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { clientCode: { contains: search, mode: "insensitive" } },
      ];
    }

    const [data, total] = await Promise.all([
      prisma.subDomain.findMany({
        where,
        include: {
          client: {
            select: { id: true, clientCode: true, name: true },
          },
        },
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.subDomain.count({ where }),
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

const create = async (req, res) => {
  try {
    const { name, clientId, status } = req.body;

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
        clientCode: client.clientCode,
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

    const { name, clientId, status } = req.body;
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (status !== undefined) updateData.status = status;
    if (clientId !== undefined) {
      const client = await prisma.client.findUnique({
        where: { id: clientId },
      });
      if (!client) return res.status(404).json({ message: "Client not found" });
      updateData.clientId = clientId;
      updateData.clientCode = client.clientCode;
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
    const page = Math.max(parseInt(req.query.page || 1, 10), 1);
    const limit = Math.min(parseInt(req.query.limit || DEFAULT_LIMIT, 10), MAX_LIMIT);
    const skip = (page - 1) * limit;

    const where = { isDeleted: 1 };

    const [data, total] = await Promise.all([
      prisma.subDomain.findMany({
        where,
        include: {
          client: {
            select: { id: true, clientCode: true, name: true },
          },
        },
        skip,
        take: limit,
        orderBy: { deletedAt: "desc" },
      }),
      prisma.subDomain.count({ where }),
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
