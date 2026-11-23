const User = require("../models/user");
const ProviderApplication = require("../models/ProviderApplication");
const VerificationRequest = require("../models/VerificationRequest");
const ContactMessage = require("../models/ContactMessage");

// Only summary counts needed for the admin dashboard. Never include private
// user records, password hashes or raw verification evidence in this response.
async function overview(req, res) {
  try {
    const [members, providers, verifiedMembers, providerPending, verificationPending, supportOpen] =
      await Promise.all([
        User.countDocuments({}),
        User.countDocuments({ role: "provider" }),
        User.countDocuments({ isVerified: true }),
        ProviderApplication.countDocuments({ status: "pending" }),
        VerificationRequest.countDocuments({ status: "pending" }),
        ContactMessage.countDocuments({ status: "new" }),
      ]);
    return res.json({
      counts: { members, providers, verifiedMembers, providerPending, verificationPending, supportOpen },
    });
  } catch (error) {
    console.error("Admin overview:", error);
    return res.status(500).json({ message: "Could not load admin overview." });
  }
}

// Read-only member directory for now. Administrative role changes, bans and
// deletions must have a separate audited workflow before we enable them.
async function members(req, res) {
  try {
    const page = Math.max(1, Math.min(100000, Number.parseInt(req.query.page, 10) || 1));
    const rawQuery = typeof req.query.q === "string" ? req.query.q.trim() : "";
    if (rawQuery.length > 80) {
      return res.status(400).json({ message: "Search must be 80 characters or fewer." });
    }
    const escaped = rawQuery.replace(/[.*+?^$\{\}()|[\]\\]/g, "\\$&");
    const filter = escaped ? { $or: [
      { fullName: { $regex: escaped, $options: "i" } },
      { email: { $regex: escaped, $options: "i" } },
      { city: { $regex: escaped, $options: "i" } },
      { state: { $regex: escaped, $options: "i" } },
    ] } : {};
    const [total, users] = await Promise.all([
      User.countDocuments(filter),
      User.find(filter).select("_id fullName email role isVerified state city createdAt")
        .sort({ createdAt: -1 }).skip((page - 1) * 20).limit(20).lean(),
    ]);
    return res.json({ users, total, page, pages: Math.max(1, Math.ceil(total / 20)) });
  } catch (error) {
    console.error("Admin member directory:", error);
    return res.status(500).json({ message: "Could not load members." });
  }
}
module.exports = { overview, members };
