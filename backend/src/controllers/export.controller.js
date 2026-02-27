/**
 * Export controller — handles PDF & Excel export for admin-facing tables.
 * All export routes stream the file back as a download.
 */

const { prisma } = require("../models");
const { parsePaginationParams } = require("../utils/pagination");
const { exportPdf, exportExcel } = require("../utils/export");

const MAX_EXPORT = 5000; // Hard cap for export rows

// ── Records export ──

const exportRecords = async (req, res) => {
  try {
    const format = req.query.format || "pdf";
    const search = (req.query.search || "").trim();
    const sortBy = req.query.sortBy || "createdAt";
    const sortOrder = req.query.sortOrder === "asc" ? "asc" : "desc";

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

    const rows = await prisma.negativeRecord.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
      take: MAX_EXPORT,
    });

    const columns = [
      { label: "ID", key: "id", width: 40 },
      { label: "Type", key: "type", width: 60 },
      { label: "Last Name", key: "lastName", width: 90 },
      { label: "First Name", key: "firstName", width: 90 },
      { label: "Company", key: "companyName", width: 120 },
      { label: "Case No", key: "caseNo", width: 80 },
      { label: "Plaintiff", key: "plaintiff", width: 100 },
      { label: "Case Type", key: "caseType", width: 80 },
      { label: "Source", key: "source", width: 100 },
    ];

    if (format === "excel") {
      await exportExcel(res, "Negative Records", columns, rows, "records.xlsx");
    } else {
      exportPdf(res, "Negative Records", columns, rows, "records.pdf");
    }
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// ── Clients export ──

const exportClients = async (req, res) => {
  try {
    const format = req.query.format || "pdf";
    const search = (req.query.search || "").trim();
    const sortBy = req.query.sortBy || "createdAt";
    const sortOrder = req.query.sortOrder === "asc" ? "asc" : "desc";

    const where = { isActive: 1 };
    if (search) {
      where.OR = [
        { clientCode: { contains: search, mode: "insensitive" } },
        { name: { contains: search, mode: "insensitive" } },
        { clientGroup: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }

    const rows = await prisma.client.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
      take: MAX_EXPORT,
    });

    const columns = [
      { label: "Client Code", key: "clientCode", width: 80 },
      { label: "Name", key: "name", width: 120 },
      { label: "Client Group", key: "clientGroup", width: 100 },
      { label: "Billing Type", key: "billingType", width: 70 },
      { label: "Credit Balance", key: "creditBalance", width: 80 },
      { label: "Email", key: "email", width: 120 },
    ];

    if (format === "excel") {
      await exportExcel(res, "Clients", columns, rows, "clients.xlsx");
    } else {
      exportPdf(res, "Clients", columns, rows, "clients.pdf");
    }
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// ── Users export ──

const exportUsers = async (req, res) => {
  try {
    const format = req.query.format || "pdf";
    const search = (req.query.search || "").trim();
    const sortBy = req.query.sortBy || "createdAt";
    const sortOrder = req.query.sortOrder === "asc" ? "asc" : "desc";

    const where = {};
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { username: { contains: search, mode: "insensitive" } },
      ];
    }

    const rows = await prisma.user.findMany({
      where,
      include: {
        role: { select: { name: true } },
        client: { select: { name: true } },
        branch: { select: { name: true } },
      },
      orderBy: { [sortBy]: sortOrder },
      take: MAX_EXPORT,
    });

    // Flatten nested fields
    const flatRows = rows.map((r) => ({
      firstName: r.firstName,
      lastName: r.lastName,
      email: r.email,
      username: r.username,
      role: r.role?.name,
      affiliate: r.client?.name,
      branch: r.branch?.name,
      approved: r.isApproved ? "Yes" : "No",
    }));

    const columns = [
      { label: "First Name", key: "firstName", width: 90 },
      { label: "Last Name", key: "lastName", width: 90 },
      { label: "Email", key: "email", width: 130 },
      { label: "Username", key: "username", width: 80 },
      { label: "Role", key: "role", width: 70 },
      { label: "Affiliate", key: "affiliate", width: 100 },
      { label: "Branch", key: "branch", width: 80 },
      { label: "Approved", key: "approved", width: 50 },
    ];

    if (format === "excel") {
      await exportExcel(res, "Users", columns, flatRows, "users.xlsx");
    } else {
      exportPdf(res, "Users", columns, flatRows, "users.pdf");
    }
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// ── News export ──

const exportNews = async (req, res) => {
  try {
    const format = req.query.format || "pdf";
    const search = (req.query.search || "").trim();

    const where = {};
    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { content: { contains: search, mode: "insensitive" } },
      ];
    }

    const rows = await prisma.news.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: MAX_EXPORT,
    });

    const flatRows = rows.map((r) => ({
      id: r.id,
      title: r.title,
      content: r.content?.length > 200 ? r.content.slice(0, 200) + "…" : r.content,
      createdAt: new Date(r.createdAt).toLocaleString(),
    }));

    const columns = [
      { label: "ID", key: "id", width: 40 },
      { label: "Title", key: "title", width: 150 },
      { label: "Content", key: "content", width: 300 },
      { label: "Date", key: "createdAt", width: 100 },
    ];

    if (format === "excel") {
      await exportExcel(res, "News", columns, flatRows, "news.xlsx");
    } else {
      exportPdf(res, "News", columns, flatRows, "news.pdf");
    }
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// ── Branches export ──

