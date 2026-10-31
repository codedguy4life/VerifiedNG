const User = require("../models/user");
const VerificationRequest = require("../models/VerificationRequest");

function isAdmin(user) {
  const allowed = String(process.env.VERIFICATION_ADMIN_EMAILS || "")
    .split(",").map((item) => item.trim().toLowerCase()).filter(Boolean);
  return Boolean(user?.email && allowed.includes(user.email.toLowerCase()));
}
async function getViewer(req) {
  return User.findById(req.user.id).select("email fullName isVerified city state");
}
async function status(req, res) {
  try {
    const viewer = await getViewer(req);
    if (!viewer) return res.status(401).json({ message: "Please sign in again." });
    const request = await VerificationRequest.findOne({ user: viewer._id }).select("status createdAt reviewedAt reviewerNote").lean();
    res.json({ verified: Boolean(viewer.isVerified), request, canReview: isAdmin(viewer) });
  } catch (error) {
    console.error("Verification status:", error);
    res.status(500).json({ message: "Could not load verification status." });
  }
}
async function submit(req, res) {
  try {
    const viewer = await getViewer(req);
    if (!viewer) return res.status(401).json({ message: "Please sign in again." });
    if (viewer.isVerified) return res.status(409).json({ message: "Your account is already verified." });
    if (!viewer.state && !viewer.city)
      return res.status(400).json({ message: "Add your state or city in My profile before requesting verification." });
    const note = typeof req.body.note === "string" ? req.body.note.trim() : "";
    if (note.length < 15 || note.length > 700)
      return res.status(400).json({ message: "Describe your reason for joining in 15 to 700 characters." });
    const existing = await VerificationRequest.findOne({ user: viewer._id });
    if (existing?.status === "pending") return res.status(409).json({ message: "Your verification request is already under review." });
    if (existing?.status === "rejected" && Date.now() - new Date(existing.reviewedAt || existing.updatedAt).getTime() < 24 * 60 * 60 * 1000)
      return res.status(429).json({ message: "You can submit another request 24 hours after the review." });
    const request = await VerificationRequest.findOneAndUpdate(
      { user: viewer._id },
      { $set: { note, status: "pending", reviewer: null, reviewedAt: null, reviewerNote: "" } },
      { upsert: true, new: true, runValidators: true },
    );
    res.status(201).json({ message: "Request submitted for manual review. This is not automatic approval.", request: { status: request.status, createdAt: request.createdAt } });
  } catch (error) {
    console.error("Verification submit:", error);
    res.status(500).json({ message: "Could not submit verification request." });
  }
}
async function pending(req, res) {
  try {
    const reviewer = await getViewer(req);
    if (!isAdmin(reviewer)) return res.status(403).json({ message: "Admin review permission required." });
    const requests = await VerificationRequest.find({ status: "pending" })
      .sort({ updatedAt: 1 }).limit(50)
      .populate("user", "fullName email city state isVerified")
      .lean();
    res.json({ requests: requests.map(({ note, user, _id, updatedAt }) => ({
      _id, note, user: user ? { _id: user._id, fullName: user.fullName, email: user.email, city: user.city, state: user.state, isVerified: user.isVerified } : null, updatedAt,
    })) });
  } catch (error) {
    console.error("Verification pending:", error);
    res.status(500).json({ message: "Could not load review queue." });
  }
}
async function review(req, res) {
  try {
    const reviewer = await getViewer(req);
    if (!isAdmin(reviewer)) return res.status(403).json({ message: "Admin review permission required." });
    const decision = req.body.decision;
    const reviewerNote = typeof req.body.reviewerNote === "string" ? req.body.reviewerNote.trim() : "";
    if (!["approved", "rejected"].includes(decision) || reviewerNote.length > 500)
      return res.status(400).json({ message: "Invalid review decision or note." });
    const request = await VerificationRequest.findOneAndUpdate(
      { _id: req.params.id, status: "pending" },
      { $set: { status: decision, reviewer: reviewer._id, reviewedAt: new Date(), reviewerNote } },
      { new: true },
    );
    if (!request) return res.status(404).json({ message: "Pending request not found." });
    if (decision === "approved") {
      await User.findByIdAndUpdate(request.user, { $set: { isVerified: true } });
    }
    res.json({ message: decision === "approved" ? "Account approved." : "Request declined.", status: decision });
  } catch (error) {
    if (error?.name === "CastError") return res.status(404).json({ message: "Pending request not found." });
    console.error("Verification review:", error);
    res.status(500).json({ message: "Could not review request." });
  }
}
module.exports = { status, submit, pending, review };
