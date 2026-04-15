const jwt = require("jsonwebtoken");
const { getUserByEmail } = require("../store");

function requireAuth(req, res, next) {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) {
    return res.status(401).json({ error: "Missing auth token" });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = getUserByEmail(payload.email);
    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }
    req.user = user;
    return next();
  } catch (error) {
    return res.status(401).json({ error: "Invalid auth token" });
  }
}

function requireAdmin(req, res, next) {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) {
    return res.status(401).json({ error: "Missing auth token" });
  }
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (payload.role !== "admin") {
      return res.status(403).json({ error: "Admin access required" });
    }
    req.admin = payload;
    return next();
  } catch (error) {
    return res.status(401).json({ error: "Invalid auth token" });
  }
}

module.exports = {
  requireAuth,
  requireAdmin,
};
