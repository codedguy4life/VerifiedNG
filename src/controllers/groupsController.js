const mongoose = require("mongoose");
const User = require("../models/user");
const Group = require("../models/NeighbourhoodGroup");
const GroupPost = require("../models/GroupPost");

const categories = ["General", "Neighbourhood", "Business", "Learning", "Family", "Sports", "Interests"];
const escape = (value) => String(value).replace(/[^a-zA-Z0-9\s-]/g, "");
const validId = (value) => mongoose.isValidObjectId(value);
const postFields = "fullName profilePhoto isVerified role city state";

async function verified(req, res) {
  const viewer = await User.findById(req.user.id).select("isVerified city state");
  if (!viewer) { res.status(401).json({ message: "Please sign in again." }); return null; }
  if (!viewer.isVerified) { res.status(403).json({ message: "Verification is required to join, create and post in groups.", code: "VERIFICATION_REQUIRED" }); return null; }
  return viewer;
}
async function memberGroup(req, res) {
  const viewer = await verified(req, res);
  if (!viewer) return null;
  if (!validId(req.params.id)) { res.status(404).json({ message: "Group not found." }); return null; }
  const group = await Group.findOne({ _id: req.params.id, isActive: true, members: req.user.id });
  if (!group) { res.status(403).json({ message: "Join the group before viewing its posts." }); return null; }
  return group;
}
function shapePost(post, id) {
  const doc = post.toObject ? post.toObject() : post;
  return { ...doc, audience: "group",
    location: { city: "", state: "" },
    reactionCount: doc.reactions?.length || 0,
    commentCount: doc.comments?.length || 0,
    reactedByMe: (doc.reactions || []).some((user) => String(user) === String(id)),
    reactions: undefined, reports: undefined,
  };
}

