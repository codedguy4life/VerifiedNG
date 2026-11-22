const mongoose = require("mongoose");

const contactMessageSchema = new mongoose.Schema({
  name: { type: String, trim: true, required: true, maxlength: 100 },
  email: { type: String, trim: true, lowercase: true, required: true, maxlength: 200 },
  topic: { type: String, required: true, enum: ["General enquiry", "Account or login", "Provider application", "Safety or report", "Privacy or data", "Other"] },
  message: { type: String, trim: true, required: true, maxlength: 2000 },
  status: { type: String, enum: ["new", "handled"], default: "new", index: true },
  handledAt: { type: Date, default: null },
  handledBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
}, { timestamps: true });

module.exports = mongoose.model("ContactMessage", contactMessageSchema);
