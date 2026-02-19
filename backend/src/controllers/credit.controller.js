const { Client, CreditTransaction, SearchLog, User } = require("../models");
const { logAudit } = require("../middleware/audit.middleware");
const { Op } = require("sequelize");

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

const topUp = async (req, res) => {
  try {
    const { clientId, amount } = req.body;
    if (!clientId || !amount || amount <= 0) {
      return res.status(400).json({ message: "clientId and positive amount required" });
    }

    const client = await Client.findOne({ where: { id: clientId, isActive: 1 } });
    if (!client) {
      return res.status(404).json({ message: "Client not found" });
    }

    await CreditTransaction.create({
      clientId,
      amount,
      type: "topup",
      description: `Credit top-up of ${amount}`,
      performedBy: req.user.id
    });

    client.creditBalance = parseFloat(client.creditBalance) + parseFloat(amount);
    await client.save();

    await logAudit(req, "CREDIT_TOPUP", "credit_transactions", client.id);

    return res.json({
      message: "Credit added",
      creditBalance: client.creditBalance
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

const getClientCredit = async (req, res) => {
  try {
    const client = await Client.findOne({
      where: { id: req.params.clientId, isActive: 1 },
      attributes: ["id", "name", "creditBalance"]
    });
    if (!client) {
      return res.status(404).json({ message: "Client not found" });
    }
    return res.json(client);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

const getTransactionHistory = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page || 1, 10), 1);
    const limit = Math.min(parseInt(req.query.limit || DEFAULT_LIMIT, 10), MAX_LIMIT);
    const offset = (page - 1) * limit;

    const where = {};
    if (req.params.clientId) {
      where.clientId = req.params.clientId;
    }

    const { rows, count } = await CreditTransaction.findAndCountAll({
      where,
      limit,
      offset,
      order: [["createdAt", "DESC"]]
    });

    return res.json({ data: rows, total: count, page, limit, totalPages: Math.ceil(count / limit) });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

const getSearchLogsByClient = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page || 1, 10), 1);
    const limit = Math.min(parseInt(req.query.limit || DEFAULT_LIMIT, 10), MAX_LIMIT);
    const offset = (page - 1) * limit;

    const where = { clientId: req.params.clientId };
    if (req.query.from && req.query.to) {
      where.createdAt = {
        [Op.between]: [new Date(req.query.from), new Date(req.query.to)]
      };
    }

    const { rows, count } = await SearchLog.findAndCountAll({
      where,
      include: [{ model: User, attributes: ["id", "email", "firstName", "lastName"] }],
      limit,
      offset,
      order: [["createdAt", "DESC"]]
    });

    return res.json({ data: rows, total: count, page, limit, totalPages: Math.ceil(count / limit) });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

module.exports = { topUp, getClientCredit, getTransactionHistory, getSearchLogsByClient };
