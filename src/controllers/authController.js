const User = require("../models/user");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const crypto = require("node:crypto");
const nodemailer = require("nodemailer");

const buildAuthToken = (user) =>
  jwt.sign(
    {
      id: user._id,
      email: user.email,
      role: user.role,
    },
    process.env.JWT_SECRET,
    { expiresIn: "7d" },
  );

const createAccount = async (req, res, role) => {
  try {
    const {
      fullName,
      email,
      password,
      phone,
      category,
      bio,
      skills,
      state,
      city,
      voucherName,
      voucherPhone,
      profilePhoto,
      availability,
      experienceYears,
      price,
      per,
    } = req.body;

    if (!fullName || !email || !password || !phone) {
      return res.status(400).json({ message: "Please fill in all fields" });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanPhone = phone.trim();

    const existingUser = await User.findOne({ email: cleanEmail });
    if (existingUser) {
      return res.status(400).json({
        message: "That email is already in use",
      });
    }

    const existingPhone = await User.findOne({ phone: cleanPhone });
    if (existingPhone) {
      return res.status(400).json({
        message: "That phone number is already in use",
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = await User.create({
      fullName,
      email: cleanEmail,
      password: hashedPassword,
      phone: cleanPhone,
      role,
      category: category || "",
      bio: bio || "",
      skills: skills || [],
      state: state || "",
      city: city || "",
      voucherName: voucherName || "",
      voucherPhone: voucherPhone || "",
      profilePhoto: profilePhoto || "",
      availability: availability || "offline",
      experienceYears: Number(experienceYears) || 0,
      price: price || "",
      per: per || "/job",
    });

    const token = buildAuthToken(newUser);

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
        availability: newUser.availability,
        experienceYears: newUser.experienceYears,
        price: newUser.price,
        per: newUser.per,
        rating: newUser.rating,
        reviewCount: newUser.reviewCount,
        jobs: newUser.jobs,
        createdAt: newUser.createdAt,
      },
    });
  } catch (error) {
    if (error?.code === 11000) {
      if (error.keyPattern?.email) {
        return res.status(400).json({
          message: "That email is already in use",
        });
      }

      if (error.keyPattern?.phone) {
        return res.status(400).json({
          message: "That phone number is already in use",
        });
      }
    }

    res.status(500).json({ message: "Server error" });
  }
};

// ─── CUSTOMER REGISTER ───
// The public register endpoint never accepts a role from the browser.
const register = async (req, res) => createAccount(req, res, "customer");

// ─── PROVIDER REGISTER ───

// The server assigns the provider role; the browser cannot choose it.

const registerProvider = async (req, res) => {
  return createAccount(req, res, "provider");
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
    const query = cleanIdentifier.includes("@")
      ? { email: cleanIdentifier.toLowerCase() }
      : { phone: cleanIdentifier };

    const user = await User.findOne(query);

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

    const token = buildAuthToken(user);

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
    res.status(500).json({ message: "Server error" });
  }
};

// ─── FORGOT PASSWORD ───
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Please provide your email" });
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: cleanEmail });

    if (!user) {
      return res.status(200).json({
        message: "If that email exists we have sent a reset link.",
      });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenHash = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");
    const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000);

    await User.findByIdAndUpdate(user._id, {
      resetToken: resetTokenHash,
      resetTokenExpiry,
    });

    const frontendUrl = process.env.FRONTEND_URL.replace(/\/$/, "");
    const resetLink = `${frontendUrl}/reset-password.html?token=${resetToken}&email=${encodeURIComponent(cleanEmail)}`;

    await transporter.sendMail({
      from: `"VerifiedNG" <${process.env.EMAIL_USER}>`,
      to: cleanEmail,
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
    res.status(500).json({ message: "Server error" });
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

    const tokenHash = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    const user = await User.findOne({
      email: decodeURIComponent(email).trim().toLowerCase(),
      resetToken: tokenHash,
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
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  register,
  registerProvider,
  login,
  forgotPassword,
  resetPassword,
};
