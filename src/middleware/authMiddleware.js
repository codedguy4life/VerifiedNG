const jwt = require("jsonwebtoken");
const User = require("../models/user");

// A valid JWT proves who signed in previously, but it must not keep working
// after that account has been deleted. Resolve the account on each protected
// request and use its current role instead of trusting stale token claims.
const protect = async (req, res, next) => {
  let decoded;

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

    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return res.status(401).json({
      message: "Invalid token — please login again",
    });
  }

  try {
    const user = await User.findById(decoded.id).select("role tokenVersion");

    if (!user) {
      return res.status(401).json({
        message: "User not found. Please login again.",
      });
    }

    // Tokens issued before a password reset must not authorize new requests.
    // Treat older JWTs without tokenVersion as version 0 for compatibility.
    if ((decoded.tokenVersion || 0) !== (user.tokenVersion || 0)) {
      return res.status(401).json({
        message: "Your session has expired. Please log in again.",
      });
    }

    req.user = { ...decoded, role: user.role };
    req.authUser = user;
    return next();
  } catch (error) {
    if (error?.name === "CastError") {
      return res.status(401).json({
        message: "Invalid token — please login again",
      });
    }

    return res.status(500).json({ message: "Server error" });
  }
};

const requireRole = (role) => async (req, res, next) => {
  try {
    // protect() has already loaded the current account and role. Keep the
    // fallback so requireRole also remains safe if reused independently.
    const user =
      req.authUser || (await User.findById(req.user.id).select("role"));

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
