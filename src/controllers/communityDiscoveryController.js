const CommunityPost = require("../models/CommunityPost");
const User = require("../models/user");

const CATEGORY_LIST = ["General", "Question", "Opportunity", "Recommendation", "Service Request", "Safety Alert"];
const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function locationFilter(area) {
  const parts = String(area || "").split(",").map((part) => part.trim()).filter(Boolean);
  if (!parts.length) return null;
  if (parts.length > 1) {
    return {
      "location.city": new RegExp("^" + escapeRegex(parts[0]) + "$", "i"),
      "location.state": new RegExp("^" + escapeRegex(parts[parts.length - 1]) + "$", "i"),
    };
  }
  const match = new RegExp("^" + escapeRegex(parts[0]) + "$", "i");
  return { $or: [{ "location.city": match }, { "location.state": match }] };
}

// Keep local-only posts limited to the signed-in user's own area.
// A browser-supplied area is a search filter, not an authorization grant.
async function searchCommunity(req, res) {
  try {
    const viewer = await User.findById(req.user.id).select("city state");
    if (!viewer) return res.status(401).json({ message: "Please sign in again." });

    const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
    const area = typeof req.query.area === "string" ? req.query.area.trim() : "";
    const category = typeof req.query.category === "string" ? req.query.category : "";
    if (q.length > 80 || area.length > 100)
      return res.status(400).json({ message: "Search or area is too long." });
    if (category && !CATEGORY_LIST.includes(category))
      return res.status(400).json({ message: "Unknown post category." });

    const limit = Math.min(20, Math.max(1, parseInt(req.query.limit, 10) || 12));
    const localConditions = [];
    if (viewer.city) localConditions.push({ "location.city": new RegExp("^" + escapeRegex(viewer.city) + "$", "i") });
    if (viewer.state) localConditions.push({ "location.state": new RegExp("^" + escapeRegex(viewer.state) + "$", "i") });

    const visibility = [{ audience: "national" }];
    if (localConditions.length) visibility.push({ audience: "local", $or: localConditions });
    const clauses = [{ isHidden: false }, { $or: visibility }];
    if (q) {
      const match = new RegExp(escapeRegex(q), "i");
      clauses.push({ $or: [{ text: match }, { category: match }] });
    }
    if (category) clauses.push({ category });
    if (area) clauses.push(locationFilter(area));

    const posts = await CommunityPost.find({ $and: clauses })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate("author", "fullName profilePhoto role isVerified city state")
      .lean();
    res.json({
      posts: posts.map(({ reactions, reports, ...post }) => ({
        ...post,
        reactionCount: reactions?.length || 0,
        commentCount: post.comments?.length || 0,
      })),
      area,
      category,
    });
  } catch (error) {
    console.error("Community discovery search failed:", error);
    res.status(500).json({ message: "Could not search community posts." });
  }
}

module.exports = { searchCommunity };
