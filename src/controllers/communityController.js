const mongoose = require("mongoose");
const User = require("../models/user");
const CommunityPost = require("../models/CommunityPost");

const postCategories = ["General", "Question", "Opportunity", "Recommendation", "Service Request", "Safety Alert"];
const reportReasons = ["spam", "harassment", "scam", "misinformation", "other"];
const authorFields = "fullName profilePhoto role isVerified state city";

const currentUser = async (req) => User.findById(req.user.id).select("fullName profilePhoto role isVerified state city");

const createPost = async (req, res) => {
  try {
    const author = await currentUser(req);
    if (!author) return res.status(401).json({ message: "Your account could not be found. Please sign in again." });
    const text = typeof req.body.text === "string" ? req.body.text.trim() : "";
    const category = postCategories.includes(req.body.category) ? req.body.category : "General";
    const audience = req.body.audience === "local" ? "local" : "national";
    const imageUrl = typeof req.body.imageUrl === "string" && req.body.imageUrl.startsWith("https://res.cloudinary.com/") ? req.body.imageUrl : "";
    const videoUrl = typeof req.body.videoUrl === "string" && req.body.videoUrl.startsWith("https://res.cloudinary.com/") ? req.body.videoUrl : "";
    if (!text && !imageUrl && !videoUrl) return res.status(400).json({ message: "Write something or attach a photo/video before posting." });
    if (text.length > 2000) return res.status(400).json({ message: "Posts must be 2,000 characters or fewer." });
    if (audience === "local" && !author.state && !author.city) {
      return res.status(400).json({ message: "Add your state or city to your profile before posting locally." });
    }
    const post = await CommunityPost.create({
      author: author._id,
      text,
      imageUrl,
      videoUrl,
      category,
      audience,
      location: { state: author.state || "", city: author.city || "" },
    });
    await post.populate({ path: "author", select: authorFields });
    return res.status(201).json({ message: "Post published.", post });
  } catch (error) {
    console.error("Community createPost:", error);
    return res.status(500).json({ message: "Could not publish your post." });
  }
};

const getFeed = async (req, res) => {
  try {
    const viewer = await currentUser(req);
    if (!viewer) return res.status(401).json({ message: "Please sign in to view the community." });
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(30, Math.max(1, Number.parseInt(req.query.limit, 10) || 10));
    const scope = ["nearby", "nigeria", "for-you"].includes(req.query.scope) ? req.query.scope : "for-you";
    const selectedArea = typeof req.query.area === "string" ? req.query.area.trim() : "";
    const areaParts = selectedArea.split(",").map((part) => part.trim()).filter(Boolean);
    const escapeRegex = (value) => value.replaceAll(".", "\\.").replaceAll("$", "\\$").replaceAll("*", "\\*").replaceAll("+", "\\+").replaceAll("?", "\\?").replaceAll("^", "\\^").replaceAll("{", "\\{").replaceAll("}", "\\}").replaceAll("(", "\\(").replaceAll(")", "\\)").replaceAll("|", "\\|").replaceAll("[", "\\[").replaceAll("]", "\\]").replaceAll("\\", "\\\\");
    const city = areaParts.length > 1 ? areaParts[0] : (selectedArea || viewer.city || "");
    const state = areaParts.length > 1 ? areaParts[areaParts.length - 1] : (selectedArea || viewer.state || "");
    const locationMatches = [];
    if (city) locationMatches.push({ "location.city": new RegExp("^" + escapeRegex(city) + "$", "i") });
    if (state) locationMatches.push({ "location.state": new RegExp("^" + escapeRegex(state) + "$", "i") });
    let visibility = { isHidden: false };
    if (scope === "nigeria") {
      visibility = { isHidden: false, audience: "national" };
    } else if (scope === "nearby") {
      visibility = locationMatches.length ? { isHidden: false, audience: "local", $or: locationMatches } : { isHidden: false, audience: "local", _id: null };
    } else {
      visibility = locationMatches.length ? { isHidden: false, $or: [{ audience: "national" }, { audience: "local", $or: locationMatches }] } : { isHidden: false, audience: "national" };
    }
    const [posts, total] = await Promise.all([
      CommunityPost.find(visibility)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate("author", authorFields)
        .populate("comments.author", "fullName profilePhoto role isVerified")
        .lean(),
      CommunityPost.countDocuments(visibility),
    ]);
    const shaped = posts.map((post) => ({
      ...post,
      reactionCount: post.reactions.length,
      commentCount: post.comments.length,
      reactedByMe: post.reactions.some((id) => String(id) === String(viewer._id)),
      reactions: undefined,
      reports: undefined,
    }));
    return res.json({ posts: shaped, page, limit, total, hasMore: page * limit < total, scope });
  } catch (error) {
    console.error("Community getFeed:", error);
    return res.status(500).json({ message: "Could not load the community feed." });
  }
};

