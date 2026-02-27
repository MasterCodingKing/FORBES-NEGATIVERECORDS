const { prisma } = require("../models");
const { parsePaginationParams, paginatedResponse } = require("../utils/pagination");

const listNotifications = async (req, res) => {
  try {
    const { page, limit, skip, where, orderBy } = parsePaginationParams(req.query, {
      searchableFields: ["title", "message"],
      defaultSort: "createdAt",
      defaultOrder: "desc",
      sortableFields: ["createdAt"],
    });

    where.userId = req.user.id;

    const [data, total] = await Promise.all([
      prisma.notification.findMany({ where, skip, take: limit, orderBy }),
      prisma.notification.count({ where }),
    ]);

    return res.json(paginatedResponse(data, total, page, limit));
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

const getUnreadCount = async (req, res) => {
  try {
    const count = await prisma.notification.count({
      where: { userId: req.user.id, isRead: 0 },
    });
    return res.json({ count });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

const markAsRead = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const notification = await prisma.notification.findUnique({ where: { id } });
    if (!notification || notification.userId !== req.user.id) {
      return res.status(404).json({ message: "Notification not found" });
    }

    await prisma.notification.update({
      where: { id },
      data: { isRead: 1 },
    });

    return res.json({ message: "Marked as read" });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

const markAllAsRead = async (req, res) => {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.user.id, isRead: 0 },
      data: { isRead: 1 },
    });

    return res.json({ message: "All notifications marked as read" });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

module.exports = { listNotifications, getUnreadCount, markAsRead, markAllAsRead };
