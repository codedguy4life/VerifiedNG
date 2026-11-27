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
    // Notifications are derived from the request itself, so no event is lost
    // if a separate notification write fails after a hire decision.
    providerNotificationReadAt: { type: Date, default: null },
    customerResponseReadAt: { type: Date, default: null },
  },
  { timestamps: true },
);

hireRequestSchema.index({ providerId: 1, createdAt: -1 });
hireRequestSchema.index({ customerId: 1, updatedAt: -1 });

const HireRequest = mongoose.model("HireRequest", hireRequestSchema);
module.exports = HireRequest;
