const express = require("express");
const router = express.Router();
const {
  createHireRequest,
  getRequestsForProvider,
  updateHireRequestStatus,
  getRequestsSentByCustomer,
} = require("../controllers/hireController");
const { protect, requireRole } = require("../middleware/authMiddleware");

router.post("/", protect, requireRole("customer"), createHireRequest);

router.get(
  "/provider",
  protect,
  requireRole("provider"),
  getRequestsForProvider,
);

router.get(
  "/sent",
  protect,
  requireRole("customer"),
  getRequestsSentByCustomer,
);

router.patch(
  "/:requestId/status",
  protect,
  requireRole("provider"),
  updateHireRequestStatus,
);

module.exports = router;
