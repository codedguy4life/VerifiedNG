const mongoose = require("mongoose");

const providerApplicationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true, index: true },
  category: { type: String, required: true, trim: true, maxlength: 80 },
  bio: { type: String, required: true, trim: true, maxlength: 1000 },
  skills: { type: [String], default: [] },
  experienceYears: { type: Number, default: 0, min: 0, max: 60 },
  state: { type: String, required: true, trim: true, maxlength: 80 },
  city: { type: String, required: true, trim: true, maxlength: 80 },
  status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending", index: true },
  reviewer: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  reviewerNote: { type: String, trim: true, maxlength: 500, default: "" },
  reviewedAt: { type: Date, default: null },
}, { timestamps: true });

module.exports = mongoose.model("ProviderApplication", providerApplicationSchema);
