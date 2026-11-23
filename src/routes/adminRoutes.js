const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const controller = require("../controllers/adminController");

const router = express.Router();
router.use(protect);
// Server authorization is based on immutable MongoDB IDs, never localStorage,
// unverified emails, client-supplied roles, or a query-string "admin" flag.
router.use((req, res, next) => {
  const allowed = String(process.env.VERIFICATION_ADMIN_USER_IDS || "")
    .split(",").map((id) => id.trim()).filter(Boolean);
  if (!req.authUser?._id || !allowed.includes(String(req.authUser._id))) {
    return res.status(403).json({ message: "Admin access required." });
  }
  return next();
});

router.get("/overview", controller.overview);
router.get("/members", controller.members);
module.exports = router;
