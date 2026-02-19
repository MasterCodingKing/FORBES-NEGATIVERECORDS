const express = require("express");
const auth = require("../middleware/auth.middleware");
const { requireAdmin } = require("../middleware/rbac.middleware");
const controller = require("../controllers/user.controller");

const router = express.Router();

// Admin: manage user accounts
router.get("/roles", auth, controller.listRoles);
router.get("/pending", auth, requireAdmin, controller.listPending);
router.get("/all", auth, requireAdmin, controller.listAll);
router.post("/", auth, requireAdmin, controller.create);
router.patch("/:id/approve", auth, requireAdmin, controller.approve);
router.put("/:id", auth, requireAdmin, controller.updateUser);
router.delete("/:id", auth, requireAdmin, controller.deleteUser);

// Self-service profile
router.get("/profile", auth, controller.getProfile);
router.put("/profile", auth, controller.updateProfile);
router.put("/profile/password", auth, controller.changePassword);

module.exports = router;
