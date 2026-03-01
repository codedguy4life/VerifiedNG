const User = require("../models/user.js");

// REGISTER — creates a new user
const register = async (req, res) => {
  try {
    // 1. Get data from the request body
    const { fullName, email, password, phone, role } = req.body;

    // 2. Check all fields are provided
    if (!fullName || !email || !password || !phone) {
      return res.status(400).json({
        message: "Please fill in all fields, all fields are required",
      });
    }

    // 3. Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        message: "Email already registered",
      });
    }

    // 4. Create the new user — password as plain text for now
    const newUser = await User.create({
      fullName,
      email,
      password, // plain text for now — we add encryption later
      phone,
      role: role || "customer",
    });

    // 5. Send back success response
    res.status(201).json({
      message: "Account created successfully!",
      user: {
        id: newUser._id,
        fullName: newUser.fullName,
        email: newUser.email,
        password: newUser.password, // showing it so you can see it works
        role: newUser.role,
      },
    });
  } catch (error) {
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

module.exports = { register };
