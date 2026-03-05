const { prisma } = require("../models");
const { logAudit } = require("../middleware/audit.middleware");
const { parsePaginationParams, paginatedResponse } = require("../utils/pagination");
const { isInternalClient } = require("../utils/roles");
const { callOcrService, callOcrServicePdf, fetchOcrChunk, fetchAllOcrChunks } = require("../utils/ocr-service");
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
 * Delegates extraction to the Python OCR microservice for better accuracy.
 */
async function processOcrBatch(batchId, filePath) {
  try {
    await prisma.ocrBatch.update({
      where: { id: batchId },
      data: { status: "processing" },
    });

    // Call Python OCR service for extraction
    const result = await callOcrService(filePath);
    let rows = result.rows || [];

    // If the result is chunked, fetch all remaining chunks
    if (result.chunked && result.jobId && result.hasMore) {
      rows = await fetchAllOcrChunks(result.jobId, rows, result.rowCount, result.chunkSize || 5000);
    }

    let recordsCreated = 0;

    if (rows.length > 0) {
      // Insert extracted rows as structured records
      const CHUNK_SIZE = 1000;
      for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
        const chunk = rows.slice(i, i + CHUNK_SIZE);
        try {
          const data = chunk.map((r) => ({
            type: r.type || "Individual",
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
            isScanned: 1,
            isScannedPdf: filePath.toLowerCase().endsWith(".pdf") ? 1 : 0,
            details: r.details || null,
            source: r.source || `OCR Upload (${path.basename(filePath)})`,
            ocrBatchId: batchId,
          }));

          const insertResult = await prisma.negativeRecord.createMany({
            data,
            skipDuplicates: true,
          });
          recordsCreated += insertResult.count;
        } catch (chunkErr) {
          console.error(`[OCR Batch ${batchId}] Chunk error at offset ${i}:`, chunkErr.message);
        }
      }
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
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { branch: true },
    });
    if (!user || !user.clientId) {
      return res.status(403).json({ message: "No client assigned" });
    }

    // Check if branch is inactive
    if (user.branchId && user.branch && user.branch.status === "Inactive") {
      return res.status(403).json({ message: "Branch is inactive. Please contact the administrator." });
    }

    const client = await prisma.client.findFirst({
      where: { id: user.clientId, isActive: 1 },
    });
    if (!client) {
      return res.status(403).json({ message: "Client is inactive. Please contact the administrator." });
    }

    // Build search term string for duplicate detection
    const searchTermStr =
      type === "Individual"
        ? [firstName, middleName, lastName]
            .map((s) => (s || "").trim().toLowerCase())
            .join("|")
        : term.trim().toLowerCase();

    // Build search query
    const searchWhere = {};
    if (type === "Individual") {
      searchWhere.type = type;
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
      searchWhere.companyName = { contains: term.trim(), mode: "insensitive" };
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

    // Handle no-results case — auto-lock to AFFIS via SearchLock table
    if (processedResults.length === 0) {
      const searchName = type === 'Individual'
        ? [firstName, middleName, lastName].filter(Boolean).map(s => s.trim()).join(' ')
        : (term || '').trim();

      // Check if a SearchLock already exists for this term
      const existingLock = await prisma.searchLock.findUnique({
        where: { searchTerm: searchTermStr },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              client: { select: { id: true, name: true } },
            },
          },
        },
      });

      if (existingLock && existingLock.clientId !== user.clientId) {
        // Locked by another affiliate — check if current user has an approved access request
        const approvedAccess = await prisma.searchAccessRequest.findFirst({
          where: {
            searchLockId: existingLock.id,
            requestedBy: userId,
            status: 'approved',
          },
        });

        if (approvedAccess) {
          // Access granted — treat as owner
          return res.json({
            results: [],
            noRecordsFound: true,
            isOwner: true,
            isLocked: false,
            searchMeta: { name: searchName, type },
            billed: false,
            remainingCredit: client.creditBalance,
          });
        }

        // Check for pending request
        const pendingRequest = await prisma.searchAccessRequest.findFirst({
          where: {
            searchLockId: existingLock.id,
            requestedBy: userId,
            status: 'pending',
          },
        });

        const lockerName = [existingLock.user?.firstName, existingLock.user?.lastName]
          .filter(Boolean).join(' ') || 'Unknown';
        return res.json({
          results: [],
          noRecordsFound: true,
          isLocked: true,
          isOwner: false,
          hasPendingRequest: !!pendingRequest,
          lockedByAffiliate: existingLock.user?.client?.name || 'Unknown',
          lockedByName: lockerName,
          searchLockId: existingLock.id,
          searchMeta: { name: searchName, type },
          billed: false,
          remainingCredit: client.creditBalance,
        });
      }

      if (!existingLock) {
        // No lock exists — create one for the current affiliate
        await prisma.searchLock.create({
          data: {
            searchTerm: searchTermStr,
            searchType: type,
            lockedBy: userId,
            clientId: user.clientId,
          },
        });
        await logAudit(req, 'SEARCH_LOCK_CREATE', 'search_locks', 0);
      }

      return res.json({
        results: [],
        noRecordsFound: true,
        isOwner: true,
        isLocked: false,
        searchMeta: { name: searchName, type },
        billed: false,
        remainingCredit: client.creditBalance,
      });
    }

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

