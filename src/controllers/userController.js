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
    res.status(500).json({ message: "Server error", error: error.message });
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

      // Provider information
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

    // Update photo only if one was actually sent
    if (profilePhoto) {
      updateData.profilePhoto = profilePhoto;
    }

    // Provider information
    if (category !== undefined) {
      updateData.category = category;
    }

    if (skills !== undefined) {
      updateData.skills = skills;
    }

    if (availability !== undefined) {
      updateData.availability = availability;
    }

    if (experienceYears !== undefined) {
      updateData.experienceYears = Number(experienceYears) || 0;
    }

    if (price !== undefined) {
      updateData.price = price;
    }

    if (per !== undefined) {
      updateData.per = per;
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
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

// ─── UPGRADE TO PROVIDER ───
const upgradeToProvider = async (req, res) => {
  try {
    const {
      category,
      bio,
      skills,
      voucherName,
      voucherPhone,

      // Provider information
      availability,
      experienceYears,
      price,
      per,
    } = req.body;

    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      {
        role: "provider",
        category: category || "",
        bio: bio || "",
        skills: skills || [],
        voucherName: voucherName || "",
        voucherPhone: voucherPhone || "",

        availability: availability || "offline",
        experienceYears: Number(experienceYears) || 0,
        price: price || "",
        per: per || "/job",
      },
      {
        new: true,
        runValidators: true,
      },
    ).select("-password -loginHistory -resetToken -resetTokenExpiry");

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({
      message: "Upgraded to provider successfully!",
      user: updatedUser,
    });
  } catch (error) {
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
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
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

module.exports = {
  getProfile,
  updateProfile,
  upgradeToProvider,
  deleteAccount,
};
