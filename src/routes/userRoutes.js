const express = require("express");
const router = express.Router();
const { getProfile } = require("../controllers/userController");
const { protect } = require("../middleware/authMiddleware");

// protect runs FIRST, then getProfile
router.get("/profile", protect, getProfile);

module.exports = router;
