const router = require("express").Router();
const auth = require("../middleware/auth.middleware");
const { requireAdmin } = require("../middleware/rbac.middleware");
const {
  exportRecords,
  exportClients,
  exportUsers,
  exportNews,
  exportBranches,
  exportUnlockRequests,
} = require("../controllers/export.controller");

// All export routes require Admin or Super Admin
router.use("/", auth, requireAdmin);

router.get("/records/export", exportRecords);
router.get("/clients/export", exportClients);
router.get("/users/export", exportUsers);
router.get("/news/export", exportNews);
router.get("/sub-domains/export", exportBranches);
router.get("/unlock-requests/export", exportUnlockRequests);

module.exports = router;
