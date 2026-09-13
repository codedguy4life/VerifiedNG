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
    const {
      fullName,
      phone,
      state,
      city,
      bio,
      profilePhoto,
      category,
      skills,
      availability,
      experienceYears,
      price,
      per,
    } = req.body;

    const updateData = {
      fullName,
      phone,
      state,
      city,
      bio,
    };

    if (profilePhoto) {
      updateData.profilePhoto = profilePhoto;
    }

    if (category !== undefined) updateData.category = category;
    if (skills !== undefined) updateData.skills = skills;
    if (availability !== undefined) updateData.availability = availability;
    if (experienceYears !== undefined) {
      updateData.experienceYears = Number(experienceYears) || 0;
    }
    if (price !== undefined) updateData.price = price;
    if (per !== undefined) updateData.per = per;

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
