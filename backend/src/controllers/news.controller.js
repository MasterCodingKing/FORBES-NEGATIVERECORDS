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

    const where = {};
    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { content: { contains: search, mode: "insensitive" } },
      ];
    }

    const [data, total] = await Promise.all([
      prisma.news.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.news.count({ where }),
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

const getById = async (req, res) => {
  try {
    const news = await prisma.news.findUnique({
      where: { id: parseInt(req.params.id, 10) },
    });
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

    const news = await prisma.news.create({
      data: {
        title,
        content,
        imageUrl: imageUrl || null,
        createdBy: req.user.id,
      },
    });

    await logAudit(req, "NEWS_CREATE", "news", news.id);
    return res.status(201).json(news);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

const update = async (req, res) => {
  try {
    const news = await prisma.news.findUnique({
      where: { id: parseInt(req.params.id, 10) },
    });
    if (!news) {
      return res.status(404).json({ message: "News not found" });
    }

    const updateData = {};
    const { title, content, imageUrl } = req.body;
    if (title) updateData.title = title;
    if (content) updateData.content = content;
    if (imageUrl !== undefined) updateData.imageUrl = imageUrl;

    const updated = await prisma.news.update({
      where: { id: news.id },
      data: updateData,
    });

    await logAudit(req, "NEWS_UPDATE", "news", news.id);
    return res.json(updated);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

const remove = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const news = await prisma.news.findUnique({ where: { id } });
    if (!news) {
      return res.status(404).json({ message: "News not found" });
    }

    await prisma.news.delete({ where: { id } });
    await logAudit(req, "NEWS_DELETE", "news", id);
    return res.json({ message: "News deleted" });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

module.exports = { list, getById, create, update, remove };
