const mongoose = require("mongoose");

const schema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", unique: true, required: true, index: true },
  note: { type: String, trim: true, maxlength: 700, required: true },
  status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending", index: true },
  reviewer: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  reviewedAt: { type: Date, default: null },
  reviewerNote: { type: String, trim: true, maxlength: 500, default: "" },
}, { timestamps: true });

module.exports = mongoose.model("VerificationRequest", schema);
