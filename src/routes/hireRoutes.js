const express = require("express");
const router = express.Router();
const {
  createHireRequest,
  getRequestsForProvider,
} = require("../controllers/hireController");
const { protect } = require("../middleware/authMiddleware");

router.post("/", createHireRequest);
router.get("/provider/:providerId", protect, getRequestsForProvider);

module.exports = router;
