const express = require("express");
const auth = require("../middleware/auth.middleware");
const { requireAdmin } = require("../middleware/rbac.middleware");
const controller = require("../controllers/unlock.controller");

const router = express.Router();

// Affiliate: create requests, view own requests, view requests for owned records
router.post("/", auth, controller.createRequest);
router.get("/my", auth, controller.listMyRequests);
router.get("/owned", auth, controller.listOwnedRequests);

// Admin: view all requests, approve/deny
router.get("/all", auth, requireAdmin, controller.listAllRequests);

// Review: admin OR lock owner (authorization checked inside controller)
router.patch("/:id/review", auth, controller.reviewRequest);

module.exports = router;
