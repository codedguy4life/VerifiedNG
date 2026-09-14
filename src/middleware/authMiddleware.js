const jwt = require("jsonwebtoken");
const User = require("../models/user");

const protect = (req, res, next) => {
  try {
    let token = req.headers.authorization;

    if (!token) {
      return res.status(401).json({
        message: "No token — please login first",
      });
    }

    if (token.startsWith("Bearer ")) {
      token = token.slice(7);
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({
      message: "Invalid token — please login again",
    });
  }
};

const requireRole = (role) => async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select("role");

    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    if (user.role !== role) {
      return res.status(403).json({
        message: "You are not allowed to perform this action",
      });
    }

    req.user.role = user.role;
    next();
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = { protect, requireRole };
