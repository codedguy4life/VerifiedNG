const mongoose = require("mongoose");

const commentSchema = new mongoose.Schema({
  author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  text: { type: String, required: true, trim: true, maxlength: 1000 },
  createdAt: { type: Date, default: Date.now },
});

const reportSchema = new mongoose.Schema({
  reporter: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  reason: { type: String, required: true, enum: ["spam", "harassment", "scam", "misinformation", "other"] },
  details: { type: String, trim: true, maxlength: 500, default: "" },
  createdAt: { type: Date, default: Date.now },
});

const communityPostSchema = new mongoose.Schema({
  author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  text: { type: String, required: true, trim: true, maxlength: 2000 },
  category: {
    type: String,
    enum: ["General", "Question", "Opportunity", "Recommendation", "Service Request", "Safety Alert"],
    default: "General",
  },
  audience: { type: String, enum: ["local", "national"], default: "national", index: true },
  location: {
    state: { type: String, trim: true, default: "" },
    city: { type: String, trim: true, default: "" },
  },
  reactions: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  comments: { type: [commentSchema], default: [] },
  reports: { type: [reportSchema], default: [] },
  isHidden: { type: Boolean, default: false, index: true },
}, { timestamps: true });

communityPostSchema.index({ createdAt: -1 });
communityPostSchema.index({ "location.state": 1, "location.city": 1, createdAt: -1 });

module.exports = mongoose.model("CommunityPost", communityPostSchema);