// --- PDF Report Generator (matches official FFCC format) ---

/**
 * Generate a "NEGATIVE RECORDS DETAIL REPORT" PDF matching the official FFCC format.
 * @param {Object} doc - PDFKit document instance
 * @param {Object} meta - { name, inquiryDate, inquiryBy, client, branch, referenceNo }
 * @param {Array} records - Array of record objects (can be empty for no-results reports)
 */
function generateReportPDF(doc, meta, records) {
  const margin = 40;
  const pageWidth = doc.page.width;
  const contentWidth = pageWidth - 2 * margin;

  const NAVY = '#1B2A4A';
  const DARK_RED = '#8B1A1A';
  const RED = '#E53935';
  const GOLD = '#FFD700';
  const WHITE = '#FFFFFF';
  const LIGHT_BG = '#F5F5F5';
  const BORDER = '#CCCCCC';
  const DARK = '#333333';
  const GRAY = '#999999';

  // ===== TITLE =====
  doc.fontSize(16).fillColor(NAVY).font('Helvetica-Bold')
    .text('NEGATIVE RECORDS DETAIL REPORT', margin, 35, {
      align: 'center', width: contentWidth,
    });

  let y = 65;

  // ===== HEADER INFO TABLE =====
  const hRowH = 22;
  const hColWidths = [0.12, 0.21, 0.12, 0.25, 0.12, 0.18];
  const hLabels = ['Name', 'Inquiry Date', 'Inquiry By', 'Client', 'Branch', 'Reference No'];
  const hKeys = ['name', 'inquiryDate', 'inquiryBy', 'client', 'branch', 'referenceNo'];

  // Header row (navy bg, gold text)
  doc.rect(margin, y, contentWidth, hRowH).fill(NAVY);
  let x = margin;
  for (let i = 0; i < hLabels.length; i++) {
    const w = hColWidths[i] * contentWidth;
    doc.fillColor(GOLD).fontSize(7).font('Helvetica-Bold')
      .text(hLabels[i], x + 3, y + 7, { width: w - 6, lineBreak: false });
    x += w;
  }
  y += hRowH;

  // Data row (light bg, dark text)
  doc.rect(margin, y, contentWidth, hRowH).fill(LIGHT_BG);
  doc.rect(margin, y, contentWidth, hRowH).stroke(BORDER);
  x = margin;
  for (let i = 0; i < hKeys.length; i++) {
    const w = hColWidths[i] * contentWidth;
    doc.fillColor(DARK).fontSize(7).font('Helvetica')
      .text(meta[hKeys[i]] || '', x + 3, y + 7, { width: w - 6, lineBreak: false });
    x += w;
  }
  y += hRowH + 15;

  // ===== COURT CASE TABLE =====
  const ccRowH = 22;
  const ccColWidths = [0.13, 0.13, 0.18, 0.14, 0.13, 0.15, 0.14];
  const ccLabels = ['Case No.', 'Case Type', 'Plaintiff', 'Date Filed', 'City', 'Court', 'Branch'];
  const ccKeys = ['caseNo', 'caseType', 'plaintiff', 'dateFiled', 'city', 'courtType', 'branch'];

  // Header row (dark red bg, white text)
  doc.rect(margin, y, contentWidth, ccRowH).fill(DARK_RED);
  x = margin;
  for (let i = 0; i < ccLabels.length; i++) {
    const w = ccColWidths[i] * contentWidth;
    doc.fillColor(WHITE).fontSize(7).font('Helvetica-Bold')
      .text(ccLabels[i], x + 3, y + 7, { width: w - 6, lineBreak: false });
    x += w;
  }
  y += ccRowH;

  // Court case data rows
  const courtCaseRecords = records.filter(r => r.caseNo || r.caseType);
  if (courtCaseRecords.length === 0) {
    doc.rect(margin, y, contentWidth, ccRowH).fill(LIGHT_BG);
    doc.rect(margin, y, contentWidth, ccRowH).stroke(BORDER);
    doc.fillColor(GRAY).fontSize(7).font('Helvetica')
      .text('CourtCase Not Found', margin, y + 7, { align: 'center', width: contentWidth });
    y += ccRowH;
  } else {
    for (const rec of courtCaseRecords) {
      doc.rect(margin, y, contentWidth, ccRowH).stroke(BORDER);
      x = margin;
      for (let i = 0; i < ccKeys.length; i++) {
        const w = ccColWidths[i] * contentWidth;
        let val = rec[ccKeys[i]] || '';
        if (ccKeys[i] === 'dateFiled' && rec.dateFiled) {
          val = new Date(rec.dateFiled).toLocaleDateString();
        }
        doc.fillColor(DARK).fontSize(7).font('Helvetica')
          .text(String(val), x + 3, y + 7, { width: w - 6, lineBreak: false });
        x += w;
      }
      y += ccRowH;
    }
  }
  y += 15;

  // ===== CATEGORY COUNTS =====
  const categories = [
    { label: 'Court Case', count: courtCaseRecords.length, showNoRecords: false },
    { label: 'Bounce Check', count: records.filter(r => r.bounce).length, showNoRecords: true },
    { label: 'Watch List', count: records.filter(r => r.watch).length, showNoRecords: true },
    { label: 'Telecoms', count: records.filter(r => r.telecom).length, showNoRecords: true },
    { label: 'Declined', count: records.filter(r => r.decline).length, showNoRecords: true },
    { label: 'Delinquent', count: records.filter(r => r.delinquent).length, showNoRecords: true },
  ];

  for (const cat of categories) {
    doc.fillColor(NAVY).fontSize(10).font('Helvetica')
      .text(`${cat.label}:  `, margin, y, { continued: true });
    doc.fillColor(RED).font('Helvetica-Bold').text(String(cat.count));
    y = doc.y;
    if (cat.showNoRecords && cat.count === 0) {
      doc.fillColor(RED).fontSize(9).font('Helvetica').text('No Records Found', margin, y);
      y = doc.y;
    }
    y += 6;
  }

  // ===== DISCLAIMER =====
  y += 15;
  doc.fillColor(DARK).fontSize(10).font('Helvetica-Bold').text('Disclamer', margin, y);
  y = doc.y + 5;
  doc.fillColor(DARK).fontSize(7).font('Helvetica')
    .text(
      'This report, to be treated in strictest confidence, upon request and in accordance with the subscription agreement entered into by and between Forbes Financial Consultancy Corporation (FFCC) and the user, the terms of which agreement are hereby incorporated by reference, for exclusive use as one factor to be considered in connection with credit, insurance, marketing, and other business decisions, and for no other purpose. It may contain information from sources which FFCC does not control and which information, unless otherwise indicated, may not have been verified. It shall not be used as evidence in any legal proceeding nor shall it be shown to subject or others, and neither shall its source be disclosed. FFCC has acted with due diligence and in utmost good faith and does not guarantee the accuracy, completeness, and timeliness of this report or does it assume any part of the user\'s risk in its use or non-use. FFCC shall not and cannot be held liable for any loss, injury or damage caused or may hereafter be caused, directly or indirectly, by the use of the report or arising from the acts on the part of FFCC, its officers, agents, and personnel relative to the procurement, collection, and/or communication of any information relative thereto. Any point of clarification may be promptly raised solely and exclusively with FFCC.',
      margin, y,
      { align: 'justify', width: contentWidth }
    );
}

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

    // Generate server-side PDF in official FFCC report format
    const PDFDocument = require("pdfkit");
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="record-${id}.pdf"`);

    const doc = new PDFDocument({ margin: 40, size: "A4" });
    doc.pipe(res);

    const recordName = record.type === 'Individual'
      ? [record.firstName, record.middleName, record.lastName].filter(Boolean).join(' ')
      : record.companyName || '';

    generateReportPDF(doc, {
      name: recordName,
      inquiryDate: now.toLocaleString(),
      inquiryBy,
      client: updatedClient.name,
      branch: branchName,
      referenceNo: refNo,
    }, [record]);

    doc.end();
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// --- Affiliate: Print search results report (including no-results) ---

const printSearchResults = async (req, res) => {
  try {
    const { type, firstName, middleName, lastName, term } = req.body;
    if (!type) {
      return res.status(400).json({ message: "type is required" });
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

    // Build search query
    const searchWhere = {};
    let searchName = '';
    let searchTermStr = '';
    if (type === 'Individual') {
      searchWhere.type = 'Individual';
      const andConditions = [];
      if (firstName) andConditions.push({ firstName: { contains: firstName.trim(), mode: 'insensitive' } });
      if (middleName) andConditions.push({ middleName: { contains: middleName.trim(), mode: 'insensitive' } });
      if (lastName) andConditions.push({ lastName: { contains: lastName.trim(), mode: 'insensitive' } });
      if (andConditions.length > 0) searchWhere.AND = andConditions;
      searchName = [firstName, middleName, lastName].filter(Boolean).map(s => s.trim()).join(' ');
      searchTermStr = [firstName, middleName, lastName].map(s => (s || '').trim().toLowerCase()).join('|');
    } else {
      searchWhere.companyName = { contains: (term || '').trim(), mode: 'insensitive' };
      searchName = (term || '').trim();
      searchTermStr = searchName.toLowerCase();
    }

    // Block print if this search term is locked by a different client via SearchLock
    const searchLock = await prisma.searchLock.findUnique({
      where: { searchTerm: searchTermStr },
    });
    if (searchLock && searchLock.clientId !== user.clientId) {
      // Check if the user has an approved access request
      const approvedAccess = await prisma.searchAccessRequest.findFirst({
        where: {
          searchLockId: searchLock.id,
          requestedBy: userId,
          status: 'approved',
        },
      });
      if (!approvedAccess) {
        return res.status(403).json({
          message: "This search is locked by another affiliate. You must request access before printing.",
          locked: true,
        });
      }
    }

    // Find matching records locked by current user
    const records = await prisma.negativeRecord.findMany({
      where: searchWhere,
      include: { recordLock: true },
      take: 200,
    });

    const ownedRecords = records.filter(r => !r.recordLock || r.recordLock.lockedBy === userId);

    // Deduct credits
    const printFee = parseFloat(process.env.PRINT_FEE || process.env.SEARCH_FEE || "1.00");
    if (client.billingType === "Prepaid") {
      if (parseFloat(client.creditBalance) < printFee) {
        return res.status(402).json({
          message: "Insufficient credit to print. Please request a top-up.",
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
          description: `Print Search Report: ${searchName}`,
          performedBy: userId,
        },
      });
    }

    await logAudit(req, "SEARCH_REPORT_PRINT", "negative_records", 0);

    const now = new Date();
    const refNo = `REF-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(now.getTime()).slice(-6)}`;

    const branchName = user.branchId
      ? (await prisma.subDomain.findUnique({ where: { id: user.branchId }, select: { name: true } }))?.name || 'All'
      : 'All';
    const inquiryBy = [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email;
    const updatedClient = await prisma.client.findUnique({ where: { id: user.clientId } });

    const PDFDocument = require("pdfkit");
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="search-report.pdf"`);

    const doc = new PDFDocument({ margin: 40, size: "A4" });
    doc.pipe(res);

    generateReportPDF(doc, {
      name: searchName,
      inquiryDate: now.toLocaleString(),
      inquiryBy,
      client: updatedClient.name,
      branch: branchName,
      referenceNo: refNo,
    }, ownedRecords);

    doc.end();
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// --- Affiliate: Request access to a search-locked (non-existent) name ---

