const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const { ask, trending } = require("../controllers/localAssistantController");
const router = express.Router();
router.use(protect);
router.post("/ask", ask);
router.get("/trending", trending);
module.exports = router;
