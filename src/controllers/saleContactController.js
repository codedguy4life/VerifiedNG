const mongoose = require("mongoose");
const SaleItem = require("../models/SaleItem");
const SaleInquiry = require("../models/SaleInquiry");
const SaleReport = require("../models/SaleReport");
const validId = (id) => mongoose.isValidObjectId(id);
const clean = (input) => typeof input === "string" ? input.trim() : "";
const participant = (user) => user && ({ _id: user._id, fullName: user.fullName, isVerified: Boolean(user.isVerified) });


function hasUnreadMessages(thread, viewerId) {
  const own = String(viewerId);
  const seller = String(thread.seller?._id || thread.seller);
  const lastRead = seller === own ? thread.sellerLastReadAt : thread.buyerLastReadAt;
  const readTime = lastRead ? new Date(lastRead).getTime() : 0;
  return (thread.messages || []).some((message) =>
    String(message.sender) !== own && new Date(message.createdAt).getTime() > readTime);
}

const isParticipant = (id) => ({ $or: [{ seller: id }, { buyer: id }] });

async function unreadSummary(req, res) {
  try {
    const threads = await SaleInquiry.find(isParticipant(req.user.id))
      .select("seller buyer sellerLastReadAt buyerLastReadAt messages.sender messages.createdAt").lean();
    return res.json({ unreadConversations: threads.filter((thread) => hasUnreadMessages(thread, req.user.id)).length });
  } catch (error) {
    console.error("Marketplace unread summary:", error);
    return res.status(500).json({ message: "Could not check unread messages." });
  }
}

async function markRead(req, res) {
  try {
    if (!validId(req.params.threadId)) return res.status(404).json({ message: "Conversation not found." });
    const thread = await SaleInquiry.findOne({
      _id: req.params.threadId, ...isParticipant(req.user.id),
    }).select("seller buyer").lean();
    if (!thread) return res.status(404).json({ message: "Conversation not found." });
    const field = String(thread.seller) === String(req.user.id) ? "sellerLastReadAt" : "buyerLastReadAt";
    await SaleInquiry.updateOne(
      { _id: thread._id, ...isParticipant(req.user.id) },
      { $max: { [field]: new Date() } },
      { timestamps: false },
    );
    return res.json({ message: "Conversation marked as read." });
  } catch (error) {
    console.error("Mark marketplace messages read:", error);
    return res.status(500).json({ message: "Could not mark messages as read." });
  }
}

async function inquiries(req, res) {
  try {
    const threads = await SaleInquiry.find({ $or: [{ seller: req.user.id }, { buyer: req.user.id }] })
      .sort({ updatedAt: -1 }).limit(60)
      .populate("listing", "title imageUrl status")
      .populate("seller", "fullName isVerified")
      .populate("buyer", "fullName isVerified").lean();
    res.json({ inquiries: threads.map((thread) => ({
      _id: thread._id,
      listing: thread.listing && { _id: thread.listing._id, title: thread.listing.title, imageUrl: thread.listing.imageUrl, status: thread.listing.status },
      seller: participant(thread.seller), buyer: participant(thread.buyer),
      messages: thread.messages.map(({ _id, sender, text, createdAt }) => ({ _id, sender, text, createdAt })),
      updatedAt: thread.updatedAt,
      unread: hasUnreadMessages(thread, req.user.id),
    })) });
  } catch (error) {
    console.error("Listing inquiries:", error);
    res.status(500).json({ message: "Could not load conversations." });
  }
}
async function contact(req, res) {
  try {
    if (!validId(req.params.id)) return res.status(404).json({ message: "Listing not found." });
    const text = clean(req.body.message);
    if (text.length < 10 || text.length > 1000) return res.status(400).json({ message: "Write between 10 and 1,000 characters." });
    const item = await SaleItem.findOne({ _id: req.params.id, status: "active" }).select("seller").lean();
    if (!item) return res.status(404).json({ message: "Active listing not found." });
    if (String(item.seller) === String(req.user.id)) return res.status(400).json({ message: "You cannot message yourself." });
    const conversation = await SaleInquiry.findOneAndUpdate(
      { listing: item._id, buyer: req.user.id },
      { $setOnInsert: { seller: item.seller }, $push: { messages: { sender: req.user.id, text } } },
      { new: true, upsert: true, runValidators: true },
    );
    res.status(201).json({ message: "Message sent.", threadId: conversation._id });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: "Please retry your message." });
    console.error("Contact seller:", error);
    res.status(500).json({ message: "Could not contact seller." });
  }
}
async function reply(req, res) {
  try {
    if (!validId(req.params.threadId)) return res.status(404).json({ message: "Conversation not found." });
    const text = clean(req.body.message);
    if (!text || text.length > 1000) return res.status(400).json({ message: "Write 1–1,000 characters." });
    const conversation = await SaleInquiry.findOneAndUpdate(
      { _id: req.params.threadId, $or: [{ buyer: req.user.id }, { seller: req.user.id }] },
      { $push: { messages: { sender: req.user.id, text } } },
      { new: true, runValidators: true },
    );
    if (!conversation) return res.status(404).json({ message: "Conversation not found." });
    res.status(201).json({ message: "Reply sent." });
  } catch (error) { console.error("Sale reply:", error); res.status(500).json({ message: "Could not send reply." }); }
}
async function report(req, res) {
  try {
    if (!validId(req.params.id)) return res.status(404).json({ message: "Listing not found." });
    const reason = req.body.reason;
    const details = clean(req.body.details);
    if (!["scam", "prohibited", "misleading", "spam", "other"].includes(reason) || details.length > 500)
      return res.status(400).json({ message: "Choose a valid reason and keep details under 500 characters." });
    const item = await SaleItem.findById(req.params.id).select("seller").lean();
    if (!item) return res.status(404).json({ message: "Listing not found." });
    if (String(item.seller) === String(req.user.id)) return res.status(400).json({ message: "You cannot report your own listing." });
    await SaleReport.create({ listing: item._id, reporter: req.user.id, reason, details });
    res.status(201).json({ message: "Report submitted for review. The listing is not automatically removed." });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: "You have already reported this listing." });
    console.error("Listing report:", error); res.status(500).json({ message: "Could not report listing." });
  }
}
module.exports = { inquiries, unreadSummary, markRead, contact, reply, report };
