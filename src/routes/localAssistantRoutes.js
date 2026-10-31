const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const { ask } = require("../controllers/localAssistantController");
const router = express.Router();
router.use(protect);
router.post("/ask", ask);
module.exports = router;
