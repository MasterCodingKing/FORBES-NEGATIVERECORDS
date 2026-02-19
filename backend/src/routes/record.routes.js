const express = require("express");
const auth = require("../middleware/auth.middleware");
const { requireAdmin } = require("../middleware/rbac.middleware");
const controller = require("../controllers/record.controller");

const router = express.Router();

// Admin: OCR upload and manual record management
router.post("/ocr-upload", auth, requireAdmin, controller.upload.single("file"), controller.uploadAndProcess);
router.post("/", auth, requireAdmin, controller.createRecord);
router.get("/", auth, requireAdmin, controller.listRecords);

// Affiliate: search
router.get("/search", auth, controller.search);

module.exports = router;
