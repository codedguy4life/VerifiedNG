const mongoose = require("mongoose");

const hireRequestSchema = new mongoose.Schema(
  {
    providerName: { type: String, required: true },
    providerId: { type: String, required: true },
    customerId: { type: String, required: true },
    customerName: { type: String, required: true },
    customerPhone: { type: String, required: true },
    serviceNeeded: { type: String, required: true },
    description: { type: String, required: true },
    status: {
      type: String,
      enum: ["pending", "accepted", "declined", "completed"],
      default: "pending",
    },
  },
  { timestamps: true },
);

const HireRequest = mongoose.model("HireRequest", hireRequestSchema);
module.exports = HireRequest;
