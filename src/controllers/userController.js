const bcrypt = require("bcryptjs");
const User = require("../models/user");

// ─── GET PROFILE ───
const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select(
      "-password -loginHistory -resetToken -resetTokenExpiry",
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({ user });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// ─── UPDATE PROFILE ───
const updateProfile = async (req, res) => {
  try {
    const body = req.body || {};
    const updateData = {};
    const stringFields = [
      "fullName",
      "phone",
      "state",
      "city",
      "bio",
      "profilePhoto",
      "category",
      "availability",
      "price",
      "per",
    ];

    for (const field of stringFields) {
      if (body[field] === undefined) continue;
      if (typeof body[field] !== "string") {
        return res.status(400).json({
          message: `${field} must be text`,
        });
      }
      const value = body[field].trim();
      if (["fullName", "phone"].includes(field) && !value) {
        return res.status(400).json({
          message: `${field === "fullName" ? "Full name" : "Phone number"} cannot be empty`,
        });
      }
      if (field === "fullName" && value.length > 100) {
        return res.status(400).json({ message: "Full name must be 100 characters or fewer" });
      }
      if (field === "phone" && value.length > 30) {
        return res.status(400).json({ message: "Phone number is too long" });
      }
      if (field === "bio" && value.length > 1000) {
        return res.status(400).json({ message: "Bio must be 1000 characters or fewer" });
      }
      updateData[field] = value;
    }

    if (body.skills !== undefined) {
      if (
        !Array.isArray(body.skills) ||
        body.skills.length > 30 ||
        body.skills.some((skill) => typeof skill !== "string" || skill.trim().length > 80)
      ) {
        return res.status(400).json({
          message: "Skills must be a list of up to 30 text items (80 characters each)",
        });
      }
      updateData.skills = body.skills.map((skill) => skill.trim()).filter(Boolean);
    }

    if (body.experienceYears !== undefined) {
      const years = Number(body.experienceYears);
      if (!Number.isFinite(years) || years < 0 || years > 80) {
        return res.status(400).json({
          message: "Experience years must be a number between 0 and 80",
        });
      }
      updateData.experienceYears = years;
    }

    if (body.availability !== undefined) {
      const allowedAvailability = ["available", "weekend", "24hr", "offline"];
      if (!allowedAvailability.includes(updateData.availability)) {
        return res.status(400).json({
          message: "Please choose a valid availability option",
        });
      }
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        message: "No supported profile fields were provided",
      });
    }

    const updatedUser = await User.findByIdAndUpdate(req.user.id, updateData, {
      new: true,
      runValidators: true,
    }).select("-password -loginHistory -resetToken -resetTokenExpiry");

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({
      message: "Profile updated successfully!",
      user: updatedUser,
    });
  } catch (error) {
    if (error?.code === 11000 && error.keyPattern?.phone) {
      return res.status(400).json({
        message: "That phone number is already in use",
      });
    }

    if (error?.name === "ValidationError" || error?.name === "CastError") {
      return res.status(400).json({
        message: "Some profile details are invalid. Please check your entries.",
      });
    }

    res.status(500).json({ message: "Server error" });
  }
};

// Provider promotion is intentionally not self-service.
// A future server-side verification/admin workflow must establish this role.
const upgradeToProvider = async (req, res) => {
  res.status(403).json({
    message: "Provider accounts require server-side verification",
  });
};

// ─── DELETE ACCOUNT ───
const deleteAccount = async (req, res) => {
  try {
    const { password } = req.body;

    if (!password) {
      return res
        .status(400)
        .json({ message: "Please enter your password to confirm deletion" });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res
        .status(400)
        .json({ message: "Incorrect password. Account not deleted." });
    }

    await User.findByIdAndDelete(req.user.id);

    res.status(200).json({ message: "Account deleted successfully." });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  getProfile,
  updateProfile,
  upgradeToProvider,
  deleteAccount,
};
