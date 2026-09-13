const User = require("../models/user");

const publicProviderFields =
  "_id fullName category rating reviewCount jobs experienceYears city state availability skills bio price per isVerified createdAt";

const escapeRegex = (value) =>
  String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const getProviders = async (req, res) => {
  try {
    const { category, state, search } = req.query;

    let query = { role: "provider" };

    if (category) {
      query.category = { $regex: escapeRegex(category), $options: "i" };
    }

    if (state) {
      query.state = { $regex: escapeRegex(state), $options: "i" };
    }

    if (search) {
      const safeSearch = escapeRegex(search);
      query.$or = [
        { fullName: { $regex: safeSearch, $options: "i" } },
        { category: { $regex: safeSearch, $options: "i" } },
        { bio: { $regex: safeSearch, $options: "i" } },
        { skills: { $regex: safeSearch, $options: "i" } },
      ];
    }

    const providers = await User.find(query)
      .select(publicProviderFields)
      .sort({ createdAt: -1 });

    res.status(200).json({ providers });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const getProviderById = async (req, res) => {
  try {
    const provider = await User.findById(req.params.id).select(
      publicProviderFields,
    );

    if (!provider || provider.role !== "provider") {
      return res.status(404).json({ message: "Provider not found" });
    }

    res.status(200).json({ provider });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const getCategoryCounts = async (req, res) => {
  try {
    const counts = await User.aggregate([
      { $match: { role: "provider" } },
      { $group: { _id: "$category", count: { $sum: 1 } } },
    ]);

    const result = {};
    counts.forEach((c) => {
      if (c._id) result[c._id] = c.count;
    });

    res.status(200).json({ counts: result });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

module.exports = { getProviders, getProviderById, getCategoryCounts };