const exportBranches = async (req, res) => {
  try {
    const format = req.query.format || "pdf";
    const search = (req.query.search || "").trim();

    const where = { isDeleted: 0 };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { clientCode: { contains: search, mode: "insensitive" } },
      ];
    }

    const rows = await prisma.subDomain.findMany({
      where,
      include: { client: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: MAX_EXPORT,
    });

    const flatRows = rows.map((r) => ({
      clientCode: r.clientCode,
      client: r.client?.name,
      name: r.name,
      status: r.status,
    }));

    const columns = [
      { label: "Client Code", key: "clientCode", width: 80 },
      { label: "Client", key: "client", width: 120 },
      { label: "Branch Name", key: "name", width: 120 },
      { label: "Status", key: "status", width: 60 },
    ];

    if (format === "excel") {
      await exportExcel(res, "Branches", columns, flatRows, "branches.xlsx");
    } else {
      exportPdf(res, "Branches", columns, flatRows, "branches.pdf");
    }
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// ── Unlock Requests export ──

const exportUnlockRequests = async (req, res) => {
  try {
    const format = req.query.format || "pdf";
    const where = {};
    if (req.query.status) where.status = req.query.status;

    const rows = await prisma.unlockRequest.findMany({
      where,
      include: {
        negativeRecord: { select: { firstName: true, lastName: true, companyName: true, type: true } },
        requester: {
          select: { firstName: true, lastName: true, email: true, client: { select: { name: true } } },
        },
      },
      orderBy: { createdAt: "desc" },
      take: MAX_EXPORT,
    });

    const flatRows = rows.map((r) => ({
      id: r.id,
      record: r.negativeRecord?.type === "Individual"
        ? [r.negativeRecord.firstName, r.negativeRecord.lastName].filter(Boolean).join(" ")
        : r.negativeRecord?.companyName,
      requester: [r.requester?.firstName, r.requester?.lastName].filter(Boolean).join(" "),
      affiliate: r.requester?.client?.name,
      status: r.status,
      createdAt: new Date(r.createdAt).toLocaleString(),
    }));

    const columns = [
      { label: "ID", key: "id", width: 40 },
      { label: "Record", key: "record", width: 120 },
      { label: "Requester", key: "requester", width: 100 },
      { label: "Affiliate", key: "affiliate", width: 100 },
      { label: "Status", key: "status", width: 60 },
      { label: "Date", key: "createdAt", width: 100 },
    ];

    if (format === "excel") {
      await exportExcel(res, "Unlock Requests", columns, flatRows, "unlock-requests.xlsx");
    } else {
      exportPdf(res, "Unlock Requests", columns, flatRows, "unlock-requests.pdf");
    }
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

module.exports = {
  exportRecords,
  exportClients,
  exportUsers,
  exportNews,
  exportBranches,
  exportUnlockRequests,
};
