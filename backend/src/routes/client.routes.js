const express = require("express");
const auth = require("../middleware/auth.middleware");
const { requireAdmin } = require("../middleware/rbac.middleware");
const controller = require("../controllers/client.controller");

const router = express.Router();

router.get("/", auth, requireAdmin, controller.list);
router.get("/:id", auth, requireAdmin, controller.getById);
router.post("/", auth, requireAdmin, controller.create);
router.put("/:id", auth, requireAdmin, controller.update);
router.delete("/:id", auth, requireAdmin, controller.remove);

module.exports = router;
