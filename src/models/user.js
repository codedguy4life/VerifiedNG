const mongoose = require("mongoose");

// This is the "form template" for every user
const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String, // must be text
      required: true, // can't be empty
      trim: true, // removes accidental spaces
    },

    email: {
      type: String,
      required: true,
      unique: true, // no two users same email
      lowercase: true, // saves as lowercase always
      trim: true,
    },

    password: {
      type: String,
      required: true,
      minlength: 6, // minimum 6 characters
    },

    phone: {
      type: String,
      required: true,
    },

    role: {
      type: String,
      enum: ["customer", "provider"], // ONLY these two values allowed
      default: "customer", // if not specified, assume customer
    },

    isVerified: {
      type: Boolean,
      default: false, // new users start unverified
    },
  },
  {
    timestamps: true, // automatically adds createdAt and updatedAt
  },
);

// Export so other files can use it
const User = mongoose.model("User", userSchema);
module.exports = User;
