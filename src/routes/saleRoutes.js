const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const { listItems, getItem, createItem, changeItemStatus, CATEGORIES } = require("../controllers/saleController");

const router = express.Router();
router.use(protect);
router.get("/categories", (req, res) => res.json({ categories: CATEGORIES }));
router.get("/", listItems);
router.get("/:id", getItem);
router.post("/", createItem);
router.patch("/:id/status", changeItemStatus);

module.exports = router;
