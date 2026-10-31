const mongoose = require("mongoose");

const schema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, minlength: 3, maxlength: 80 },
  description: { type: String, trim: true, maxlength: 750, default: "" },
  category: { type: String, enum: ["General", "Neighbourhood", "Business", "Learning", "Family", "Sports", "Interests"], default: "General" },
  city: { type: String, trim: true, maxlength: 80, default: "" },
  state: { type: String, trim: true, maxlength: 80, default: "" },
  creator: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  isActive: { type: Boolean, default: true, index: true },
}, { timestamps: true });

schema.index({ isActive: 1, createdAt: -1 });
schema.index({ name: "text", description: "text" });

module.exports = mongoose.model("NeighbourhoodGroup", schema);
