import hre from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contract with the account:", deployer?.address || "No account found");

  const MockToken = await hre.ethers.getContractFactory("MockERC20");
  const token = await MockToken.deploy();
  await token.waitForDeployment();
  const tokenAddress = await token.getAddress();
  console.log("Mock Token deployed to:", tokenAddress);

  const ShadowRoll = await hre.ethers.getContractFactory("ShadowRoll");
  const shadowRoll = await ShadowRoll.deploy(tokenAddress);

  await shadowRoll.waitForDeployment();
  const shadowRollAddress = await shadowRoll.getAddress();

  console.log("ShadowRoll deployed to:", shadowRollAddress);

  // Export ABI and Address
  const artifact = await hre.artifacts.readArtifact("ShadowRoll");
  const exportData = {
    address: shadowRollAddress,
    abi: artifact.abi
  };

  const exportDir = path.join(process.cwd(), "../src");
  if (!fs.existsSync(exportDir)) {
    fs.mkdirSync(exportDir, { recursive: true });
  }

  const exportPath = path.join(exportDir, "ShadowRollABI.json");
  fs.writeFileSync(exportPath, JSON.stringify(exportData, null, 2));
  console.log("ABI and Contract Address exported to:", exportPath);
  
  console.log("\n--- Verification Snippet ---");
  console.log(`npx hardhat verify --network arbitrumSepolia ${shadowRollAddress} ${tokenAddress}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
