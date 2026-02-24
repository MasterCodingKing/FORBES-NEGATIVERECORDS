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

    // Prepaid clients: block if no credit
    if (client.billingType === "Prepaid" && parseFloat(client.creditBalance) <= 0) {
      return res.status(402).json({
        message: "Insufficient credit. Please request a top-up from your admin.",
      });
    }

    // Build search term string for duplicate detection
    const searchTermStr =
      type === "Individual"
        ? [firstName, middleName, lastName]
            .map((s) => (s || "").trim().toLowerCase())
            .join("|")
        : term.trim().toLowerCase();

    // Duplicate search check — same client, same term
    const existingSearch = await prisma.searchLog.findFirst({
      where: {
        clientId: user.clientId,
        searchType: type,
        searchTerm: searchTermStr,
      },
    });

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

    // Billing: only charge if this is a new search for this client
    let billed = false;
    const searchFee = parseFloat(process.env.SEARCH_FEE || "1.00");
    const billingDescription =
      type === "Individual"
        ? `Search: Individual - "${[firstName, middleName, lastName].filter(Boolean).join(" ")}"`
        : `Search: Company - "${term}"`;

    if (!existingSearch && client.billingType === "Prepaid") {
      await prisma.client.update({
        where: { id: user.clientId },
        data: {
          creditBalance: parseFloat(client.creditBalance) - searchFee,
        },
      });

      await prisma.creditTransaction.create({
        data: {
          clientId: user.clientId,
          amount: searchFee,
          type: "deduction",
          description: billingDescription,
          performedBy: userId,
        },
      });

      billed = true;
    }

    await prisma.searchLog.create({
      data: {
        userId,
        clientId: user.clientId,
        searchType: type,
        searchTerm: searchTermStr,
        isBilled: billed ? 1 : 0,
        fee: billed ? searchFee : 0,
      },
    });

    // Refetch updated balance
    const updatedClient = await prisma.client.findUnique({
      where: { id: user.clientId },
    });

    return res.json({
      results: processedResults,
      billed,
      remainingCredit: updatedClient.creditBalance,
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

module.exports = { upload, uploadAndProcess, createRecord, listRecords, search, getRecordDetails };
