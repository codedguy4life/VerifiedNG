const mongoose = require("mongoose");
const User = require("../models/user");
const ProviderApplication = require("../models/ProviderApplication");

// Use the same immutable admin account-ID allowlist as community verification.
// Public signup cannot choose or spoof these IDs.
function canReview(user) {
  const ids = String(process.env.VERIFICATION_ADMIN_USER_IDS || "")
    .split(",").map((id) => id.trim()).filter(Boolean);
  return Boolean(user?._id && ids.includes(String(user._id)));
}
const clean = (value) => typeof value === "string" ? value.trim() : "";

async function me(req, res) {
  try {
    const user = await User.findById(req.user.id)
      .select("role isVerified state city fullName").lean();
    if (!user) return res.status(401).json({ message: "Please sign in again." });
    const application = await ProviderApplication.findOne({ user: user._id })
      .select("category bio skills experienceYears state city status reviewerNote reviewedAt createdAt").lean();
    return res.json({
      application,
      isProvider: user.role === "provider",
      verified: Boolean(user.isVerified),
      canReview: canReview(user),
    });
  } catch (error) {
    console.error("Provider application status:", error);
    return res.status(500).json({ message: "Could not load your provider application." });
  }
}

async function apply(req, res) {
  try {
    const user = await User.findById(req.user.id).select("role").lean();
    if (!user) return res.status(401).json({ message: "Please sign in again." });
    if (user.role === "provider") return res.status(409).json({ message: "You already have provider access." });
    const category = clean(req.body.category);
    const bio = clean(req.body.bio);
    const state = clean(req.body.state);
    const city = clean(req.body.city);
    const years = Number(req.body.experienceYears);
    const inputSkills = req.body.skills;
    if (category.length < 2 || category.length > 80 ||
        bio.length < 50 || bio.length > 1000 ||
        !state || state.length > 80 || !city || city.length > 80 ||
        !Number.isFinite(years) || years < 0 || years > 60 ||
        !Array.isArray(inputSkills) || inputSkills.length > 12 ||
        inputSkills.some((item) => typeof item !== "string" || item.trim().length > 60) ||
        req.body.confirmAccuracy !== true) {
      return res.status(400).json({ message: "Complete your service category, a 50–1,000 character bio, location, experience, skills and accuracy confirmation." });
    }
    const skills = [...new Set(inputSkills.map((item) => item.trim()).filter(Boolean))];
    const previous = await ProviderApplication.findOne({ user: user._id });
    if (previous?.status === "pending") return res.status(409).json({ message: "Your application is already being reviewed." });
    if (previous?.status === "approved") return res.status(409).json({ message: "Your provider application was already approved." });
    if (previous?.status === "rejected" &&
        Date.now() - new Date(previous.reviewedAt || previous.updatedAt).getTime() < 24 * 60 * 60 * 1000)
      return res.status(429).json({ message: "You can reapply 24 hours after the last review." });
    const application = await ProviderApplication.findOneAndUpdate(
      { user: user._id },
      { $set: { category, bio, state, city, experienceYears: years, skills, status: "pending", reviewer: null, reviewerNote: "", reviewedAt: null } },
      { upsert: true, new: true, runValidators: true },
    );
    return res.status(201).json({
      message: "Your provider application has been submitted for manual review. Approval is not automatic.",
      application: { status: application.status, createdAt: application.createdAt },
    });
  } catch (error) {
    if (error?.code === 11000) return res.status(409).json({ message: "An application already exists for this account. Refresh to check its status." });
    console.error("Provider application submit:", error);
    return res.status(500).json({ message: "Could not submit your application." });
  }
}

async function pending(req, res) {
  try {
    const reviewer = await User.findById(req.user.id).select("_id").lean();
    if (!canReview(reviewer)) return res.status(403).json({ message: "Admin review permission required." });
    const applications = await ProviderApplication.find({ status: "pending" })
      .sort({ updatedAt: 1 }).limit(60)
      .populate("user", "fullName email role isVerified")
      .lean();
    return res.json({ applications: applications.map((item) => ({
      _id: item._id, category: item.category, bio: item.bio,
      skills: item.skills, experienceYears: item.experienceYears,
      state: item.state, city: item.city, updatedAt: item.updatedAt,
      user: item.user ? { _id: item.user._id, fullName: item.user.fullName,
        email: item.user.email, role: item.user.role, isVerified: Boolean(item.user.isVerified) } : null,
    })) });
  } catch (error) {
    console.error("Provider application queue:", error);
    return res.status(500).json({ message: "Could not load applications." });
  }
}

async function review(req, res) {
  try {
    const reviewer = await User.findById(req.user.id).select("_id").lean();
    if (!canReview(reviewer)) return res.status(403).json({ message: "Admin review permission required." });
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: "Application not found." });
    const decision = req.body.decision;
    const reviewerNote = clean(req.body.reviewerNote);
    if (!["approved", "rejected"].includes(decision) || reviewerNote.length > 500 ||
        (decision === "rejected" && reviewerNote.length < 10)) {
      return res.status(400).json({ message: "Choose approve/reject and explain rejections in at least 10 characters." });
    }
    const item = await ProviderApplication.findOneAndUpdate(
      { _id: req.params.id, status: "pending" },
      { $set: { status: decision, reviewer: reviewer._id, reviewerNote, reviewedAt: new Date() } },
      { new: true, runValidators: true },
    );
    if (!item) return res.status(404).json({ message: "Pending application not found." });
    if (decision === "approved") {
      // Approval changes the service-provider role, not the separate
      // community verification flag (isVerified).
      await User.findByIdAndUpdate(item.user, {
        $set: {
          role: "provider", category: item.category, bio: item.bio,
          skills: item.skills, experienceYears: item.experienceYears,
          city: item.city, state: item.state,
        },
      }, { runValidators: true });
    }
    return res.json({ message: decision === "approved" ? "Provider application approved." : "Provider application declined.", status: decision });
  } catch (error) {
    console.error("Review provider application:", error);
    return res.status(500).json({ message: "Could not review this application." });
  }
}

module.exports = { me, apply, pending, review };
