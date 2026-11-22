const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const { signUpload } = require("../controllers/uploadController");
const router = express.Router();
router.use(protect);
router.post("/sign", signUpload);
module.exports = router;
