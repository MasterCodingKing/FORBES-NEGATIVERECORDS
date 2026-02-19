const express = require("express");
const auth = require("../middleware/auth.middleware");
const { requireAdmin } = require("../middleware/rbac.middleware");
const controller = require("../controllers/credit.controller");

const router = express.Router();

router.post("/topup", auth, requireAdmin, controller.topUp);
router.get("/client/:clientId", auth, requireAdmin, controller.getClientCredit);
router.get("/client/:clientId/transactions", auth, requireAdmin, controller.getTransactionHistory);
router.get("/client/:clientId/search-logs", auth, requireAdmin, controller.getSearchLogsByClient);

module.exports = router;
