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
    const { type, firstName, middleName, lastName, companyName, details, source } = req.body;
    if (!type) {
      return res.status(400).json({ message: "type is required (Individual or Company)" });
    }

    const record = await prisma.negativeRecord.create({
      data: {
        type,
        firstName: firstName || null,
        middleName: middleName || null,
        lastName: lastName || null,
        companyName: companyName || null,
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
    const { type, term } = req.query;
    if (!type || !term) {
      return res.status(400).json({ message: "type and term are required" });
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

    // Duplicate search check — same client, same term
    const existingSearch = await prisma.searchLog.findFirst({
      where: {
        clientId: user.clientId,
        searchType: type,
        searchTerm: term.trim().toLowerCase(),
      },
    });

    const searchWhere = { type };
    if (type === "Individual") {
      searchWhere.OR = [
        { firstName: { contains: term, mode: "insensitive" } },
        { lastName: { contains: term, mode: "insensitive" } },
        { middleName: { contains: term, mode: "insensitive" } },
      ];
    } else {
      searchWhere.companyName = { contains: term, mode: "insensitive" };
    }

    const results = await prisma.negativeRecord.findMany({
      where: searchWhere,
      take: 50,
    });

    // Billing: only charge if this is a new search for this client
    let billed = false;
    const searchFee = parseFloat(process.env.SEARCH_FEE || "1.00");

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
          description: `Search: ${type} - "${term}"`,
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
        searchTerm: term.trim().toLowerCase(),
        isBilled: billed ? 1 : 0,
        fee: billed ? searchFee : 0,
      },
    });

    // Refetch updated balance
    const updatedClient = await prisma.client.findUnique({
      where: { id: user.clientId },
    });

    return res.json({
      results,
      billed,
      remainingCredit: updatedClient.creditBalance,
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

module.exports = { upload, uploadAndProcess, createRecord, listRecords, search };
