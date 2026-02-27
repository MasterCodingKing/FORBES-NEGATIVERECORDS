const { prisma } = require("../models");
const { logAudit } = require("../middleware/audit.middleware");
const { parsePaginationParams, paginatedResponse } = require("../utils/pagination");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const XLSX = require("xlsx");
const pdfParse = require("pdf-parse");

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
    const allowed = [".pdf", ".png", ".jpg", ".jpeg", ".xls", ".xlsx"];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error("Only PDF, image, and Excel files are allowed"));
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

    await logAudit(req, "OCR_UPLOAD", "ocr_batches", batch.id);

    // Return immediately — process OCR in background
    res.status(201).json({
      message: "File uploaded and queued for OCR processing",
      batch,
    });

    // Begin async OCR processing
    processOcrBatch(batch.id, req.file.path).catch((err) => {
      console.error(`OCR batch ${batch.id} failed:`, err.message);
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

/**
 * Background OCR processing for a batch.
 * Extracts text from the uploaded file and stores it.
 */
async function processOcrBatch(batchId, filePath) {
  const { extractText } = require("../utils/ocr");

  try {
    await prisma.ocrBatch.update({
      where: { id: batchId },
      data: { status: "processing" },
    });

    const text = await extractText(filePath);

    // Parse extracted text into potential records.
    // This is a best-effort parser — structure depends on the input document.
    // For now, store the raw text and mark completed.
    // In production, you would implement format-specific parsers here.
    const lines = text
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    let recordsCreated = 0;

    // Attempt simple CSV-like line parsing: one record per non-empty line
    // Each line is stored as a Company-type record with the text in details
    // This can be enhanced with structured parsing later.
    if (lines.length > 0) {
      // Store the full extracted text as a single record with details
      await prisma.negativeRecord.create({
        data: {
          type: "Company",
          companyName: `OCR Batch #${batchId}`,
          caseNo: `OCR-${batchId}`,
          plaintiff: "OCR Extracted",
          caseType: "OCR",
          courtType: "OCR",
          branch: "OCR",
          dateFiled: new Date(),
          details: text.slice(0, 65000), // Truncate to fit TEXT column
          source: `OCR Upload (${path.basename(filePath)})`,
          isScanned: 1,
          isScannedPdf: filePath.toLowerCase().endsWith(".pdf") ? 1 : 0,
          ocrBatchId: batchId,
        },
      });
      recordsCreated = 1;
    }

    await prisma.ocrBatch.update({
      where: { id: batchId },
      data: { status: "completed", totalRecords: recordsCreated },
    });
  } catch (err) {
    await prisma.ocrBatch.update({
      where: { id: batchId },
      data: { status: "failed" },
    });
    throw err;
  }
}

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
    const { page, limit, skip, where, orderBy } = parsePaginationParams(req.query, {
      searchableFields: ["firstName", "lastName", "companyName", "source", "caseNo", "plaintiff"],
      defaultSort: "createdAt",
      defaultOrder: "desc",
      sortableFields: ["createdAt", "lastName", "firstName", "companyName", "caseNo", "type"],
    });

    if (req.query.type) where.type = req.query.type;

    const [data, total] = await Promise.all([
      prisma.negativeRecord.findMany({ where, skip, take: limit, orderBy }),
      prisma.negativeRecord.count({ where }),
    ]);

    return res.json(paginatedResponse(data, total, page, limit));
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

// --- Affiliate: Print record (credits deducted here) — generates PDF ---

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

    // Build reference number: REF-YYYYMMDD-<recordId>
    const now = new Date();
    const refNo = `REF-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${id}`;

    const branchName = user.branchId
      ? (await prisma.subDomain.findUnique({ where: { id: user.branchId }, select: { name: true } }))?.name || 'All'
      : 'All';

    const inquiryBy = [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email;

    // Check if PDF is requested (default) or JSON fallback
    if (req.query.format === "json") {
      return res.json({
        record,
        billed,
        remainingCredit: updatedClient.creditBalance,
        printMeta: {
          inquiryDate: now.toISOString(),
          inquiryBy,
          client: updatedClient.name,
          branch: branchName,
          referenceNo: refNo,
        },
      });
    }

    // Generate server-side PDF
    const PDFDocument = require("pdfkit");
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="record-${id}.pdf"`);

    const doc = new PDFDocument({ margin: 50, size: "A4" });
    doc.pipe(res);

    // Header
    doc.fontSize(18).font("Helvetica-Bold").text("Negative Record Report", { align: "center" });
    doc.moveDown(0.5);
    doc.fontSize(9).font("Helvetica").text(`Reference No: ${refNo}`, { align: "center" });
    doc.text(`Inquiry Date: ${now.toLocaleString()}`, { align: "center" });
    doc.text(`Inquiry By: ${inquiryBy} — ${updatedClient.name} / ${branchName}`, { align: "center" });
    doc.moveDown(1);

    // Divider
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(0.5);

    // Record Details
    doc.fontSize(12).font("Helvetica-Bold").text("Record Details");
    doc.moveDown(0.3);
    doc.fontSize(9).font("Helvetica");

    const fields = [
      ["Type", record.type],
      ["Last Name", record.lastName],
      ["First Name", record.firstName],
      ["Middle Name", record.middleName],
      ["Alias", record.alias],
      ["Company Name", record.companyName],
      ["Case No", record.caseNo],
      ["Plaintiff", record.plaintiff],
      ["Case Type", record.caseType],
      ["Court Type", record.courtType],
      ["Branch", record.branch],
      ["City", record.city],
      ["Date Filed", record.dateFiled ? new Date(record.dateFiled).toLocaleDateString() : null],
      ["Source", record.source],
      ["Bounce", record.bounce],
      ["Decline", record.decline],
      ["Delinquent", record.delinquent],
      ["Telecom", record.telecom],
      ["Watch", record.watch],
    ];

    for (const [label, value] of fields) {
      if (value) {
        doc.font("Helvetica-Bold").text(`${label}: `, { continued: true });
        doc.font("Helvetica").text(String(value));
      }
    }

    if (record.details) {
      doc.moveDown(0.5);
      doc.font("Helvetica-Bold").text("Details:");
      doc.font("Helvetica").text(record.details);
    }

    // Footer
    doc.moveDown(2);
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(0.3);
    doc.fontSize(7).text("This report is confidential and intended for authorized personnel only.", { align: "center" });

    doc.end();
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

const getOcrBatchStatus = async (req, res) => {
  try {
    const batch = await prisma.ocrBatch.findUnique({
      where: { id: parseInt(req.params.id) },
    });
    if (!batch) return res.status(404).json({ message: "Batch not found" });
    return res.json(batch);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// --- Upload & Parse (returns extracted rows for preview — no DB insert) ---

/**
 * Column name normalisation map.
 * Maps common header variations found in uploaded files to our DB field names.
 */
const HEADER_MAP = {
  "last name": "lastName",
  "lastname": "lastName",
  "last_name": "lastName",
  "first name": "firstName",
  "firstname": "firstName",
  "first_name": "firstName",
  "middle name": "middleName",
  "middlename": "middleName",
  "middle_name": "middleName",
  "company": "companyName",
  "company name": "companyName",
  "companyname": "companyName",
  "company_name": "companyName",
  "case no": "caseNo",
  "case no.": "caseNo",
  "caseno": "caseNo",
  "case_no": "caseNo",
  "plaintiff": "plaintiff",
  "case type": "caseType",
  "casetype": "caseType",
  "case_type": "caseType",
  "court type": "courtType",
  "courttype": "courtType",
  "court_type": "courtType",
  "branch": "branch",
  "city": "city",
  "date filed": "dateFiled",
  "datefiled": "dateFiled",
  "date_filed": "dateFiled",
  "alias": "alias",
  "bounce": "bounce",
  "decline": "decline",
  "delinquent": "delinquent",
  "telecom": "telecom",
  "watch": "watch",
  "details": "details",
  "source": "source",
  "type": "type",
};

function normaliseHeader(raw) {
  const key = (raw || "").trim().toLowerCase().replace(/[^a-z0-9 _]/g, "");
  return HEADER_MAP[key] || null;
}

/**
 * Parse an Excel buffer into an array of row objects mapped to our schema fields.
 */
function parseExcelBuffer(buffer) {
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return [];
  const sheet = workbook.Sheets[sheetName];
  const rawRows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
  if (rawRows.length === 0) return [];

  // Build column mapping from first row keys
  const rawHeaders = Object.keys(rawRows[0]);
  const colMap = {};
  for (const rh of rawHeaders) {
    const mapped = normaliseHeader(rh);
    if (mapped) colMap[rh] = mapped;
  }

  return rawRows.map((raw) => {
    const row = {};
    for (const [origKey, mappedKey] of Object.entries(colMap)) {
      let val = raw[origKey];
      if (val instanceof Date) {
        val = val.toISOString().split("T")[0]; // YYYY-MM-DD
      }
      row[mappedKey] = val != null ? String(val).trim() : "";
    }
    // Infer type if not present
    if (!row.type) {
      row.type = row.lastName || row.firstName ? "Individual" : "Company";
    }
    return row;
  });
}

/**
 * Parse text-based PDF using pdf-parse, then fall back to OCR if text is empty/scanned.
 */
async function parsePdfFile(filePath) {
  const buffer = fs.readFileSync(filePath);
  let text = "";

  try {
    const pdfData = await pdfParse(buffer);
    text = (pdfData.text || "").trim();
  } catch {
    text = "";
  }

  // If text extraction yielded very little, treat as scanned PDF → use OCR
  if (text.length < 50) {
    const { extractText } = require("../utils/ocr");
    text = await extractText(filePath);
  }

  return parsePdfText(text);
}

/**
 * Best-effort parser for tabular text extracted from PDFs.
 * Looks for common table patterns and row separators.
 */
function parsePdfText(text) {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) return [];

  // Try to detect a header row by looking for known column keywords
  let headerIdx = -1;
  for (let i = 0; i < Math.min(lines.length, 10); i++) {
    const lower = lines[i].toLowerCase();
    const matches = ["last name", "first name", "case no", "plaintiff", "date filed", "case type"].filter(
      (kw) => lower.includes(kw)
    );
    if (matches.length >= 2) {
      headerIdx = i;
      break;
    }
  }

  if (headerIdx >= 0) {
    // Tabular data with detected headers — try tab/multi-space splitting
    const headerLine = lines[headerIdx];
    const sep = headerLine.includes("\t") ? "\t" : /\s{2,}/;
    const headers = headerLine.split(sep).map((h) => h.trim());
    const mappedHeaders = headers.map(normaliseHeader);

    const rows = [];
    for (let i = headerIdx + 1; i < lines.length; i++) {
      const cells = lines[i].split(sep).map((c) => c.trim());
      if (cells.length < 2) continue;
      const row = {};
      for (let j = 0; j < mappedHeaders.length && j < cells.length; j++) {
        if (mappedHeaders[j]) {
          row[mappedHeaders[j]] = cells[j];
        }
      }
      if (!row.type) {
        row.type = row.lastName || row.firstName ? "Individual" : "Company";
      }
      if (Object.keys(row).length >= 2) rows.push(row);
    }
    if (rows.length > 0) return rows;
  }

  // Fallback: return each non-empty line as a single details row
  return lines.map((line) => ({
    type: "Individual",
    lastName: "",
    firstName: "",
    middleName: "",
    companyName: "",
    caseNo: "",
    plaintiff: "",
    caseType: "",
    courtType: "",
    branch: "",
    dateFiled: "",
    details: line,
  }));
}

/**
 * POST /records/upload-parse
 * Accepts an Excel or PDF file, extracts data, returns JSON rows for preview.
 * No database insertion happens here.
 */
const uploadAndParse = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "File is required" });
    }

    const ext = path.extname(req.file.originalname).toLowerCase();
    let rows = [];

    if (ext === ".xls" || ext === ".xlsx") {
      const buffer = fs.readFileSync(req.file.path);
      rows = parseExcelBuffer(buffer);
    } else if (ext === ".pdf") {
      rows = await parsePdfFile(req.file.path);
    } else {
      // Image files — OCR
      const { extractText } = require("../utils/ocr");
      const text = await extractText(req.file.path);
      rows = parsePdfText(text);
    }

    // Clean up uploaded file
    try { fs.unlinkSync(req.file.path); } catch { /* ignore */ }

    await logAudit(req, "FILE_UPLOAD_PARSE", "negative_records", 0);

    return res.json({
      message: `Extracted ${rows.length} row(s)`,
      fileName: req.file.originalname,
      rows,
    });
  } catch (err) {
    // Clean up on error
    if (req.file?.path) {
      try { fs.unlinkSync(req.file.path); } catch { /* ignore */ }
    }
    return res.status(500).json({ message: err.message });
  }
};

/**
 * POST /records/bulk-insert
 * Accepts an array of record objects and inserts them into the database.
 */
const bulkInsert = async (req, res) => {
  try {
    const { records } = req.body;
    if (!Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ message: "records array is required and must not be empty" });
    }

    if (records.length > 500) {
      return res.status(400).json({ message: "Maximum 500 records per batch" });
    }

    const created = [];
    const errors = [];

    for (let i = 0; i < records.length; i++) {
      const r = records[i];
      try {
        const type = r.type || "Individual";
        const record = await prisma.negativeRecord.create({
          data: {
            type,
            firstName: r.firstName || null,
            middleName: r.middleName || null,
            lastName: r.lastName || null,
            alias: r.alias || null,
            companyName: r.companyName || null,
            caseNo: r.caseNo || null,
            plaintiff: r.plaintiff || null,
            caseType: r.caseType || null,
            courtType: r.courtType || null,
            branch: r.branch || null,
            city: r.city || null,
            dateFiled: r.dateFiled ? new Date(r.dateFiled) : null,
            bounce: r.bounce || null,
            decline: r.decline || null,
            delinquent: r.delinquent || null,
            telecom: r.telecom || null,
            watch: r.watch || null,
            isScanned: r.isScanned ? 1 : 0,
            isScannedCsv: r.isScannedCsv ? 1 : 0,
            isScannedPdf: r.isScannedPdf ? 1 : 0,
            details: r.details || null,
            source: r.source || null,
          },
        });
        created.push(record);
      } catch (err) {
        errors.push({ row: i + 1, message: err.message });
      }
    }

    await logAudit(req, "RECORD_BULK_INSERT", "negative_records", created.length);

    return res.status(201).json({
      message: `${created.length} record(s) inserted, ${errors.length} error(s)`,
      inserted: created.length,
      errors,
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

module.exports = { upload, uploadAndProcess, uploadAndParse, bulkInsert, createRecord, listRecords, search, getLockInfo, printRecord, getRecordDetails, getOcrBatchStatus };
