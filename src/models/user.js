const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    password: {
      type: String,
      required: true,
      minlength: 6,
    },

    phone: {
      type: String,
      required: true,
    },

    profilePhoto: {
      type: String,
      default: "",
    },

    role: {
      type: String,
      enum: ["customer", "provider"],
      default: "customer",
    },

    isVerified: {
      type: Boolean,
      default: false,
    },

    // ==========================================
    // PROVIDER SPECIFIC FIELDS
    // ==========================================

    category: {
      type: String,
      default: "",
    },

    bio: {
      type: String,
      default: "",
    },

    skills: {
      type: [String],
      default: [],
    },

    state: {
      type: String,
      default: "",
    },

    city: {
      type: String,
      default: "",
    },

    // ==========================================
    // PROVIDER SEARCH / PROFILE INFORMATION
    // ==========================================

    // Average provider rating.
    // This will later be calculated from actual reviews.
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },

    // Number of reviews the provider has received.
    reviewCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Number of completed jobs.
    // We start at 0 and will increase this when jobs are completed.
    jobs: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Provider availability.
    // These values match the search filter we created.
    availability: {
      type: String,
      enum: ["available", "weekend", "24hr", "offline"],
      default: "offline",
    },

    // Number of years the provider has been doing the work.
    experienceYears: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Provider's starting price.
    // Example: "₦15,000"
    price: {
      type: String,
      default: "",
    },

    // What the price is charged per.
    // Example: "/job", "/hour", "/day"
    per: {
      type: String,
      default: "/job",
    },

    // ==========================================
    // VOUCHER / EMERGENCY CONTACT INFORMATION
    // ==========================================

    voucherName: {
      type: String,
      default: "",
    },

    voucherPhone: {
      type: String,
      default: "",
    },

    // ==========================================
    // LOGIN INFORMATION
    // ==========================================

    loginCount: {
      type: Number,
      default: 0,
    },

    lastLogin: {
      type: Date,
      default: null,
    },

    loginHistory: {
      type: [Date],
      default: [],
    },

    // ==========================================
    // PASSWORD RESET INFORMATION
    // ==========================================

    resetToken: {
      type: String,
      default: null,
    },

    resetTokenExpiry: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

const User = mongoose.model("User", userSchema);

module.exports = User;
