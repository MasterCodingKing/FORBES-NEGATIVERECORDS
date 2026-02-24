const express = require("express");
const auth = require("../middleware/auth.middleware");
const { requireAdmin } = require("../middleware/rbac.middleware");
const controller = require("../controllers/notification.controller");

const router = express.Router();

router.get("/", auth, requireAdmin, controller.listNotifications);
router.get("/unread-count", auth, requireAdmin, controller.getUnreadCount);
router.patch("/:id/read", auth, requireAdmin, controller.markAsRead);
router.patch("/read-all", auth, requireAdmin, controller.markAllAsRead);

module.exports = router;
