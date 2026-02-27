const { prisma } = require("../models");
const { logAudit } = require("../middleware/audit.middleware");
const { parsePaginationParams, paginatedResponse } = require("../utils/pagination");

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

    // Get requester's full info for notifications
    const requester = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { client: { select: { id: true, name: true } } },
    });
    const requesterName = [requester.firstName, requester.lastName].filter(Boolean).join(" ") || requester.email;
    const requesterAffiliate = requester.client?.name || "Unknown Affiliate";

    // Notify the requesting user (confirmation)
    await prisma.notification.create({
      data: {
        userId: req.user.id,
        type: "UNLOCK_REQUEST",
        title: "Access Request Submitted",
        message: `Your access request for record #${recordId} has been submitted and is pending review.`,
        relatedId: request.id,
      },
    });

    // Notify the lock owner that someone is requesting access
    const lock = await prisma.recordLock.findUnique({
      where: { recordId },
      select: { lockedBy: true },
    });
    if (lock && lock.lockedBy !== req.user.id) {
      await prisma.notification.create({
        data: {
          userId: lock.lockedBy,
          type: "UNLOCK_REQUEST_RECEIVED",
          title: "New Access Request",
          message: `You have an access request from ${requesterAffiliate} — ${requesterName} for record #${recordId}.${
            reason ? ` Reason: "${reason}"` : ""
          }`,
          relatedId: request.id,
        },
      });
    }

    // Notify all admins about the new unlock request
    const adminRoles = await prisma.role.findMany({
      where: { name: { in: ["Admin", "Super Admin"] } },
    });
    const adminRoleIds = adminRoles.map((r) => r.id);
    const admins = await prisma.user.findMany({
      where: { roleId: { in: adminRoleIds }, isApproved: 1 },
      select: { id: true },
    });
    if (admins.length > 0) {
      await prisma.notification.createMany({
        data: admins.map((admin) => ({
          userId: admin.id,
          type: "UNLOCK_REQUEST_NEW",
          title: "New Unlock Request",
          message: `${requesterAffiliate} — ${requesterName} submitted an unlock request for record #${recordId}.${
            reason ? ` Reason: "${reason}"` : ""
          }`,
          relatedId: request.id,
        })),
        skipDuplicates: true,
      });
    }

    return res.status(201).json(request);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

