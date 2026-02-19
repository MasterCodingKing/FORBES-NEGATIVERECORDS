const express = require("express");
const auth = require("../middleware/auth.middleware");
const controller = require("../controllers/directory.controller");

const router = express.Router();

router.get("/", auth, controller.getDirectory);

module.exports = router;
