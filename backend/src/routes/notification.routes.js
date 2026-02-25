const express = require("express");
const auth = require("../middleware/auth.middleware");
const { requireAdmin } = require("../middleware/rbac.middleware");
const controller = require("../controllers/notification.controller");

const router = express.Router();

router.get("/", auth, controller.listNotifications);
router.get("/unread-count", auth, controller.getUnreadCount);
router.patch("/:id/read", auth, controller.markAsRead);
router.patch("/read-all", auth, controller.markAllAsRead);

module.exports = router;
