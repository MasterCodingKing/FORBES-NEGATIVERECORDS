const express = require("express");
const auth = require("../middleware/auth.middleware");
const controller = require("../controllers/search_log.controller");

const router = express.Router();

router.get("/my", auth, controller.getMyLogs);
router.get("/affiliates", auth, controller.getClientAffiliateLogs);

module.exports = router;
