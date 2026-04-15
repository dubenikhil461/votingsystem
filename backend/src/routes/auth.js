const express = require("express");
const jwt = require("jsonwebtoken");
const { sendOtpEmail } = require("../services/mailService");
const { getUserByEmail, upsertUser } = require("../store");

const router = express.Router();

function makeOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

router.post("/request-otp", async (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();
  if (!email) {
    return res.status(400).json({ error: "Email is required" });
  }
  const otp = makeOtp();
  const otpExpiresAt = Date.now() + 5 * 60 * 1000;
  upsertUser(email, { otp, otpExpiresAt, verified: false });
  await sendOtpEmail(email, otp);
  return res.json({ message: "OTP sent", devOtp: process.env.NODE_ENV === "development" ? otp : undefined });
});

router.post("/verify-otp", (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();
  const otp = String(req.body.otp || "").trim();
  const user = getUserByEmail(email);
  if (!user) {
    return res.status(404).json({ error: "User not found. Request OTP first." });
  }
  if (!user.otp || user.otp !== otp || (user.otpExpiresAt || 0) < Date.now()) {
    return res.status(400).json({ error: "Invalid or expired OTP" });
  }

  const updated = upsertUser(email, { verified: true, otp: null, otpExpiresAt: null });
  const token = jwt.sign({ email: updated.email, role: "user" }, process.env.JWT_SECRET, { expiresIn: "4h" });
  return res.json({ message: "Verification successful", token });
});

router.post("/admin/login", (req, res) => {
  const { username, password } = req.body;
  if (username !== process.env.ADMIN_USERNAME || password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: "Invalid admin credentials" });
  }
  const token = jwt.sign({ role: "admin", username }, process.env.JWT_SECRET, { expiresIn: "6h" });
  return res.json({ token });
});

module.exports = router;
