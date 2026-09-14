const express = require("express");
const router = express.Router();
const {
  createHireRequest,
  getRequestsForProvider,
} = require("../controllers/hireController");
const { protect, requireRole } = require("../middleware/authMiddleware");

router.post("/", protect, requireRole("customer"), createHireRequest);
router.get(
  "/provider/:providerId",
  protect,
  requireRole("provider"),
  getRequestsForProvider,
);

module.exports = router;
