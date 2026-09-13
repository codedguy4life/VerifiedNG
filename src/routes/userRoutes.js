const express = require("express");
const router = express.Router();
const {
  getProfile,
  updateProfile,
  upgradeToProvider,
  deleteAccount,
} = require("../controllers/userController");
const { protect } = require("../middleware/authMiddleware");

router.get("/profile", protect, getProfile);
router.put("/profile", protect, updateProfile);
router.put("/upgrade-provider", protect, upgradeToProvider);
router.post("/delete-account", protect, deleteAccount);

module.exports = router;
