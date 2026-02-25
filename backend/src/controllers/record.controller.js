const { prisma } = require("../models");
const { logAudit } = require("../middleware/audit.middleware");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

// --- OCR Upload & Parse ---

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, "../../uploads/ocr");
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowed = [".pdf", ".png", ".jpg", ".jpeg"];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error("Only PDF and image files are allowed"));
    }
  },
  limits: { fileSize: 20 * 1024 * 1024 },
});

const uploadAndProcess = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "File is required" });
    }

    const batch = await prisma.ocrBatch.create({
      data: {
        fileName: req.file.originalname,
        filePath: req.file.path,
        status: "pending",
        uploadedBy: req.user.id,
      },
    });

    // Mark processing — real OCR would run here (e.g. Tesseract).
    await prisma.ocrBatch.update({
      where: { id: batch.id },
      data: { status: "processing" },
    });

    // Placeholder: in production, integrate tesseract.js or a cloud OCR API
    const updatedBatch = await prisma.ocrBatch.update({
      where: { id: batch.id },
      data: { status: "completed", totalRecords: 0 },
    });

    await logAudit(req, "OCR_UPLOAD", "ocr_batches", batch.id);

    return res.status(201).json({
      message: "File uploaded and queued for OCR processing",
      batch: updatedBatch,
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// --- Manual record CRUD ---

const createRecord = async (req, res) => {
  try {
    const {
      type, firstName, middleName, lastName, alias, companyName,
      caseNo, plaintiff, caseType, courtType, branch, city, dateFiled,
      bounce, decline, delinquent, telecom, watch,
      isScanned, isScannedCsv, isScannedPdf,
      details, source
    } = req.body;

    if (!type) {
      return res.status(400).json({ message: "type is required (Individual or Company)" });
    }
    if (!caseNo || !plaintiff || !caseType || !courtType || !branch || !dateFiled) {
      return res.status(400).json({
        message: "caseNo, plaintiff, caseType, courtType, branch, and dateFiled are required",
      });
    }
    if (type === "Individual" && !lastName && !firstName) {
      return res.status(400).json({ message: "lastName or firstName is required for Individual records" });
    }

    const record = await prisma.negativeRecord.create({
      data: {
        type,
        firstName: firstName || null,
        middleName: middleName || null,
        lastName: lastName || null,
        alias: alias || null,
        companyName: companyName || null,
        caseNo,
        plaintiff,
        caseType,
        courtType,
        branch,
        city: city || null,
        dateFiled: new Date(dateFiled),
        bounce: bounce || null,
        decline: decline || null,
        delinquent: delinquent || null,
        telecom: telecom || null,
        watch: watch || null,
        isScanned: isScanned ? 1 : 0,
        isScannedCsv: isScannedCsv ? 1 : 0,
        isScannedPdf: isScannedPdf ? 1 : 0,
        details: details || null,
        source: source || null,
      },
    });

    await logAudit(req, "RECORD_CREATE", "negative_records", record.id);
    return res.status(201).json(record);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

const listRecords = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page || 1, 10), 1);
    const limit = Math.min(parseInt(req.query.limit || DEFAULT_LIMIT, 10), MAX_LIMIT);
    const skip = (page - 1) * limit;
    const search = req.query.search || "";

    const where = {};
    if (req.query.type) where.type = req.query.type;
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
        { companyName: { contains: search, mode: "insensitive" } },
        { source: { contains: search, mode: "insensitive" } },
        { caseNo: { contains: search, mode: "insensitive" } },
        { plaintiff: { contains: search, mode: "insensitive" } },
      ];
    }

    const [data, total] = await Promise.all([
      prisma.negativeRecord.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.negativeRecord.count({ where }),
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

// --- Search (Affiliate) ---

const search = async (req, res) => {
  try {
    const { type, term, firstName, middleName, lastName } = req.query;
    if (!type) {
      return res.status(400).json({ message: "type is required" });
    }

    // Validate search inputs
    if (type === "Individual") {
      if (!firstName && !middleName && !lastName) {
        return res.status(400).json({ message: "At least one name field is required" });
      }
    } else {
      if (!term) {
        return res.status(400).json({ message: "term is required for Company search" });
      }
    }

    const userId = req.user.id;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.clientId) {
      return res.status(403).json({ message: "No client assigned" });
    }

    const client = await prisma.client.findFirst({
      where: { id: user.clientId, isActive: 1 },
    });
    if (!client) {
      return res.status(403).json({ message: "Client not found" });
    }

    // Build search term string for duplicate detection
    const searchTermStr =
      type === "Individual"
        ? [firstName, middleName, lastName]
            .map((s) => (s || "").trim().toLowerCase())
            .join("|")
        : term.trim().toLowerCase();

    // Build search query
    const searchWhere = { type };
    if (type === "Individual") {
      const andConditions = [];
      if (firstName) {
        andConditions.push({ firstName: { contains: firstName.trim(), mode: "insensitive" } });
      }
      if (middleName) {
        andConditions.push({ middleName: { contains: middleName.trim(), mode: "insensitive" } });
      }
      if (lastName) {
        andConditions.push({ lastName: { contains: lastName.trim(), mode: "insensitive" } });
      }
      searchWhere.AND = andConditions;
    } else {
      searchWhere.companyName = { contains: term, mode: "insensitive" };
    }

    const results = await prisma.negativeRecord.findMany({
      where: searchWhere,
      include: {
        recordLock: {
          select: {
            id: true,
            lockedBy: true,
            lockedAt: true,
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                client: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
      take: 50,
    });

    // Process locking for each result
    const processedResults = [];
    for (const record of results) {
      const lock = record.recordLock;

      // Base record fields to return
      const baseFields = {
        id: record.id,
        type: record.type,
        firstName: record.firstName,
        middleName: record.middleName,
        lastName: record.lastName,
        alias: record.alias,
        companyName: record.companyName,
        caseNo: record.caseNo,
        plaintiff: record.plaintiff,
        caseType: record.caseType,
        courtType: record.courtType,
        branch: record.branch,
        city: record.city,
        dateFiled: record.dateFiled,
        bounce: record.bounce,
        decline: record.decline,
        delinquent: record.delinquent,
        telecom: record.telecom,
        watch: record.watch,
        isScanned: record.isScanned,
        isScannedCsv: record.isScannedCsv,
        isScannedPdf: record.isScannedPdf,
      };

      if (!lock) {
        // No lock exists — auto-lock to current user
        const newLock = await prisma.recordLock.create({
          data: { recordId: record.id, lockedBy: userId, lockedAt: new Date() },
        });
        await prisma.lockHistory.create({
          data: { recordId: record.id, lockedBy: userId, action: "LOCK_CREATED" },
        });
        await logAudit(req, "RECORD_LOCK_CREATE", "record_locks", record.id);

        processedResults.push({
          ...baseFields,
          details: record.details,
          source: record.source,
          isLocked: false,
          isOwner: true,
        });
      } else if (lock.lockedBy === userId) {
        // Locked by current user — full access
        processedResults.push({
          ...baseFields,
          details: record.details,
          source: record.source,
          isLocked: false,
          isOwner: true,
        });
      } else {
        // Locked by someone else — check for pending request
        const pendingRequest = await prisma.unlockRequest.findFirst({
          where: {
            requestedBy: userId,
            recordId: record.id,
            status: "pending",
          },
        });

        // Build lock owner info
        const lockOwnerName = lock.user
          ? [lock.user.firstName, lock.user.lastName].filter(Boolean).join(" ") || "Unknown"
          : "Unknown";
        const lockAffiliateName = lock.user?.client?.name || "Unknown";

        processedResults.push({
          ...baseFields,
          details: null,
          source: null,
          isLocked: true,
          isOwner: false,
          hasPendingRequest: !!pendingRequest,
          lockedByAffiliate: lockAffiliateName,
          lockedByName: lockOwnerName,
          lockedAt: lock.lockedAt,
        });
      }
    }

    // Search is always free — credits are only deducted on print
    const billed = false;

    await prisma.searchLog.create({
      data: {
        userId,
        clientId: user.clientId,
        searchType: type,
        searchTerm: searchTermStr,
        isBilled: 0,
        fee: 0,
      },
    });

    return res.json({
      results: processedResults,
      billed: false,
      remainingCredit: client.creditBalance,
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// --- Affiliate: Get lock info for a locked record (no credit deduction) ---

const getLockInfo = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const userId = req.user.id;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.clientId) {
      return res.status(403).json({ message: "No client assigned" });
    }

    const lock = await prisma.recordLock.findUnique({
      where: { recordId: id },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            middleName: true,
            lastName: true,
            username: true,
            telephone: true,
            mobileNumber: true,
            primaryEmail: true,
            email: true,
            position: true,
            department: true,
            branch: { select: { id: true, name: true } },
            client: {
              select: {
                id: true,
                name: true,
                clientCode: true,
                telephone: true,
                mobile: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!lock) {
      return res.status(404).json({ message: "No lock found for this record" });
    }

    const record = await prisma.negativeRecord.findUnique({ where: { id } });
    if (!record) {
      return res.status(404).json({ message: "Record not found" });
    }

    // Build search term for access history lookup
    const searchName =
      record.type === "Individual"
        ? [record.firstName, record.middleName, record.lastName]
            .map((s) => (s || "").trim().toLowerCase())
            .join("|")
        : (record.companyName || "").trim().toLowerCase();

    const accessHistory = await prisma.searchLog.findMany({
      where: { searchTerm: searchName },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            username: true,
            client: { select: { id: true, name: true } },
            branch: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    const lockOwner = lock.user;
    return res.json({
      record: {
        id: record.id,
        type: record.type,
        name:
          record.type === "Individual"
            ? [record.firstName, record.middleName, record.lastName].filter(Boolean).join(" ")
            : record.companyName,
      },
      lock: {
        id: lock.id,
        lockedAt: lock.lockedAt,
        lockedBy: {
          id: lockOwner.id,
          name: [lockOwner.firstName, lockOwner.middleName, lockOwner.lastName]
            .filter(Boolean)
            .join(" "),
          username: lockOwner.username,
          telephone: lockOwner.telephone,
          mobileNumber: lockOwner.mobileNumber,
          email: lockOwner.primaryEmail || lockOwner.email,
          position: lockOwner.position,
          department: lockOwner.department,
          branch: lockOwner.branch?.name || null,
          affiliate: lockOwner.client
            ? {
                id: lockOwner.client.id,
                name: lockOwner.client.name,
                clientCode: lockOwner.client.clientCode,
                telephone: lockOwner.client.telephone,
                mobile: lockOwner.client.mobile,
                email: lockOwner.client.email,
              }
            : null,
        },
      },
      accessHistory: accessHistory.map((log) => ({
        id: log.id,
        searchDate: log.createdAt,
        username: log.user?.username || "—",
        fullName:
          [log.user?.firstName, log.user?.lastName].filter(Boolean).join(" ") || "—",
        affiliate: log.user?.client?.name || "—",
        branch: log.user?.branch?.name || "—",
      })),
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// --- Affiliate: Print record (credits deducted here) ---

const printRecord = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const userId = req.user.id;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.clientId) {
      return res.status(403).json({ message: "No client assigned" });
    }

    const client = await prisma.client.findFirst({
      where: { id: user.clientId, isActive: 1 },
    });
    if (!client) {
      return res.status(403).json({ message: "Client not found" });
    }

    // Only the lock owner can print
    const lock = await prisma.recordLock.findUnique({
      where: { recordId: id },
    });
    if (!lock || lock.lockedBy !== userId) {
      return res.status(403).json({ message: "You do not have access to print this record" });
    }

    const record = await prisma.negativeRecord.findUnique({ where: { id } });
    if (!record) {
      return res.status(404).json({ message: "Record not found" });
    }

    // Prepaid clients: check balance and deduct on print
    const printFee = parseFloat(process.env.PRINT_FEE || process.env.SEARCH_FEE || "1.00");
    let billed = false;

    if (client.billingType === "Prepaid") {
      if (parseFloat(client.creditBalance) < printFee) {
        return res.status(402).json({
          message: "Insufficient credit to print this record. Please request a top-up.",
        });
      }

      await prisma.client.update({
        where: { id: user.clientId },
        data: { creditBalance: parseFloat(client.creditBalance) - printFee },
      });

      await prisma.creditTransaction.create({
        data: {
          clientId: user.clientId,
          amount: printFee,
          type: "deduction",
          description: `Print Record #${id}`,
          performedBy: userId,
        },
      });

      billed = true;
    }

    await logAudit(req, "RECORD_PRINT", "negative_records", id);

    const updatedClient = await prisma.client.findUnique({ where: { id: user.clientId } });

    // Fetch fresh record with all details
    const fullRecord = await prisma.negativeRecord.findUnique({
      where: { id },
    });

    // Build reference number: REF-YYYYMMDD-<recordId>
    const now = new Date();
    const refNo = `REF-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${id}`;

    return res.json({
      record: fullRecord,
      billed,
      remainingCredit: updatedClient.creditBalance,
      printMeta: {
        inquiryDate: now.toISOString(),
        inquiryBy: [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email,
        client: updatedClient.name,
        branch: user.branchId
          ? (await prisma.subDomain.findUnique({ where: { id: user.branchId }, select: { name: true } }))?.name || 'All'
          : 'All',
        referenceNo: refNo,
      },
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// --- Admin: Record Detail View ---

const getRecordDetails = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const record = await prisma.negativeRecord.findUnique({
      where: { id },
      include: {
        recordLock: {
          include: {
            user: {
              select: {
                id: true, firstName: true, lastName: true, email: true,
                client: { select: { id: true, name: true } },
              },
            },
          },
        },
        unlockRequests: {
          include: {
            requester: {
              select: { id: true, firstName: true, lastName: true, email: true },
            },
          },
          orderBy: { createdAt: "desc" },
        },
        lockHistories: {
          include: {
            user: {
              select: {
                id: true, firstName: true, lastName: true, email: true,
                client: { select: { id: true, name: true } },
              },
            },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!record) {
      return res.status(404).json({ message: "Record not found" });
    }

    // Get search history for this record by matching search terms
    const searchName = record.type === "Individual"
      ? [record.firstName, record.middleName, record.lastName]
          .map((s) => (s || "").trim().toLowerCase())
          .join("|")
      : (record.companyName || "").trim().toLowerCase();

    const searchHistory = await prisma.searchLog.findMany({
      where: { searchTerm: searchName },
      include: {
        user: {
          select: {
            id: true, firstName: true, lastName: true, email: true,
            client: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return res.json({
      record,
      searchHistory,
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

module.exports = { upload, uploadAndProcess, createRecord, listRecords, search, getLockInfo, printRecord, getRecordDetails };
