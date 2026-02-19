const express = require("express");
const auth = require("../middleware/auth.middleware");
const { requireAdmin, requireSuperAdmin } = require("../middleware/rbac.middleware");
const { allowTrashAccess } = require("../middleware/trash.middleware");
const controller = require("../controllers/sub_domain.controller");

const router = express.Router();

router.get("/", auth, requireAdmin, controller.list);
router.post("/", auth, requireAdmin, controller.create);
router.put("/:id", auth, requireAdmin, controller.update);
router.delete("/:id", auth, requireAdmin, controller.softDelete);

router.get("/trash", auth, allowTrashAccess, controller.listTrash);
router.patch("/:id/restore", auth, allowTrashAccess, controller.restore);
router.delete("/:id/force", auth, requireSuperAdmin, controller.forceDelete);

module.exports = router;
