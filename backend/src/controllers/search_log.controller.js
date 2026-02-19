const { SearchLog, User, Client } = require("../models");
const { Op } = require("sequelize");

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

const getMyLogs = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page || 1, 10), 1);
    const limit = Math.min(parseInt(req.query.limit || DEFAULT_LIMIT, 10), MAX_LIMIT);
    const offset = (page - 1) * limit;

    const { rows, count } = await SearchLog.findAndCountAll({
      where: { userId: req.user.id },
      limit,
      offset,
      order: [["createdAt", "DESC"]]
    });

    return res.json({ data: rows, total: count, page, limit, totalPages: Math.ceil(count / limit) });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

const getClientAffiliateLogs = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page || 1, 10), 1);
    const limit = Math.min(parseInt(req.query.limit || DEFAULT_LIMIT, 10), MAX_LIMIT);
    const offset = (page - 1) * limit;

    // Get user's client to find all affiliates under that client
    const currentUser = await User.findByPk(req.user.id);
    if (!currentUser || !currentUser.clientId) {
      return res.status(403).json({ message: "No client assigned" });
    }

    const where = { clientId: currentUser.clientId };
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

module.exports = { getMyLogs, getClientAffiliateLogs };
