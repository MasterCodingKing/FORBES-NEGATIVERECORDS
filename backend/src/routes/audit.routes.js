const express = require("express");
const auth = require("../middleware/auth.middleware");
const { requireAdmin } = require("../middleware/rbac.middleware");
const controller = require("../controllers/audit.controller");

const router = express.Router();

// Admin-only: audit trail endpoints
router.get("/", auth, requireAdmin, controller.listAuditLogs);
router.get("/actions", auth, requireAdmin, controller.getDistinctActions);
router.get("/modules", auth, requireAdmin, controller.getDistinctModules);

module.exports = router;
