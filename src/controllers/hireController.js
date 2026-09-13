const mongoose = require("mongoose");
const HireRequest = require("../models/HireRequest");
const User = require("../models/user");

const createHireRequest = async (req, res) => {
  try {
    const { providerId, serviceNeeded, description } = req.body;

    if (!providerId || !serviceNeeded || !description) {
      return res.status(400).json({ message: "Please fill in all fields" });
    }

    if (!mongoose.Types.ObjectId.isValid(providerId)) {
      return res.status(404).json({ message: "Provider not found" });
    }

    if (description.length < 20) {
      return res
        .status(400)
        .json({ message: "Please give more detail — at least 20 characters" });
    }

    const [customer, provider] = await Promise.all([
      User.findById(req.user.id).select("fullName phone role"),
      User.findOne({ _id: providerId, role: "provider" }).select("fullName"),
    ]);

    if (!customer) {
      return res.status(401).json({ message: "User not found" });
    }

    if (!provider) {
      return res.status(404).json({ message: "Provider not found" });
    }

    const hireRequest = await HireRequest.create({
      providerName: provider.fullName,
      providerId: provider._id.toString(),
      customerId: customer._id.toString(),
      customerName: customer.fullName,
      customerPhone: customer.phone,
      serviceNeeded,
      description,
    });

    res.status(201).json({
      message: "Hire request sent successfully!",
      request: hireRequest,
    });
  } catch (error) {
    if (error?.name === "CastError") {
      return res.status(404).json({ message: "Provider not found" });
    }

    res.status(500).json({ message: "Server error" });
  }
};

const getRequestsForProvider = async (req, res) => {
  try {
    if (req.user.id !== req.params.providerId) {
      return res.status(403).json({
        message: "You are not allowed to view these requests",
      });
    }

    const requests = await HireRequest.find({
      providerId: req.user.id,
    }).sort({ createdAt: -1 });

    res.status(200).json({ requests });
  } catch (error) {
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

module.exports = { createHireRequest, getRequestsForProvider };
