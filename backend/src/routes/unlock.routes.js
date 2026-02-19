const express = require("express");
const auth = require("../middleware/auth.middleware");
const { requireAdmin } = require("../middleware/rbac.middleware");
const controller = require("../controllers/unlock.controller");

const router = express.Router();

// Affiliate: create requests, view own requests
router.post("/", auth, controller.createRequest);
router.get("/my", auth, controller.listMyRequests);

// Admin: view all requests, approve/deny
router.get("/all", auth, requireAdmin, controller.listAllRequests);
router.patch("/:id/review", auth, requireAdmin, controller.reviewRequest);

module.exports = router;
