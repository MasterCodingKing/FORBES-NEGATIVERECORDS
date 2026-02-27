const express = require("express");
const auth = require("../middleware/auth.middleware");
const { requireAdmin } = require("../middleware/rbac.middleware");
const controller = require("../controllers/record.controller");

const router = express.Router();

// Admin: OCR upload and manual record management
router.post("/ocr-upload", auth, requireAdmin, controller.upload.single("file"), controller.uploadAndProcess);
router.post("/upload-parse", auth, requireAdmin, controller.upload.single("file"), controller.uploadAndParse);
router.post("/bulk-insert", auth, requireAdmin, controller.bulkInsert);
router.get("/ocr-batch/:id", auth, requireAdmin, controller.getOcrBatchStatus);
router.post("/", auth, requireAdmin, controller.createRecord);
router.get("/", auth, requireAdmin, controller.listRecords);
router.get("/details/:id", auth, requireAdmin, controller.getRecordDetails);

// Affiliate: search and record access
router.get("/search", auth, controller.search);
router.get("/:id/lock-info", auth, controller.getLockInfo);
router.post("/:id/print", auth, controller.printRecord);

module.exports = router;
