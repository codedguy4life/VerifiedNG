const mongoose = require("mongoose");
const message = new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  text: { type: String, required: true, trim: true, maxlength: 1000 },
  createdAt: { type: Date, default: Date.now }
});
const schema = new mongoose.Schema({
  listing: { type: mongoose.Schema.Types.ObjectId, ref: "SaleItem", required: true },
  seller: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  buyer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  messages: { type: [message], default: [] }
}, { timestamps: true });
schema.index({ listing: 1, buyer: 1 }, { unique: true });
schema.index({ seller: 1, updatedAt: -1 });
schema.index({ buyer: 1, updatedAt: -1 });
module.exports = mongoose.model("SaleInquiry", schema);
