const { UnlockRequest, NegativeRecord, User } = require("../models");
const { logAudit } = require("../middleware/audit.middleware");

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

const createRequest = async (req, res) => {
  try {
    const { recordId, reason } = req.body;
    if (!recordId) {
      return res.status(400).json({ message: "recordId is required" });
    }

    const record = await NegativeRecord.findByPk(recordId);
    if (!record) {
      return res.status(404).json({ message: "Record not found" });
    }

    const existing = await UnlockRequest.findOne({
      where: { requestedBy: req.user.id, recordId, status: "pending" }
    });
    if (existing) {
      return res.status(409).json({ message: "You already have a pending request for this record" });
    }

    const request = await UnlockRequest.create({
      requestedBy: req.user.id,
      recordId,
      reason: reason || null
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
    const offset = (page - 1) * limit;

    const { rows, count } = await UnlockRequest.findAndCountAll({
      where: { requestedBy: req.user.id },
      include: [{ model: NegativeRecord }],
      limit,
      offset,
      order: [["createdAt", "DESC"]]
    });

    return res.json({ data: rows, total: count, page, limit, totalPages: Math.ceil(count / limit) });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

const listAllRequests = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page || 1, 10), 1);
    const limit = Math.min(parseInt(req.query.limit || DEFAULT_LIMIT, 10), MAX_LIMIT);
    const offset = (page - 1) * limit;
    const where = {};
    if (req.query.status) {
      where.status = req.query.status;
    }

    const { rows, count } = await UnlockRequest.findAndCountAll({
      where,
      include: [
        { model: NegativeRecord },
        { model: User, as: "Requester", attributes: ["id", "email", "firstName", "lastName"] }
      ],
      limit,
      offset,
      order: [["createdAt", "DESC"]]
    });

    return res.json({ data: rows, total: count, page, limit, totalPages: Math.ceil(count / limit) });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

const reviewRequest = async (req, res) => {
  try {
    const request = await UnlockRequest.findByPk(req.params.id);
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

    await request.update({
      status,
      reviewedBy: req.user.id,
      reviewedAt: new Date()
    });

    await logAudit(req, `UNLOCK_REQUEST_${status.toUpperCase()}`, "unlock_requests", request.id);
    return res.json(request);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

module.exports = { createRequest, listMyRequests, listAllRequests, reviewRequest };
