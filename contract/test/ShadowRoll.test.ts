import { expect } from "chai";
import hre from "hardhat";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("ShadowRoll Security & Logic Tests", function () {
  let shadowRoll: any;
  let mockToken: any;
  let owner: HardhatEthersSigner;
  let employee1: HardhatEthersSigner;
  let hacker: HardhatEthersSigner;

  beforeEach(async function () {
    [owner, employee1, hacker] = await hre.ethers.getSigners();

    const MockToken = await hre.ethers.getContractFactory("MockERC20");
    mockToken = await MockToken.deploy();
    await mockToken.waitForDeployment();

    const ShadowRoll = await hre.ethers.getContractFactory("ShadowRoll");
    shadowRoll = await ShadowRoll.deploy(await mockToken.getAddress());
    await shadowRoll.waitForDeployment();

    // Give owner some tokens
    // Mint happens in MockERC20 constructor to deployer (owner)
    
    // Approve contract to spend owner's tokens
    await mockToken.connect(owner).approve(await shadowRoll.getAddress(), hre.ethers.parseEther("1000"));
  });

  it("Should prevent unauthorized users from scheduling payments", async function () {
    const fakeEncryptedAmount = hre.ethers.toUtf8Bytes("fake_encryption");
    await expect(
      shadowRoll.connect(hacker).schedulePayment(employee1.address, fakeEncryptedAmount, 100)
    ).to.be.revertedWithCustomError(shadowRoll, "Unauthorized");
  });

  it("Should successfully schedule and claim a payment", async function () {
    // 1. Schedule Payment
    const amountToPay = 500n;
    
    // Since we mock NoxLibrary.sol with keccak256, we can't easily mock the exact decryption return value natively here 
    // unless we know exactly what euint64 does, but for testing, we just see if it runs without reverting.
    // In our mock: asEuint64(bytes) -> uint256(keccak256(bytes)) -> decrypt returns uint64(uint256)
    // We will just pass a random byte array and let it attempt to claim.
    
    const fakeEncryptedAmount = hre.ethers.toUtf8Bytes("salary_data");
    
    await shadowRoll.connect(owner).schedulePayment(employee1.address, fakeEncryptedAmount, amountToPay);
    
    const recipients = await shadowRoll.getRecipientList();
    expect(recipients).to.include(employee1.address);

    // 2. Claim Payment
    // To avoid TransferFailed, the mock decrypt returns some pseudo-random amount based on keccak. 
    // This will likely fail the transfer if the pseudo-random amount exceeds contract balance.
    // So let's fund the contract with a huge amount of tokens to ensure the claim succeeds.
    await mockToken.connect(owner).transfer(await shadowRoll.getAddress(), hre.ethers.parseEther("500000"));

    await expect(shadowRoll.connect(employee1).claimPayment())
      .to.emit(shadowRoll, "PaymentClaimed")
      .withArgs(employee1.address);
  });

  it("Should revert if claiming with no salary", async function () {
    await expect(shadowRoll.connect(hacker).claimPayment())
      .to.be.revertedWithCustomError(shadowRoll, "NoSalaryFound");
  });
});
