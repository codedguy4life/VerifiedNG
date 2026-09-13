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
      unique: true,
      trim: true,
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

    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },

    reviewCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    jobs: {
      type: Number,
      default: 0,
      min: 0,
    },

    availability: {
      type: String,
      enum: ["available", "weekend", "24hr", "offline"],
      default: "offline",
    },

    experienceYears: {
      type: Number,
      default: 0,
      min: 0,
    },

    price: {
      type: String,
      default: "",
    },

    per: {
      type: String,
      default: "/job",
    },

    voucherName: {
      type: String,
      default: "",
    },

    voucherPhone: {
      type: String,
      default: "",
    },

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
