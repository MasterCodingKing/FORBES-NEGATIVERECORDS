const { News } = require("../models");
const { logAudit } = require("../middleware/audit.middleware");

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

const list = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page || 1, 10), 1);
    const limit = Math.min(parseInt(req.query.limit || DEFAULT_LIMIT, 10), MAX_LIMIT);
    const offset = (page - 1) * limit;
    const search = req.query.search || "";

    const where = {};
    if (search) {
      const { Op } = require("sequelize");
      where[Op.or] = [
        { title: { [Op.like]: `%${search}%` } },
        { content: { [Op.like]: `%${search}%` } }
      ];
    }

    const { rows, count } = await News.findAndCountAll({
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

const getById = async (req, res) => {
  try {
    const news = await News.findByPk(req.params.id);
    if (!news) {
      return res.status(404).json({ message: "News not found" });
    }
    return res.json(news);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

const create = async (req, res) => {
  try {
    const { title, content, imageUrl } = req.body;
    if (!title || !content) {
      return res.status(400).json({ message: "Title and content are required" });
    }

    const news = await News.create({
      title,
      content,
      imageUrl: imageUrl || null,
      createdBy: req.user.id
    });

    await logAudit(req, "NEWS_CREATE", "news", news.id);
    return res.status(201).json(news);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

const update = async (req, res) => {
  try {
    const news = await News.findByPk(req.params.id);
    if (!news) {
      return res.status(404).json({ message: "News not found" });
    }

    const { title, content, imageUrl } = req.body;
    if (title) news.title = title;
    if (content) news.content = content;
    if (imageUrl !== undefined) news.imageUrl = imageUrl;
    await news.save();

    await logAudit(req, "NEWS_UPDATE", "news", news.id);
    return res.json(news);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

const remove = async (req, res) => {
  try {
    const news = await News.findByPk(req.params.id);
    if (!news) {
      return res.status(404).json({ message: "News not found" });
    }

    await news.destroy();
    await logAudit(req, "NEWS_DELETE", "news", parseInt(req.params.id, 10));
    return res.json({ message: "News deleted" });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

module.exports = { list, getById, create, update, remove };
