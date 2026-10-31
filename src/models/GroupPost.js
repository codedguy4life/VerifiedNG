const mongoose = require("mongoose");
const comment = new mongoose.Schema({
  author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  text: { type: String, required: true, trim: true, maxlength: 1000 },
  createdAt: { type: Date, default: Date.now },
});
const report = new mongoose.Schema({
  reporter: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  reason: { type: String, enum: ["spam", "harassment", "scam", "misinformation", "other"], required: true },
  details: { type: String, trim: true, maxlength: 500, default: "" },
  createdAt: { type: Date, default: Date.now },
});
const schema = new mongoose.Schema({
  group: { type: mongoose.Schema.Types.ObjectId, ref: "NeighbourhoodGroup", required: true, index: true },
  author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  text: { type: String, required: true, trim: true, minlength: 1, maxlength: 2000 },
  category: { type: String, default: "Group discussion" },
  reactions: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  comments: { type: [comment], default: [] },
  reports: { type: [report], default: [] },
  isHidden: { type: Boolean, default: false, index: true },
}, { timestamps: true });
schema.index({ group: 1, isHidden: 1, createdAt: -1 });
module.exports = mongoose.model("GroupPost", schema);
