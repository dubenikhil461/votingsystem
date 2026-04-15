import { network } from "hardhat";

async function main() {
  const { ethers } = await network.connect("ganache");
  const candidateNames = process.env.CANDIDATES
    ? process.env.CANDIDATES.split(",").map((name) => name.trim()).filter(Boolean)
    : ["Alice", "Bob"];

  const Voting = await ethers.getContractFactory("Voting");
  const voting = await Voting.deploy();
  await voting.waitForDeployment();

  console.log("Voting deployed to:", await voting.getAddress());

  for (const name of candidateNames) {
    const tx = await voting.addCandidate(name);
    await tx.wait();
    console.log(`Added candidate: ${name}`);
  }

  console.log("Deployment complete.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