const requestSearchAccess = async (req, res) => {
  try {
    const { type, firstName, middleName, lastName, term, reason } = req.body;
    if (!type) {
      return res.status(400).json({ message: "type is required" });
    }

    const userId = req.user.id;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { client: { select: { name: true } } },
    });
    if (!user || !user.clientId) {
      return res.status(403).json({ message: "No client assigned" });
    }

    // Build the same searchTermStr used in locking
    let searchTermStr;
    let searchName;
    if (type === 'Individual') {
      searchTermStr = [firstName, middleName, lastName]
        .map(s => (s || '').trim().toLowerCase())
        .join('|');
      searchName = [firstName, middleName, lastName].filter(Boolean).map(s => s.trim()).join(' ');
    } else {
      searchTermStr = (term || '').trim().toLowerCase();
      searchName = (term || '').trim();
    }

    // Find the SearchLock entry
    const searchLock = await prisma.searchLock.findUnique({
      where: { searchTerm: searchTermStr },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            client: { select: { name: true } },
          },
        },
      },
    });

    if (!searchLock) {
      return res.status(400).json({ message: "This search is not locked by another affiliate" });
    }

    if (searchLock.clientId === user.clientId) {
      return res.status(400).json({ message: "This search is already locked to your affiliate" });
    }

    // Check for existing pending request
    const existingRequest = await prisma.searchAccessRequest.findFirst({
      where: {
        searchLockId: searchLock.id,
        requestedBy: userId,
        status: 'pending',
      },
    });
    if (existingRequest) {
      return res.status(409).json({ message: "You already have a pending access request for this search" });
    }

    // Create the access request
    const accessRequest = await prisma.searchAccessRequest.create({
      data: {
        searchLockId: searchLock.id,
        requestedBy: userId,
        reason: reason || null,
      },
    });

    const requesterName = [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email;
    const requesterAffiliate = user.client?.name || 'Unknown';
    const lockerName = [searchLock.user?.firstName, searchLock.user?.lastName].filter(Boolean).join(' ') || 'Unknown';
    const lockerAffiliate = searchLock.user?.client?.name || 'Unknown';

    // Notify all admins
    const adminRoles = await prisma.role.findMany({
      where: { name: { in: ['Admin', 'Super Admin'] } },
      select: { id: true },
    });
    const adminRoleIds = adminRoles.map(r => r.id);

    const admins = await prisma.user.findMany({
      where: { roleId: { in: adminRoleIds }, isApproved: 1 },
      select: { id: true },
    });

    if (admins.length > 0) {
      await prisma.notification.createMany({
        data: admins.map(admin => ({
          userId: admin.id,
          type: 'SEARCH_ACCESS_REQUEST',
          title: 'Search Access Request',
          message: `${requesterName} (${requesterAffiliate}) is requesting access to search "${searchName}" currently locked by ${lockerName} (${lockerAffiliate}).`,
          isRead: 0,
          relatedId: accessRequest.id,
        })),
      });
    }

    // Also notify the locking affiliate user
    await prisma.notification.create({
      data: {
        userId: searchLock.lockedBy,
        type: 'SEARCH_ACCESS_REQUEST',
        title: 'Search Access Request',
        message: `${requesterName} (${requesterAffiliate}) is requesting access to the search "${searchName}" which is locked to your affiliate.${reason ? ` Reason: "${reason}"` : ''}`,
        isRead: 0,
        relatedId: accessRequest.id,
      },
    });

    // Notify the requester (confirmation)
    await prisma.notification.create({
      data: {
        userId,
        type: 'SEARCH_ACCESS_REQUEST',
        title: 'Access Request Submitted',
        message: `Your access request for search "${searchName}" has been submitted. Admin and the locking affiliate have been notified.`,
        isRead: 0,
        relatedId: accessRequest.id,
      },
    });

    await logAudit(req, 'SEARCH_ACCESS_REQUEST', 'search_access_requests', accessRequest.id);

    return res.json({ message: 'Access request submitted. Admin and the locking affiliate have been notified.' });
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

    // Delegate all extraction to the Python OCR microservice
    const result = await callOcrService(req.file.path);
    const rows = result.rows || [];

    // Clean up uploaded file
    try { fs.unlinkSync(req.file.path); } catch { /* ignore */ }

    await logAudit(req, "FILE_UPLOAD_PARSE", "negative_records", 0);

    // Pass chunking info through to the frontend
    const response = {
      message: `Extracted ${result.rowCount || rows.length} row(s)`,
      fileName: req.file.originalname,
      rows,
      rowCount: result.rowCount || rows.length,
    };

    if (result.chunked) {
      response.chunked = true;
      response.jobId = result.jobId;
      response.chunkSize = result.chunkSize;
      response.hasMore = result.hasMore;
      response.offset = result.offset || 0;
    }

    return res.json(response);
  } catch (err) {
    // Clean up on error
    if (req.file?.path) {
      try { fs.unlinkSync(req.file.path); } catch { /* ignore */ }
    }
    return res.status(500).json({ message: err.message });
  }
};

