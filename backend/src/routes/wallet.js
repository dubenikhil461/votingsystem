const express = require("express");
const { ethers } = require("ethers");
const { requireAuth } = require("../middleware/auth");
const { upsertUser } = require("../store");

const router = express.Router();

router.get("/nonce", requireAuth, (req, res) => {
  const nonce = `quickvote-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  upsertUser(req.user.email, { walletNonce: nonce });
  return res.json({ nonce });
});

router.post("/link", requireAuth, async (req, res) => {
  const { address, signature } = req.body;
  if (!address || !signature) {
    return res.status(400).json({ error: "address and signature are required" });
  }

  const nonce = req.user.walletNonce;
  if (!nonce) {
    return res.status(400).json({ error: "Nonce missing. Call /wallet/nonce first." });
  }

  let recovered;
  try {
    recovered = ethers.verifyMessage(nonce, signature);
  } catch (error) {
    return res.status(400).json({ error: "Invalid signature format" });
  }

  if (recovered.toLowerCase() !== String(address).toLowerCase()) {
    return res.status(400).json({ error: "Signature does not match wallet address" });
  }

  const updated = upsertUser(req.user.email, {
    walletAddress: address.toLowerCase(),
    walletNonce: null,
  });
  return res.json({ message: "Wallet linked", user: serializeUser(updated) });
});

router.get("/me/status", requireAuth, (req, res) => {
  return res.json({ user: serializeUser(req.user) });
});

function serializeUser(user) {
  return {
    email: user.email,
    verified: user.verified,
    walletAddress: user.walletAddress,
    approved: user.approved,
  };
}

module.exports = router;
