const { ethers } = require("ethers");

function getProvider() {
  if (!process.env.RPC_URL) {
    throw new Error("Missing RPC_URL in backend .env");
  }
  return new ethers.JsonRpcProvider(process.env.RPC_URL);
}

function getAdminSigner() {
  if (!process.env.ADMIN_PRIVATE_KEY) {
    throw new Error("Missing ADMIN_PRIVATE_KEY in backend .env");
  }
  return new ethers.Wallet(process.env.ADMIN_PRIVATE_KEY, getProvider());
}

function getVotingContract() {
  if (!process.env.CONTRACT_ADDRESS) {
    throw new Error("Missing CONTRACT_ADDRESS in backend .env");
  }
  const abi = [
    "function whitelistVoter(address voter) external",
    "function isWhitelisted(address voter) external view returns (bool)",
  ];
  return new ethers.Contract(process.env.CONTRACT_ADDRESS, abi, getAdminSigner());
}

async function whitelistWallet(walletAddress) {
  const contract = getVotingContract();
  const tx = await contract.whitelistVoter(walletAddress);
  const receipt = await tx.wait();
  return { txHash: receipt.hash };
}

module.exports = {
  whitelistWallet,
};
