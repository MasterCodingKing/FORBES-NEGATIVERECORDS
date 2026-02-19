const { prisma } = require("../models");
const { logAudit } = require("../middleware/audit.middleware");

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

const createRequest = async (req, res) => {
  try {
    const { recordId, reason } = req.body;
    if (!recordId) {
      return res.status(400).json({ message: "recordId is required" });
    }

    const record = await prisma.negativeRecord.findUnique({
      where: { id: recordId },
    });
    if (!record) {
      return res.status(404).json({ message: "Record not found" });
    }

    const existing = await prisma.unlockRequest.findFirst({
      where: {
        requestedBy: req.user.id,
        recordId,
        status: "pending",
      },
    });
    if (existing) {
      return res
        .status(409)
        .json({ message: "You already have a pending request for this record" });
    }

    const request = await prisma.unlockRequest.create({
      data: {
        requestedBy: req.user.id,
        recordId,
        reason: reason || null,
      },
    });

    await logAudit(req, "UNLOCK_REQUEST_CREATE", "unlock_requests", request.id);
    return res.status(201).json(request);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

const listMyRequests = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page || 1, 10), 1);
    const limit = Math.min(parseInt(req.query.limit || DEFAULT_LIMIT, 10), MAX_LIMIT);
    const skip = (page - 1) * limit;

    const where = { requestedBy: req.user.id };

    const [data, total] = await Promise.all([
      prisma.unlockRequest.findMany({
        where,
        include: { negativeRecord: true },
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.unlockRequest.count({ where }),
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

const listAllRequests = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page || 1, 10), 1);
    const limit = Math.min(parseInt(req.query.limit || DEFAULT_LIMIT, 10), MAX_LIMIT);
    const skip = (page - 1) * limit;
    const where = {};
    if (req.query.status) {
      where.status = req.query.status;
    }

    const [data, total] = await Promise.all([
      prisma.unlockRequest.findMany({
        where,
        include: {
          negativeRecord: true,
          requester: {
            select: { id: true, email: true, firstName: true, lastName: true },
          },
        },
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.unlockRequest.count({ where }),
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

const reviewRequest = async (req, res) => {
  try {
    const request = await prisma.unlockRequest.findUnique({
      where: { id: parseInt(req.params.id, 10) },
    });
    if (!request) {
      return res.status(404).json({ message: "Request not found" });
    }
    if (request.status !== "pending") {
      return res.status(400).json({ message: "Request already reviewed" });
    }

    const { status } = req.body;
    if (!["approved", "denied"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const updated = await prisma.unlockRequest.update({
      where: { id: request.id },
      data: {
        status,
        reviewedBy: req.user.id,
        reviewedAt: new Date(),
      },
    });

    await logAudit(
      req,
      `UNLOCK_REQUEST_${status.toUpperCase()}`,
      "unlock_requests",
      request.id
    );
    return res.json(updated);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

module.exports = { createRequest, listMyRequests, listAllRequests, reviewRequest };
