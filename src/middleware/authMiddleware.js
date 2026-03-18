const jwt = require("jsonwebtoken");

const protect = (req, res, next) => {
  try {
    // 1. Check if token was sent
    const token = req.headers.authorization;

    if (!token) {
      return res.status(401).json({
        message: "No token — please login first",
      });
    }

    // 2. Verify the token is real
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 3. Attach user info to the request
    req.user = decoded;

    // 4. Move on to the actual route
    next();
  } catch (error) {
    res.status(401).json({
      message: "Invalid token — please login again",
    });
  }
};

module.exports = { protect };
