const express = require("express");
const auth = require("../middleware/auth.middleware");
const { requireAdmin } = require("../middleware/rbac.middleware");
const controller = require("../controllers/dashboard.controller");

const router = express.Router();

// Admin-only dashboard stats
router.get("/stats", auth, requireAdmin, controller.getDashboardStats);

module.exports = router;
