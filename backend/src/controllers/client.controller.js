const { prisma } = require("../models");
const { logAudit } = require("../middleware/audit.middleware");
const { parsePaginationParams, paginatedResponse } = require("../utils/pagination");

const list = async (req, res) => {
  try {
    const { page, limit, skip, where, orderBy } = parsePaginationParams(req.query, {
      searchableFields: ["clientCode", "name", "clientGroup", "email"],
      defaultSort: "createdAt",
      defaultOrder: "desc",
      sortableFields: ["createdAt", "name", "clientCode", "clientGroup", "billingType"],
    });

    where.isActive = 1;

    const [data, total] = await Promise.all([
      prisma.client.findMany({ where, skip, take: limit, orderBy }),
      prisma.client.count({ where }),
    ]);

    return res.json(paginatedResponse(data, total, page, limit));
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

const getById = async (req, res) => {
  try {
    const client = await prisma.client.findFirst({
      where: { id: parseInt(req.params.id, 10), isActive: 1 },
    });
    if (!client) {
      return res.status(404).json({ message: "Client not found" });
    }
    return res.json(client);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

const create = async (req, res) => {
  try {
    const {
      clientCode, name, clientGroup,
      website, street, barangay, city, province, postalCode,
      telephone, fax, mobile, email,
      billingType, creditLimit,
    } = req.body;

    if (!clientCode || !name) {
      return res.status(400).json({ message: "Client code and name are required" });
    }

    const existing = await prisma.client.findUnique({ where: { clientCode } });
    if (existing) {
      return res.status(409).json({ message: "Client code already exists" });
    }

    const client = await prisma.client.create({
      data: {
        clientCode,
        name,
        clientGroup: clientGroup || null,
        website: website || null,
        street: street || null,
        barangay: barangay || null,
        city: city || null,
        province: province || null,
        postalCode: postalCode || null,
        telephone: telephone || null,
        fax: fax || null,
        mobile: mobile || null,
        email: email || null,
        billingType: billingType || "Postpaid",
        creditBalance: 0,
        creditLimit: billingType === "Prepaid" ? (creditLimit || 0) : null,
        isActive: 1,
      },
    });

    await logAudit(req, "CLIENT_CREATE", "clients", client.id);
    return res.status(201).json(client);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

const update = async (req, res) => {
  try {
    const client = await prisma.client.findFirst({
      where: { id: parseInt(req.params.id, 10), isActive: 1 },
    });
    if (!client) {
      return res.status(404).json({ message: "Client not found" });
    }

    const allowedFields = [
      "clientCode", "name", "clientGroup",
      "website", "street", "barangay", "city", "province", "postalCode",
      "telephone", "fax", "mobile", "email",
      "billingType", "creditLimit",
    ];

    const updateData = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    }

    // If switching to Postpaid, clear creditLimit
    if ((updateData.billingType || client.billingType) === "Postpaid") {
      updateData.creditLimit = null;
    }

    const updated = await prisma.client.update({
      where: { id: client.id },
      data: updateData,
    });

    await logAudit(req, "CLIENT_UPDATE", "clients", client.id);
    return res.json(updated);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

const remove = async (req, res) => {
  try {
    const client = await prisma.client.findFirst({
      where: { id: parseInt(req.params.id, 10), isActive: 1 },
    });
    if (!client) {
      return res.status(404).json({ message: "Client not found" });
    }

    await prisma.client.update({
      where: { id: client.id },
      data: { isActive: 0 },
    });

    await logAudit(req, "CLIENT_DELETE", "clients", client.id);
    return res.json({ message: "Client deleted" });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

module.exports = { list, getById, create, update, remove };
