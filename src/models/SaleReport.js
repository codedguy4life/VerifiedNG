const mongoose = require("mongoose");
const schema = new mongoose.Schema({
  listing: { type: mongoose.Schema.Types.ObjectId, ref: "SaleItem", required: true },
  reporter: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  reason: { type: String, enum: ["scam", "prohibited", "misleading", "spam", "other"], required: true },
  details: { type: String, trim: true, maxlength: 500, default: "" }
}, { timestamps: true });
schema.index({ listing: 1, reporter: 1 }, { unique: true });
module.exports = mongoose.model("SaleReport", schema);