async function listGroups(req, res) {
  try {
    const q = typeof req.query.search === "string" ? req.query.search.trim() : "";
    if (q.length > 80) return res.status(400).json({ message: "Search is too long." });
    const clause = { isActive: true };
    if (q) {
      const expression = new RegExp(escape(q), "i");
      clause.$or = [{ name: expression }, { description: expression }, { category: expression }, { city: expression }, { state: expression }];
    }
    const groups = await Group.find(clause).sort({ createdAt: -1 }).limit(60)
      .select("name description category city state creator members createdAt").lean();
    res.json({ groups: groups.map(({ members, ...group }) => ({
      ...group,
      memberCount: members?.length || 0,
      isMember: (members || []).some((item) => String(item) === String(req.user.id)),
    })) });
  } catch (error) { console.error("Groups list:", error); res.status(500).json({ message: "Could not load groups." }); }
}
async function createGroup(req, res) {
  try {
    const viewer = await verified(req, res);
    if (!viewer) return;
    const name = typeof req.body.name === "string" ? req.body.name.trim() : "";
    const description = typeof req.body.description === "string" ? req.body.description.trim() : "";
    const category = categories.includes(req.body.category) ? req.body.category : "General";
    if (name.length < 3 || name.length > 80 || description.length > 750)
      return res.status(400).json({ message: "Use a group name of 3–80 characters and a description under 750 characters." });
    const group = await Group.create({
      name, description, category, city: viewer.city || "", state: viewer.state || "",
      creator: req.user.id, members: [req.user.id],
    });
    res.status(201).json({ message: "Group created.", group: { _id: group._id, name: group.name } });
  } catch (error) { console.error("Groups create:", error); res.status(500).json({ message: "Could not create group." }); }
}
async function getGroup(req, res) {
  try {
    if (!validId(req.params.id)) return res.status(404).json({ message: "Group not found." });
    const group = await Group.findOne({ _id: req.params.id, isActive: true })
      .select("name description category city state creator members createdAt")
      .populate("creator", "fullName isVerified").lean();
    if (!group) return res.status(404).json({ message: "Group not found." });
    const { members, ...safe } = group;
    res.json({ group: { ...safe, memberCount: members?.length || 0,
      isMember: (members || []).some((item) => String(item) === String(req.user.id)) } });
  } catch (error) { console.error("Groups detail:", error); res.status(500).json({ message: "Could not load group." }); }
}
async function joinGroup(req, res) {
  try {
    const viewer = await verified(req, res);
    if (!viewer) return;
    if (!validId(req.params.id)) return res.status(404).json({ message: "Group not found." });
    const group = await Group.findOneAndUpdate(
      { _id: req.params.id, isActive: true },
      { $addToSet: { members: req.user.id } },
      { new: true },
    );
    if (!group) return res.status(404).json({ message: "Group not found." });
    res.json({ message: "You joined the group.", memberCount: group.members.length });
  } catch (error) { console.error("Groups join:", error); res.status(500).json({ message: "Could not join group." }); }
}
async function leaveGroup(req, res) {
  try {
    const group = await memberGroup(req, res);
    if (!group) return;
    if (String(group.creator) === String(req.user.id))
      return res.status(400).json({ message: "Group creators cannot leave until ownership transfer is available." });
    await Group.updateOne({ _id: group._id }, { $pull: { members: req.user.id } });
    res.json({ message: "You left this group." });
  } catch (error) { console.error("Groups leave:", error); res.status(500).json({ message: "Could not leave group." }); }
}
async function listPosts(req, res) {
  try {
    const group = await memberGroup(req, res);
    if (!group) return;
    const page = Math.max(1, Math.min(1000, Number.parseInt(req.query.page, 10) || 1));
    const limit = 12;
    const criteria = { group: group._id, isHidden: false };
    const [posts, total] = await Promise.all([
      GroupPost.find(criteria).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit)
        .populate("author", postFields).populate("comments.author", postFields).lean(),
      GroupPost.countDocuments(criteria),
    ]);
    res.json({ posts: posts.map((post) => shapePost(post, req.user.id)), total, page, hasMore: page * limit < total });
  } catch (error) { console.error("Group posts list:", error); res.status(500).json({ message: "Could not load group posts." }); }
}
async function createPost(req, res) {
  try {
    const group = await memberGroup(req, res);
    if (!group) return;
    const text = typeof req.body.text === "string" ? req.body.text.trim() : "";
    if (!text || text.length > 2000) return res.status(400).json({ message: "Write a post of 1–2,000 characters." });
    const post = await GroupPost.create({ group: group._id, author: req.user.id, text });
    await post.populate("author", postFields);
    res.status(201).json({ message: "Group post published.", post: shapePost(post, req.user.id) });
  } catch (error) { console.error("Groups post:", error); res.status(500).json({ message: "Could not publish group post." }); }
}
async function loadOwnedPost(req, res) {
  const group = await memberGroup(req, res);
  if (!group) return null;
  if (!validId(req.params.postId)) { res.status(404).json({ message: "Post not found." }); return null; }
  const post = await GroupPost.findOne({ _id: req.params.postId, group: group._id, isHidden: false });
  if (!post) { res.status(404).json({ message: "Post not found." }); return null; }
  return post;
}
async function react(req, res) {
  try {
    const post = await loadOwnedPost(req, res); if (!post) return;
    const added = !post.reactions.some((item) => String(item) === String(req.user.id));
    if (added) post.reactions.push(req.user.id); else post.reactions.pull(req.user.id);
    await post.save();
    res.json({ reacted: added, reactionCount: post.reactions.length });
  } catch (error) { console.error("Groups react:", error); res.status(500).json({ message: "Could not react." }); }
}
async function comment(req, res) {
  try {
    const post = await loadOwnedPost(req, res); if (!post) return;
    const text = typeof req.body.text === "string" ? req.body.text.trim() : "";
    if (!text || text.length > 1000) return res.status(400).json({ message: "Write a comment of 1–1,000 characters." });
    post.comments.push({ text, author: req.user.id });
    await post.save();
    res.status(201).json({ message: "Comment added." });
  } catch (error) { console.error("Groups comment:", error); res.status(500).json({ message: "Could not add comment." }); }
}
async function editPost(req, res) {
  try {
    const post = await loadOwnedPost(req, res); if (!post) return;
    if (String(post.author) !== String(req.user.id)) return res.status(403).json({ message: "Only the author can edit." });
    const text = typeof req.body.text === "string" ? req.body.text.trim() : "";
    if (!text || text.length > 2000) return res.status(400).json({ message: "Write 1–2,000 characters." });
    post.text = text; await post.save();
    res.json({ message: "Post updated." });
  } catch (error) { console.error("Groups edit:", error); res.status(500).json({ message: "Could not edit post." }); }
}
async function deletePost(req, res) {
  try {
    const post = await loadOwnedPost(req, res); if (!post) return;
    if (String(post.author) !== String(req.user.id)) return res.status(403).json({ message: "Only the author can delete." });
    post.isHidden = true; await post.save();
    res.json({ message: "Post removed." });
  } catch (error) { console.error("Groups delete:", error); res.status(500).json({ message: "Could not remove post." }); }
}
async function report(req, res) {
  try {
    const post = await loadOwnedPost(req, res); if (!post) return;
    const reason = ["spam", "harassment", "scam", "misinformation", "other"].includes(req.body.reason) ? req.body.reason : "";
    const details = typeof req.body.details === "string" ? req.body.details.trim() : "";
    if (!reason || details.length > 500) return res.status(400).json({ message: "Choose a valid reason and brief details." });
    if (String(post.author) === String(req.user.id)) return res.status(400).json({ message: "You cannot report your own post." });
    if (post.reports.some((item) => String(item.reporter) === String(req.user.id))) return res.status(409).json({ message: "Already reported." });
    post.reports.push({ reporter: req.user.id, reason, details });
    await post.save();
    res.status(201).json({ message: "Report received for review." });
  } catch (error) { console.error("Groups report:", error); res.status(500).json({ message: "Could not report post." }); }
}
module.exports = { listGroups, createGroup, getGroup, joinGroup, leaveGroup, listPosts, createPost, react, comment, editPost, deletePost, report };
