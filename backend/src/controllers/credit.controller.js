const { prisma } = require("../models");
const { logAudit } = require("../middleware/audit.middleware");

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

const topUp = async (req, res) => {
  try {
    const { clientId, amount } = req.body;
    if (!clientId || !amount || amount <= 0) {
      return res.status(400).json({ message: "clientId and positive amount required" });
    }

    const client = await prisma.client.findFirst({
      where: { id: clientId, isActive: 1 },
    });
    if (!client) {
      return res.status(404).json({ message: "Client not found" });
    }

    await prisma.creditTransaction.create({
      data: {
        clientId,
        amount,
        type: "topup",
        description: `Credit top-up of ${amount}`,
        performedBy: req.user.id,
      },
    });

    const updatedClient = await prisma.client.update({
      where: { id: clientId },
      data: {
        creditBalance: parseFloat(client.creditBalance) + parseFloat(amount),
      },
    });

    await logAudit(req, "CREDIT_TOPUP", "credit_transactions", client.id);

    return res.json({
      message: "Credit added",
      creditBalance: updatedClient.creditBalance,
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

const getClientCredit = async (req, res) => {
  try {
    const client = await prisma.client.findFirst({
      where: { id: parseInt(req.params.clientId, 10), isActive: 1 },
      select: { id: true, name: true, creditBalance: true },
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
    const skip = (page - 1) * limit;

    const where = {};
    if (req.params.clientId) {
      where.clientId = parseInt(req.params.clientId, 10);
    }

    const [data, total] = await Promise.all([
      prisma.creditTransaction.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.creditTransaction.count({ where }),
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

const getSearchLogsByClient = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page || 1, 10), 1);
    const limit = Math.min(parseInt(req.query.limit || DEFAULT_LIMIT, 10), MAX_LIMIT);
    const skip = (page - 1) * limit;

    const where = { clientId: parseInt(req.params.clientId, 10) };
    if (req.query.from && req.query.to) {
      where.createdAt = {
        gte: new Date(req.query.from),
        lte: new Date(req.query.to),
      };
    }

    const [data, total] = await Promise.all([
      prisma.searchLog.findMany({
        where,
        include: {
          user: {
            select: { id: true, email: true, firstName: true, lastName: true },
          },
        },
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.searchLog.count({ where }),
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

module.exports = { topUp, getClientCredit, getTransactionHistory, getSearchLogsByClient };
