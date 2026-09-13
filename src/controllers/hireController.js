const HireRequest = require("../models/HireRequest");

const createHireRequest = async (req, res) => {
  try {
    const {
      providerName,
      providerId,
      customerName,
      customerPhone,
      serviceNeeded,
      description,
    } = req.body;

    if (
      !providerName ||
      !providerId ||
      !customerName ||
      !customerPhone ||
      !serviceNeeded ||
      !description
    ) {
      return res.status(400).json({ message: "Please fill in all fields" });
    }

    if (description.length < 20) {
      return res
        .status(400)
        .json({ message: "Please give more detail — at least 20 characters" });
    }

    const hireRequest = await HireRequest.create({
      providerName,
      providerId,
      customerName,
      customerPhone,
      serviceNeeded,
      description,
    });

    res.status(201).json({
      message: "Hire request sent successfully!",
      request: hireRequest,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const getRequestsForProvider = async (req, res) => {
  try {
    // The provider ID from the URL must match
    // the ID of the logged-in user.
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
