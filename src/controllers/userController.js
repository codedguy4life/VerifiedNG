// Protected route — only logged in users can access
const getProfile = (req, res) => {
  res.status(200).json({
    message: "You are logged in!",
    user: req.user, // this came from the middleware
  });
};

module.exports = { getProfile };