const addComment = async (req, res) => {
  try {
    const text = typeof req.body.text === "string" ? req.body.text.trim() : "";
    if (!text) return res.status(400).json({ message: "Write a comment first." });
    if (text.length > 1000) return res.status(400).json({ message: "Comments must be 1,000 characters or fewer." });
    const post = await CommunityPost.findOne({ _id: req.params.postId, isHidden: false });
    if (!post) return res.status(404).json({ message: "Post not found." });
    post.comments.push({ author: req.user.id, text });
    await post.save();
    await post.populate("comments.author", "fullName profilePhoto role isVerified");
    return res.status(201).json({ message: "Comment added.", comment: post.comments[post.comments.length - 1] });
  } catch (error) {
    if (error instanceof mongoose.Error.CastError) return res.status(404).json({ message: "Post not found." });
    console.error("Community addComment:", error);
    return res.status(500).json({ message: "Could not add your comment." });
  }
};

const toggleReaction = async (req, res) => {
  try {
    const post = await CommunityPost.findOne({ _id: req.params.postId, isHidden: false });
    if (!post) return res.status(404).json({ message: "Post not found." });
    const alreadyReacted = post.reactions.some((id) => String(id) === String(req.user.id));
    if (alreadyReacted) post.reactions = post.reactions.filter((id) => String(id) !== String(req.user.id));
    else post.reactions.push(req.user.id);
    await post.save();
    return res.json({ reacted: !alreadyReacted, reactionCount: post.reactions.length });
  } catch (error) {
    if (error instanceof mongoose.Error.CastError) return res.status(404).json({ message: "Post not found." });
    console.error("Community toggleReaction:", error);
    return res.status(500).json({ message: "Could not update your reaction." });
  }
};

const updatePost = async (req, res) => {
  try {
    const text = typeof req.body.text === "string" ? req.body.text.trim() : "";
    const categories = ["General", "Question", "Opportunity", "Recommendation", "Service Request", "Safety Alert"];
    if (!text) return res.status(400).json({ message: "A post cannot be empty." });
    if (text.length > 2000) return res.status(400).json({ message: "Posts must be 2,000 characters or fewer." });
    const post = await CommunityPost.findById(req.params.postId);
    if (!post || post.isHidden) return res.status(404).json({ message: "Post not found." });
    if (String(post.author) !== String(req.user.id)) return res.status(403).json({ message: "You can only edit your own posts." });
    post.text = text;
    if (categories.includes(req.body.category)) post.category = req.body.category;
    await post.save();
    await post.populate({ path: "author", select: authorFields });
    return res.json({ message: "Post updated.", post });
  } catch (error) {
    if (error instanceof mongoose.Error.CastError) return res.status(404).json({ message: "Post not found." });
    console.error("Community updatePost:", error);
    return res.status(500).json({ message: "Could not update your post." });
  }
};

const deletePost = async (req, res) => {
  try {
    const post = await CommunityPost.findById(req.params.postId);
    if (!post || post.isHidden) return res.status(404).json({ message: "Post not found." });
    if (String(post.author) !== String(req.user.id)) return res.status(403).json({ message: "You can only delete your own posts." });
    await post.deleteOne();
    return res.json({ message: "Post deleted." });
  } catch (error) {
    if (error instanceof mongoose.Error.CastError) return res.status(404).json({ message: "Post not found." });
    console.error("Community deletePost:", error);
    return res.status(500).json({ message: "Could not delete your post." });
  }
};

const reportPost = async (req, res) => {
  try {
    const reason = reportReasons.includes(req.body.reason) ? req.body.reason : "";
    const details = typeof req.body.details === "string" ? req.body.details.trim() : "";
    if (!reason) return res.status(400).json({ message: "Choose a report reason." });
    const post = await CommunityPost.findOne({ _id: req.params.postId, isHidden: false });
    if (!post) return res.status(404).json({ message: "Post not found." });
    if (String(post.author) === String(req.user.id)) return res.status(400).json({ message: "You cannot report your own post." });
    if (post.reports.some((report) => String(report.reporter) === String(req.user.id))) {
      return res.status(409).json({ message: "You have already reported this post." });
    }
    post.reports.push({ reporter: req.user.id, reason, details });
    await post.save();
    return res.status(201).json({ message: "Thanks. Your report has been sent for review." });
  } catch (error) {
    if (error instanceof mongoose.Error.CastError) return res.status(404).json({ message: "Post not found." });
    console.error("Community reportPost:", error);
    return res.status(500).json({ message: "Could not submit your report." });
  }
};

module.exports = { createPost, getFeed, addComment, toggleReaction, updatePost, deletePost, reportPost };
