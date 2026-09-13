const User = require("../models/user");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const nodemailer = require("nodemailer");

// ─── REGISTER ───
const register = async (req, res) => {
  try {
    const {
      fullName,
      email,
      password,
      phone,
      role,
      category,
      bio,
      skills,
      state,
      city,
      voucherName,
      voucherPhone,
      profilePhoto,

      // Provider information
      availability,
      experienceYears,
      price,
      per,
    } = req.body;

    if (!fullName || !email || !password || !phone) {
      return res.status(400).json({ message: "Please fill in all fields" });
    }

    const existingUser = await User.findOne({
      email: email.trim().toLowerCase(),
    });

    if (existingUser) {
      return res.status(400).json({
        message: "That email is already in use",
      });
    }

    const existingPhone = await User.findOne({
      phone: phone.trim(),
    });

    if (existingPhone) {
      return res.status(400).json({
        message: "That phone number is already in use",
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = await User.create({
      fullName,
      email: email.trim().toLowerCase(),
      password: hashedPassword,
      phone: phone.trim(),
      role: role || "customer",
      category: category || "",
      bio: bio || "",
      skills: skills || [],
      state: state || "",
      city: city || "",
      voucherName: voucherName || "",
      voucherPhone: voucherPhone || "",
      profilePhoto: profilePhoto || "",

      // Provider information
      availability: availability || "offline",
      experienceYears: Number(experienceYears) || 0,
      price: price || "",
      per: per || "/job",
    });

    const token = jwt.sign(
      { id: newUser._id, email: newUser.email, role: newUser.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" },
    );

    res.status(201).json({
      message: "Account created successfully!",
      token,
      user: {
        id: newUser._id,
        fullName: newUser.fullName,
        email: newUser.email,
        role: newUser.role,
        profilePhoto: newUser.profilePhoto,
        category: newUser.category,
        phone: newUser.phone,
        state: newUser.state,
        city: newUser.city,

        // Provider information
        availability: newUser.availability,
        experienceYears: newUser.experienceYears,
        price: newUser.price,
        per: newUser.per,

        // System-managed information
        rating: newUser.rating,
        reviewCount: newUser.reviewCount,
        jobs: newUser.jobs,

        createdAt: newUser.createdAt,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ─── LOGIN ───
const login = async (req, res) => {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({
        message: "Please provide email/phone and password",
      });
    }

    const cleanIdentifier = identifier.trim();

    // Check whether the identifier is an email or phone number
    const query = cleanIdentifier.includes("@")
      ? { email: cleanIdentifier.toLowerCase() }
      : { phone: cleanIdentifier };

    const user = await User.findOne(query);

    // Keep the same message for both cases:
    // account not found OR wrong password
    if (!user) {
      return res.status(400).json({
        message: "Invalid email/phone or password",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({
        message: "Invalid email/phone or password",
      });
    }

    const now = new Date();

    await User.findByIdAndUpdate(user._id, {
      $inc: { loginCount: 1 },

      lastLogin: now,

      $push: {
        loginHistory: {
          $each: [now],
          $slice: -10,
        },
      },
    });

    const token = jwt.sign(
      {
        id: user._id,
        email: user.email,
        role: user.role,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "7d",
      },
    );

    res.status(200).json({
      message: "Login successful!",

      token,

      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        category: user.category,
        bio: user.bio,
        state: user.state,
        city: user.city,
        phone: user.phone,
        profilePhoto: user.profilePhoto,

        rating: user.rating || 0,
        reviewCount: user.reviewCount || 0,
        jobs: user.jobs || 0,

        loginCount: (user.loginCount || 0) + 1,
        lastLogin: now,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error("Login error:", error);

    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

// ─── FORGOT PASSWORD ───
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Please provide your email" });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(200).json({
        message: "If that email exists we have sent a reset link.",
      });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000);

    await User.findByIdAndUpdate(user._id, {
      resetToken,
      resetTokenExpiry,
    });

    const resetLink = `https://codedguy4life.github.io/VerifiedNG/reset-password.html?token=${resetToken}&email=${encodeURIComponent(email)}`;

    await transporter.sendMail({
      from: `"VerifiedNG" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Reset Your VerifiedNG Password",
      html: `
        <div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;padding:20px;">
          <h2 style="color:#1a1a2e;">Reset Your VerifiedNG Password</h2>
          <p>You requested a password reset. Click the button below — expires in 1 hour.</p>
          <a href="${resetLink}" style="display:inline-block;background:#1a1a2e;color:white;
            padding:14px 28px;border-radius:8px;text-decoration:none;margin:20px 0;font-weight:600;">
            Reset My Password
          </a>
          <p style="color:#888;font-size:0.85rem;">If you did not request this, ignore this email.</p>
        </div>
      `,
    });

    res.status(200).json({
      message: "If that email exists we have sent a reset link.",
    });
  } catch (error) {
    console.log("Forgot password error:", error.message);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// ─── RESET PASSWORD ───
const resetPassword = async (req, res) => {
  try {
    const { email, token, newPassword } = req.body;

    if (!email || !token || !newPassword) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        message: "Password must be at least 8 characters",
      });
    }

    const user = await User.findOne({
      email: decodeURIComponent(email),
      resetToken: token,
      resetTokenExpiry: { $gt: new Date() },
    });

    if (!user) {
      return res.status(400).json({
        message:
          "Reset link is invalid or has expired. Please request a new one.",
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await User.findByIdAndUpdate(user._id, {
      password: hashedPassword,
      resetToken: null,
      resetTokenExpiry: null,
    });

    res.status(200).json({
      message: "Password reset successfully! You can now log in.",
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

module.exports = { register, login, forgotPassword, resetPassword };
