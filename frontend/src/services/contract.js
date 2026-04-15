import { ethers } from "ethers";

const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS;

const CONTRACT_ABI = [
  "function getAllCandidates() view returns (tuple(string name,uint256 voteCount)[])",
  "function state() view returns (uint8)",
  "function vote(uint256 candidateIndex)",
  "function startElection()",
  "function endElection()",
];

async function getBrowserProvider() {
  if (!window.ethereum) {
    throw new Error("MetaMask not detected");
  }
  return new ethers.BrowserProvider(window.ethereum);
}

export async function connectWallet() {
  const provider = await getBrowserProvider();
  await provider.send("eth_requestAccounts", []);
  const signer = await provider.getSigner();
  return signer.address;
}

export function getSelectedAddress() {
  return window.ethereum?.selectedAddress || "";
}

export async function getVotingContractReadOnly() {
  const provider = await getBrowserProvider();
  return new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
}

export async function getVotingContractWithSigner() {
  const provider = await getBrowserProvider();
  const signer = await provider.getSigner();
  return new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
}

export async function getCandidates() {
  const contract = await getVotingContractReadOnly();
  return contract.getAllCandidates();
}

export async function getElectionState() {
  const contract = await getVotingContractReadOnly();
  return contract.state();
}
