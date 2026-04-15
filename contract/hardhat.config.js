import "@nomicfoundation/hardhat-ethers";
import dotenv from "dotenv";

dotenv.config();

export default {
  solidity: "0.8.24",
  networks: {
    ganache: {
      type: "http",
      url: process.env.RPC_URL || "http://127.0.0.1:7545",
      accounts: process.env.ADMIN_PRIVATE_KEY ? [process.env.ADMIN_PRIVATE_KEY] : [],
    },
  },
};