/**
 * POST /records/upload-spreadsheet
 * Handles large CSV/Excel uploads with background processing.
 * Creates an OcrBatch job and processes asynchronously.
 */
const uploadSpreadsheetAndProcess = async (req, res) => {
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

    await logAudit(req, "SPREADSHEET_UPLOAD", "ocr_batches", batch.id);

    // Return immediately — process in background
    res.status(201).json({
      message: "File uploaded and queued for processing",
      batch: { id: batch.id, fileName: batch.fileName, status: batch.status },
    });

    // Begin async processing
    processSpreadsheetJob(batch.id, req.file.path).catch((err) => {
      console.error(`Spreadsheet batch ${batch.id} failed:`, err.message);
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

/**
 * Background job: parse spreadsheet (CSV or Excel) and insert records in chunks.
 */
async function processSpreadsheetJob(batchId, filePath) {
  try {
    await prisma.ocrBatch.update({
      where: { id: batchId },
      data: { status: "processing" },
    });

    // Delegate extraction to Python OCR microservice
    const result = await callOcrService(filePath);
    const rows = result.rows || [];

    // Insert in chunks of 1000 using createMany
    const CHUNK_SIZE = 1000;
    let totalInserted = 0;
    let totalErrors = 0;

    for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
      const chunk = rows.slice(i, i + CHUNK_SIZE);

      try {
        const data = chunk.map((r) => ({
          type: r.type || "Individual",
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
          isScannedCsv: filePath.endsWith(".csv") ? 1 : 0,
          isScannedPdf: 0,
          details: r.details || null,
          source: r.source || `Batch Upload #${batchId}`,
          ocrBatchId: batchId,
        }));

        const result = await prisma.negativeRecord.createMany({
          data,
          skipDuplicates: true,
        });
        totalInserted += result.count;
      } catch (err) {
        console.error(`[Batch ${batchId}] Chunk error at offset ${i}:`, err.message);
        totalErrors += chunk.length;
      }

      // Update progress
      await prisma.ocrBatch.update({
        where: { id: batchId },
        data: { totalRecords: totalInserted },
      });
    }

    await prisma.ocrBatch.update({
      where: { id: batchId },
      data: { status: "completed", totalRecords: totalInserted },
    });

    console.log(`[Batch ${batchId}] Completed: ${totalInserted} inserted, ${totalErrors} errors out of ${rows.length} total`);
  } catch (err) {
    console.error(`[Batch ${batchId}] Fatal error:`, err.message);
    await prisma.ocrBatch.update({
      where: { id: batchId },
      data: { status: "failed" },
    });
  } finally {
    // Clean up file
    try { fs.unlinkSync(filePath); } catch { /* ignore */ }
  }
}

/**
 * POST /records/upload-pdf-extract
 * Handles PDF uploads — extracts data and returns rows for preview.
 */
const uploadPdfAndParse = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "PDF file is required" });
    }

    // Delegate PDF extraction to the Python OCR microservice
    const result = await callOcrServicePdf(req.file.path);
    const rows = result.rows || [];

    // Clean up uploaded file
    try { fs.unlinkSync(req.file.path); } catch { /* ignore */ }

    await logAudit(req, "PDF_UPLOAD_PARSE", "negative_records", 0);

    const response = {
      message: `Extracted ${result.rowCount || rows.length} row(s) from PDF`,
      fileName: req.file.originalname,
      rows,
      rowCount: result.rowCount || rows.length,
    };

    if (result.chunked) {
      response.chunked = true;
      response.jobId = result.jobId;
      response.chunkSize = result.chunkSize;
      response.hasMore = result.hasMore;
      response.offset = result.offset || 0;
    }

    return res.json(response);
  } catch (err) {
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
// Returns a valid Date within 1900–2100, or null for garbage/out-of-range values
const safeDateFiled = (value) => {
  if (!value) return null;
  const d = new Date(value);
  if (isNaN(d.getTime())) return null;
  const year = d.getFullYear();
  if (year < 1900 || year > 2100) return null;
  return d;
};

const bulkInsert = async (req, res) => {
  try {
    const { records } = req.body;
    if (!Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ message: "records array is required and must not be empty" });
    }

    if (records.length > 1000) {
      return res.status(400).json({ message: "Maximum 1000 records per batch" });
    }

    // Coerce a value to string | null, truncated to max length to prevent "value too long" errors
    const toStr = (v, max = 255) => {
      if (v === null || v === undefined || v === "") return null;
      const s = String(v).trim();
      return s ? s.slice(0, max) : null;
    };

    const data = records.map((r) => ({
      type: toStr(r.type, 50) || "Individual",
      firstName: toStr(r.firstName, 120),
      middleName: toStr(r.middleName, 120),
      lastName: toStr(r.lastName, 120),
      alias: toStr(r.alias, 120),
      companyName: toStr(r.companyName, 200),
      caseNo: toStr(r.caseNo, 100),
      plaintiff: toStr(r.plaintiff, 200),
      caseType: toStr(r.caseType, 100),
      courtType: toStr(r.courtType, 100),
      branch: toStr(r.branch, 150),
      city: toStr(r.city, 150),
      dateFiled: safeDateFiled(r.dateFiled),
      bounce: toStr(r.bounce, 100),
      decline: toStr(r.decline, 100),
      delinquent: toStr(r.delinquent, 100),
      telecom: toStr(r.telecom, 100),
      watch: toStr(r.watch, 100),
      isScanned: r.isScanned ? 1 : 0,
      isScannedCsv: r.isScannedCsv ? 1 : 0,
      isScannedPdf: r.isScannedPdf ? 1 : 0,
      details: toStr(r.details, 65535),
      source: toStr(r.source, 255),
    }));

    const result = await prisma.negativeRecord.createMany({
      data,
      skipDuplicates: true,
    });

    await logAudit(req, "RECORD_BULK_INSERT", "negative_records", result.count);

    return res.status(201).json({
      message: `${result.count} record(s) inserted`,
      inserted: result.count,
      errors: [],
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

/**
 * GET /records/extract-chunk/:jobId
 * Proxy endpoint to fetch a chunk of extraction results from the OCR service.
 */
const getExtractionChunk = async (req, res) => {
  try {
    const { jobId } = req.params;
    const offset = parseInt(req.query.offset) || 0;
    const limit = parseInt(req.query.limit) || 5000;

    const chunk = await fetchOcrChunk(jobId, offset, limit);
    return res.json(chunk);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

module.exports = {
  upload,
  uploadAndProcess,
  uploadAndParse,
  uploadSpreadsheetAndProcess,
  uploadPdfAndParse,
  bulkInsert,
  createRecord,
  listRecords,
  search,
  getLockInfo,
  printRecord,
  printSearchResults,
  requestSearchAccess,
  getRecordDetails,
  getOcrBatchStatus,
  getExtractionChunk,
};
