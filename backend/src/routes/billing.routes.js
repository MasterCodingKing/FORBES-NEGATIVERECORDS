const express = require("express");
const auth = require("../middleware/auth.middleware");
const { requireAdmin } = require("../middleware/rbac.middleware");
const controller = require("../controllers/billing.controller");

const router = express.Router();

router.get("/", auth, requireAdmin, controller.getBillingRecords);
router.get("/summary", auth, requireAdmin, controller.getBillingSummary);

module.exports = router;
