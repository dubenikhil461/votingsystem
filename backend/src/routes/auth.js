const express = require("express");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { sendOtpEmail } = require("../services/mailService");
const { store, getUserByEmail, upsertUser } = require("../store");

const router = express.Router();

function makeOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function makeVoterId() {
  return `VOTER-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
}

function hashIdentity(aadhaarNumber) {
  const salt = process.env.IDENTITY_SALT || "quickvote-dev-salt";
  return crypto.createHash("sha256").update(`${salt}:${aadhaarNumber}`).digest("hex");
}

router.post("/request-otp", async (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();
  const aadhaarNumber = String(req.body.aadhaarNumber || "").replace(/\s+/g, "");
  if (!email || !aadhaarNumber) {
    return res.status(400).json({ error: "Email and Aadhaar number are required" });
  }
  if (!/^\d{12}$/.test(aadhaarNumber)) {
    return res.status(400).json({ error: "Aadhaar number must be 12 digits" });
  }

  const identityHash = hashIdentity(aadhaarNumber);
  const linkedEmail = store.usersByIdentityHash.get(identityHash);
  if (linkedEmail && linkedEmail !== email) {
    return res.status(409).json({ error: "Aadhaar is already linked to another voter profile" });
  }

  const existing = getUserByEmail(email);
  if (existing?.identityHash && existing.identityHash !== identityHash) {
    return res.status(409).json({ error: "This email is already registered with a different Aadhaar" });
  }

  const otp = makeOtp();
  const otpExpiresAt = Date.now() + 5 * 60 * 1000;
  upsertUser(email, {
    otp,
    otpExpiresAt,
    verified: false,
    identityHash,
    aadhaarLast4: aadhaarNumber.slice(-4),
    voterId: existing?.voterId || makeVoterId(),
  });
  await sendOtpEmail(email, otp);
  return res.json({ message: "OTP sent", devOtp: process.env.NODE_ENV === "development" ? otp : undefined });
});

router.post("/verify-otp", (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();
  const otp = String(req.body.otp || "").trim();
  const aadhaarNumber = String(req.body.aadhaarNumber || "").replace(/\s+/g, "");
  if (!aadhaarNumber || !/^\d{12}$/.test(aadhaarNumber)) {
    return res.status(400).json({ error: "Valid Aadhaar number is required" });
  }
  const user = getUserByEmail(email);
  if (!user) {
    return res.status(404).json({ error: "User not found. Request OTP first." });
  }
  const identityHash = hashIdentity(aadhaarNumber);
  if (user.identityHash !== identityHash) {
    return res.status(401).json({ error: "Email and Aadhaar do not match" });
  }
  if (!user.otp || user.otp !== otp || (user.otpExpiresAt || 0) < Date.now()) {
    return res.status(400).json({ error: "Invalid or expired OTP" });
  }

  const updated = upsertUser(email, { verified: true, otp: null, otpExpiresAt: null });
  const token = jwt.sign({ email: updated.email, role: "user" }, process.env.JWT_SECRET, { expiresIn: "4h" });
  return res.json({ message: "Verification successful", token, voterId: updated.voterId });
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
