const { Client } = require("../models");
const { logAudit } = require("../middleware/audit.middleware");
const { Op } = require("sequelize");

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

const list = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page || 1, 10), 1);
    const limit = Math.min(parseInt(req.query.limit || DEFAULT_LIMIT, 10), MAX_LIMIT);
    const offset = (page - 1) * limit;
    const search = req.query.search || "";

    const where = { isActive: 1 };
    if (search) {
      where[Op.or] = [
        { clientCode: { [Op.like]: `%${search}%` } },
        { name: { [Op.like]: `%${search}%` } },
        { clientGroup: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } }
      ];
    }

    const { rows, count } = await Client.findAndCountAll({
      where,
      limit,
      offset,
      order: [["createdAt", "DESC"]]
    });

    return res.json({
      data: rows,
      total: count,
      page,
      limit,
      totalPages: Math.ceil(count / limit)
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

const getById = async (req, res) => {
  try {
    const client = await Client.findOne({
      where: { id: req.params.id, isActive: 1 }
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
      billingType, creditLimit
    } = req.body;

    if (!clientCode || !name) {
      return res.status(400).json({ message: "Client code and name are required" });
    }

    const existing = await Client.findOne({ where: { clientCode } });
    if (existing) {
      return res.status(409).json({ message: "Client code already exists" });
    }

    const client = await Client.create({
      clientCode, name, clientGroup,
      website, street, barangay, city, province, postalCode,
      telephone, fax, mobile, email,
      billingType: billingType || "Postpaid",
      creditBalance: 0,
      creditLimit: billingType === "Prepaid" ? (creditLimit || 0) : null,
      isActive: 1
    });

    await logAudit(req, "CLIENT_CREATE", "clients", client.id);
    return res.status(201).json(client);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

const update = async (req, res) => {
  try {
    const client = await Client.findOne({
      where: { id: req.params.id, isActive: 1 }
    });
    if (!client) {
      return res.status(404).json({ message: "Client not found" });
    }

    const allowedFields = [
      "clientCode", "name", "clientGroup",
      "website", "street", "barangay", "city", "province", "postalCode",
      "telephone", "fax", "mobile", "email",
      "billingType", "creditLimit"
    ];

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        client[field] = req.body[field];
      }
    }

    // If switching to Postpaid, clear creditLimit
    if (client.billingType === "Postpaid") {
      client.creditLimit = null;
    }

    await client.save();
    await logAudit(req, "CLIENT_UPDATE", "clients", client.id);
    return res.json(client);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

const remove = async (req, res) => {
  try {
    const client = await Client.findOne({
      where: { id: req.params.id, isActive: 1 }
    });
    if (!client) {
      return res.status(404).json({ message: "Client not found" });
    }

    await client.update({ isActive: 0 });
    await logAudit(req, "CLIENT_DELETE", "clients", client.id);
    return res.json({ message: "Client deleted" });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

module.exports = { list, getById, create, update, remove };
