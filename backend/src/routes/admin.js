const express = require("express");
const { requireAdmin } = require("../middleware/auth");
const { getUserByEmail, upsertUser } = require("../store");
const { whitelistWallet } = require("../services/web3Service");

const router = express.Router();

router.post("/approve-wallet", requireAdmin, async (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();
  const user = getUserByEmail(email);
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }
  if (!user.verified) {
    return res.status(400).json({ error: "User is not verified" });
  }
  if (!user.walletAddress) {
    return res.status(400).json({ error: "User has not linked wallet" });
  }

  const receipt = await whitelistWallet(user.walletAddress);
  const updated = upsertUser(email, { approved: true });
  return res.json({
    message: "Wallet approved and whitelisted",
    txHash: receipt.txHash,
    user: {
      email: updated.email,
      walletAddress: updated.walletAddress,
      approved: updated.approved,
    },
  });
});

module.exports = router;
