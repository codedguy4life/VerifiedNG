const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const {
  createPost,
  getFeed,
  addComment,
  toggleReaction,
  deletePost,
  reportPost,
} = require("../controllers/communityController");

router.use(protect);
router.get("/feed", getFeed);
router.post("/posts", createPost);
router.post("/posts/:postId/comments", addComment);
router.post("/posts/:postId/reactions", toggleReaction);
router.delete("/posts/:postId", deletePost);
router.post("/posts/:postId/reports", reportPost);

module.exports = router;
