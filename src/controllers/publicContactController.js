const mongoose = require("mongoose");
const User = require("../models/user");
const ContactMessage = require("../models/ContactMessage");
const clean = (value) => typeof value === "string" ? value.trim() : "";
const topics = new Set(["General enquiry", "Account or login", "Provider application", "Safety or report", "Privacy or data", "Other"]);
const ipBuckets = new Map();
function canReview(user) {
  const ids = String(process.env.VERIFICATION_ADMIN_USER_IDS || "")
    .split(",").map((id) => id.trim()).filter(Boolean);
  return Boolean(user?._id && ids.includes(String(user._id)));
}
async function submit(req, res) {
  try {
    // Honeypot: automated spam is quietly discarded; do not store its content.
    if (clean(req.body.website)) return res.status(200).json({ message: "Thanks. We received your message." });
    const name = clean(req.body.name);
    const email = clean(req.body.email).toLowerCase();
    const topic = clean(req.body.topic);
    const message = clean(req.body.message);
    if (name.length < 2 || name.length > 100 ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 200 ||
        !topics.has(topic) || message.length < 15 || message.length > 2000) {
      return res.status(400).json({ message: "Enter your name, a valid email, a topic and a message of 15–2,000 characters." });
    }
    const source = req.ip || req.socket.remoteAddress || "unknown";
    const now = Date.now();
    // Single-instance abuse control; distributed deployments should use a shared store.
    const seen = (ipBuckets.get(source) || []).filter((stamp) => now - stamp < 60 * 60 * 1000);
    if (seen.length >= 5) return res.status(429).json({ message: "Too many messages. Please try again later." });
    ipBuckets.set(source, [...seen, now]);
    if (ipBuckets.size > 5000) {
      for (const [key, values] of ipBuckets) {
        if (!values.some((stamp) => now - stamp < 60 * 60 * 1000)) ipBuckets.delete(key);
      }
    }
    await ContactMessage.create({ name, email, topic, message });
    return res.status(201).json({ message: "Thanks. Your message has been received by VerifiedNG." });
  } catch (error) {
    console.error("Public contact submission:", error);
    return res.status(500).json({ message: "Your message could not be saved. Please try again." });
  }
}
async function inbox(req, res) {
  try {
    const user = await User.findById(req.user.id).select("_id").lean();
    if (!canReview(user)) return res.status(403).json({ message: "Admin review permission required." });
    const messages = await ContactMessage.find({ status: "new" })
      .sort({ createdAt: 1 }).limit(60).lean();
    return res.json({ messages });
  } catch (error) {
    console.error("Contact enquiries inbox:", error);
    return res.status(500).json({ message: "Could not load enquiries." });
  }
}
async function markHandled(req, res) {
  try {
    const user = await User.findById(req.user.id).select("_id").lean();
    if (!canReview(user)) return res.status(403).json({ message: "Admin review permission required." });
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: "Enquiry not found." });
    const item = await ContactMessage.findOneAndUpdate(
      { _id: req.params.id, status: "new" },
      { $set: { status: "handled", handledBy: user._id, handledAt: new Date() } },
      { new: true },
    );
    if (!item) return res.status(404).json({ message: "Unresolved enquiry not found." });
    return res.json({ message: "Enquiry marked as handled." });
  } catch (error) {
    console.error("Resolve contact enquiry:", error);
    return res.status(500).json({ message: "Could not update enquiry." });
  }
}
module.exports = { submit, inbox, markHandled };
