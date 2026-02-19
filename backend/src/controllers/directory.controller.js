const { User, Client, SubDomain } = require("../models");

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

const getDirectory = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page || 1, 10), 1);
    const limit = Math.min(parseInt(req.query.limit || DEFAULT_LIMIT, 10), MAX_LIMIT);
    const offset = (page - 1) * limit;
    const search = req.query.search || "";

    const { Op } = require("sequelize");
    const where = { isActive: 1 };
    if (search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { clientCode: { [Op.like]: `%${search}%` } }
      ];
    }

    const { rows, count } = await Client.findAndCountAll({
      where,
      include: [
        {
          model: SubDomain,
          where: { isDeleted: 0 },
          required: false
        },
        {
          model: User,
          attributes: ["id", "email", "firstName", "lastName"],
          where: { isApproved: 1 },
          required: false
        }
      ],
      limit,
      offset,
      order: [["name", "ASC"]],
      distinct: true
    });

    return res.json({ data: rows, total: count, page, limit, totalPages: Math.ceil(count / limit) });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

module.exports = { getDirectory };
