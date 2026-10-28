const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const { getLocalNews } = require("../controllers/localNewsController");

const router = express.Router();
router.use(protect);
router.get("/", getLocalNews);

module.exports = router;
