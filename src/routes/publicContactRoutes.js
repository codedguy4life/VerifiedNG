const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const controller = require("../controllers/publicContactController");

const router = express.Router();
router.post("/contact", controller.submit);
router.get("/contact/admin/inbox", protect, controller.inbox);
router.patch("/contact/admin/:id", protect, controller.markHandled);
module.exports = router;