const listMyRequests = async (req, res) => {
  try {
    const { page, limit, skip, orderBy } = parsePaginationParams(req.query, {
      defaultSort: "createdAt",
      defaultOrder: "desc",
      sortableFields: ["createdAt", "status"],
    });

    const where = { requestedBy: req.user.id };

    const [data, total] = await Promise.all([
      prisma.unlockRequest.findMany({
        where,
        include: { negativeRecord: true },
        skip,
        take: limit,
        orderBy,
      }),
      prisma.unlockRequest.count({ where }),
    ]);

    return res.json(paginatedResponse(data, total, page, limit));
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

const listAllRequests = async (req, res) => {
  try {
    const { page, limit, skip, orderBy } = parsePaginationParams(req.query, {
      defaultSort: "createdAt",
      defaultOrder: "desc",
      sortableFields: ["createdAt", "status"],
    });

    const where = {};
    if (req.query.status) {
      where.status = req.query.status;
    }

    const [data, total] = await Promise.all([
      prisma.unlockRequest.findMany({
        where,
        include: {
          negativeRecord: {
            include: {
              recordLock: {
                include: {
                  user: { select: { id: true, email: true, firstName: true, lastName: true } },
                },
              },
            },
          },
          requester: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              telephone: true,
              mobileNumber: true,
              position: true,
              client: { select: { id: true, name: true } },
              branch: { select: { id: true, name: true } },
            },
          },
        },
        skip,
        take: limit,
        orderBy,
      }),
      prisma.unlockRequest.count({ where }),
    ]);

    return res.json(paginatedResponse(data, total, page, limit));
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

    // Check authorization: admin OR lock owner can review
    const userRole = req.user.role;
    const isAdmin = userRole === "Super Admin" || userRole === "Admin";

    if (!isAdmin) {
      // Check if current user is the lock owner for this record
      const lock = await prisma.recordLock.findUnique({
        where: { recordId: request.recordId },
      });
      if (!lock || lock.lockedBy !== req.user.id) {
        return res.status(403).json({ message: "Not authorized to review this request" });
      }
    }

    const { status, denialReason } = req.body;
    if (!["approved", "denied"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }
    if (status === "denied" && !denialReason?.trim()) {
      return res.status(400).json({ message: "denialReason is required when denying a request" });
    }

    // Get reviewer info for notification messages
    const reviewer = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { client: { select: { name: true } } },
    });
    const reviewerName = [reviewer.firstName, reviewer.lastName].filter(Boolean).join(" ") || reviewer.email;
    const reviewerAffiliate = reviewer.client?.name || "Admin";

    // Get requester info for the approval notification
    const requestRequester = await prisma.user.findUnique({
      where: { id: request.requestedBy },
      include: { client: { select: { name: true } } },
    });
    const requesterName = [requestRequester.firstName, requestRequester.lastName].filter(Boolean).join(" ") || requestRequester.email;
    const requesterAffiliate = requestRequester.client?.name || "Unknown Affiliate";

    // Get record name for notification messages
    const recordForNotif = await prisma.negativeRecord.findUnique({
      where: { id: request.recordId },
      select: { type: true, firstName: true, middleName: true, lastName: true, companyName: true },
    });
    const recordName = recordForNotif
      ? recordForNotif.type === "Individual"
        ? [recordForNotif.firstName, recordForNotif.middleName, recordForNotif.lastName].filter(Boolean).join(" ") || `Record #${request.recordId}`
        : recordForNotif.companyName || `Record #${request.recordId}`
      : `Record #${request.recordId}`;

    // Update the request status
    const updated = await prisma.unlockRequest.update({
      where: { id: request.id },
      data: {
        status,
        reviewedBy: req.user.id,
        reviewedAt: new Date(),
      },
    });

    // If approved, transfer the lock to the requester
    if (status === "approved") {
      await prisma.recordLock.update({
        where: { recordId: request.recordId },
        data: {
          lockedBy: request.requestedBy,
          lockedAt: new Date(),
        },
      });

      // Log the transfer in lock history
      await prisma.lockHistory.create({
        data: {
          recordId: request.recordId,
          lockedBy: request.requestedBy,
          action: "LOCK_TRANSFERRED",
        },
      });

      // Auto-deny all other pending requests for the same record
      await prisma.unlockRequest.updateMany({
        where: {
          recordId: request.recordId,
          status: "pending",
          id: { not: request.id },
        },
        data: {
          status: "denied",
          reviewedBy: req.user.id,
          reviewedAt: new Date(),
        },
      });

      await logAudit(req, "RECORD_LOCK_TRANSFER", "record_locks", request.recordId);
    }

    // Notify the requester about the decision
    if (status === "approved") {
      await prisma.notification.create({
        data: {
          userId: request.requestedBy,
          type: "UNLOCK_REQUEST_APPROVED",
          title: "Access Request Approved",
          message: `Your access request for "${recordName}" has been approved by ${reviewerAffiliate} — ${reviewerName}. You now have full access to this record.`,
          relatedId: request.id,
        },
      });
    } else {
      await prisma.notification.create({
        data: {
          userId: request.requestedBy,
          type: "UNLOCK_REQUEST_DENIED",
          title: "Access Request Denied",
          message: `Your access request for "${recordName}" has been denied by ${reviewerAffiliate} — ${reviewerName}. Reason: "${denialReason}".`,
          relatedId: request.id,
        },
      });
    }

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

// List unlock requests for records the current user owns (locked by them)
const listOwnedRequests = async (req, res) => {
  try {
    const { page, limit, skip, orderBy } = parsePaginationParams(req.query, {
      defaultSort: "createdAt",
      defaultOrder: "desc",
      sortableFields: ["createdAt", "status"],
    });

    // Find all records locked by the current user
    const myLocks = await prisma.recordLock.findMany({
      where: { lockedBy: req.user.id },
      select: { recordId: true },
    });
    const myRecordIds = myLocks.map((l) => l.recordId);

    const where = { recordId: { in: myRecordIds } };
    if (req.query.status) {
      where.status = req.query.status;
    }

    const [data, total] = await Promise.all([
      prisma.unlockRequest.findMany({
        where,
        include: {
          negativeRecord: true,
          requester: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              telephone: true,
              mobileNumber: true,
              position: true,
              client: { select: { id: true, name: true } },
              branch: { select: { id: true, name: true } },
            },
          },
        },
        skip,
        take: limit,
        orderBy,
      }),
      prisma.unlockRequest.count({ where }),
    ]);

    return res.json(paginatedResponse(data, total, page, limit));
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

const getRequest = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const request = await prisma.unlockRequest.findUnique({
      where: { id },
      include: {
        negativeRecord: {
          include: {
            recordLock: {
              include: {
                user: { select: { id: true, email: true, firstName: true, lastName: true } },
              },
            },
          },
        },
        requester: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            telephone: true,
            mobileNumber: true,
            position: true,
            client: { select: { id: true, name: true } },
            branch: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!request) {
      return res.status(404).json({ message: "Request not found" });
    }

    // Allow: admin roles OR the requester OR the lock owner
    const userRole = req.user.role;
    const isAdmin = userRole === "Super Admin" || userRole === "Admin";
    const isRequester = request.requestedBy === req.user.id;
    const isLockOwner = request.negativeRecord?.recordLock?.lockedBy === req.user.id;

    if (!isAdmin && !isRequester && !isLockOwner) {
      return res.status(403).json({ message: "Not authorized" });
    }

    return res.json(request);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

module.exports = { createRequest, listMyRequests, listAllRequests, reviewRequest, listOwnedRequests, getRequest };
