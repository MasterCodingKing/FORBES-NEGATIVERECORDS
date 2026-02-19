const { SubDomain, Client } = require("../models");
const { logAudit } = require("../middleware/audit.middleware");
const { Op } = require("sequelize");

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

const list = async (req, res) => {
  const page = Math.max(parseInt(req.query.page || 1, 10), 1);
  const limit = Math.min(parseInt(req.query.limit || DEFAULT_LIMIT, 10), MAX_LIMIT);
  const offset = (page - 1) * limit;
  const search = req.query.search || "";
  const clientId = req.query.clientId || "";

  const where = { isDeleted: 0 };
  if (clientId) {
    where.clientId = clientId;
  }
  if (search) {
    where[Op.or] = [
      { name: { [Op.like]: `%${search}%` } },
      { clientCode: { [Op.like]: `%${search}%` } }
    ];
  }

  const { rows, count } = await SubDomain.findAndCountAll({
    where,
    include: [{ model: Client, attributes: ["id", "clientCode", "name"] }],
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
};

const create = async (req, res) => {
  const { name, clientId, status } = req.body;

  if (!name || !clientId) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  // Look up client to populate clientCode
  const client = await Client.findByPk(clientId);
  if (!client) {
    return res.status(404).json({ message: "Client not found" });
  }

  const subDomain = await SubDomain.create({
    name,
    clientId,
    clientCode: client.clientCode,
    status: status || "Active"
  });

  await logAudit(req, "SUB_DOMAIN_CREATE", "sub_domains", subDomain.id);
  return res.status(201).json(subDomain);
};

const update = async (req, res) => {
  const { id } = req.params;
  const subDomain = await SubDomain.findOne({ where: { id, isDeleted: 0 } });
  if (!subDomain) {
    return res.status(404).json({ message: "Not found" });
  }

  const { name, clientId, status } = req.body;
  if (name !== undefined) subDomain.name = name;
  if (status !== undefined) subDomain.status = status;
  if (clientId !== undefined) {
    const client = await Client.findByPk(clientId);
    if (!client) return res.status(404).json({ message: "Client not found" });
    subDomain.clientId = clientId;
    subDomain.clientCode = client.clientCode;
  }

  await subDomain.save();
  await logAudit(req, "SUB_DOMAIN_UPDATE", "sub_domains", subDomain.id);
  return res.json(subDomain);
};

const softDelete = async (req, res) => {
  const { id } = req.params;

  const subDomain = await SubDomain.findOne({ where: { id, isDeleted: 0 } });
  if (!subDomain) {
    return res.status(404).json({ message: "Not found" });
  }

  await subDomain.update({
    isDeleted: 1,
    deletedAt: new Date(),
    deletedBy: req.user.id
  });

  await logAudit(req, "SUB_DOMAIN_SOFT_DELETE", "sub_domains", subDomain.id);

  return res.json({ message: "Deleted" });
};

const listTrash = async (req, res) => {
  const page = Math.max(parseInt(req.query.page || 1, 10), 1);
  const limit = Math.min(parseInt(req.query.limit || DEFAULT_LIMIT, 10), MAX_LIMIT);
  const offset = (page - 1) * limit;

  const { rows, count } = await SubDomain.findAndCountAll({
    where: { isDeleted: 1 },
    include: [{ model: Client, attributes: ["id", "clientCode", "name"] }],
    limit,
    offset,
    order: [["deletedAt", "DESC"]]
  });

  return res.json({
    data: rows,
    total: count,
    page,
    limit,
    totalPages: Math.ceil(count / limit)
  });
};

const restore = async (req, res) => {
  const { id } = req.params;

  const subDomain = await SubDomain.findOne({ where: { id, isDeleted: 1 } });
  if (!subDomain) {
    return res.status(404).json({ message: "Not found" });
  }

  await subDomain.update({
    isDeleted: 0,
    deletedAt: null,
    deletedBy: null
  });

  await logAudit(req, "SUB_DOMAIN_RESTORE", "sub_domains", subDomain.id);

  return res.json({ message: "Restored" });
};

const forceDelete = async (req, res) => {
  const { id } = req.params;

  const subDomain = await SubDomain.findOne({ where: { id } });
  if (!subDomain) {
    return res.status(404).json({ message: "Not found" });
  }

  await subDomain.destroy();

  await logAudit(req, "SUB_DOMAIN_FORCE_DELETE", "sub_domains", parseInt(id, 10));

  return res.json({ message: "Force deleted" });
};

module.exports = {
  list,
  create,
  update,
  softDelete,
  listTrash,
  restore,
  forceDelete
};
