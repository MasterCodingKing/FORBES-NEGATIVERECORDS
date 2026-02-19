const express = require("express");
const auth = require("../middleware/auth.middleware");
const { requireAdmin } = require("../middleware/rbac.middleware");
const controller = require("../controllers/news.controller");

const router = express.Router();

// Public: landing page news
router.get("/", controller.list);
router.get("/:id", controller.getById);

// Admin only
router.post("/", auth, requireAdmin, controller.create);
router.put("/:id", auth, requireAdmin, controller.update);
router.delete("/:id", auth, requireAdmin, controller.remove);

module.exports = router;
