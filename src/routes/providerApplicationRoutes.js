const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const controller = require("../controllers/providerApplicationController");

const router = express.Router();
router.use(protect);
router.get("/me", controller.me);
router.post("/", controller.apply);
router.get("/admin/pending", controller.pending);
router.get("/admin/recent", controller.recent);
router.patch("/admin/:id", controller.review);

module.exports = router;
