<div align="center">
  <img src="public/logo.png" alt="ShadowRoll Logo" width="150" height="150" />
  
  # 🛡️ ShadowRoll — Confidential DeFi Payroll Protocol

  **Privacy-First Payroll Infrastructure Powered by Fully Homomorphic Encryption (FHE)**

  [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
  [![Network](https://img.shields.io/badge/Network-Arbitrum_Sepolia-blue)](https://sepolia.arbiscan.io/)
  [![Built with Next.js](https://img.shields.io/badge/Built_with-Next.js-black?logo=next.js)](https://nextjs.org/)
  [![Instagram](https://img.shields.io/badge/Instagram-@shadowr0ll-E4405F?logo=instagram&logoColor=white)](https://www.instagram.com/shadowr0ll/)

  <br />
</div>

## 📌 Project Overview

**ShadowRoll** is a decentralized payroll protocol that enables employers to pay employee salaries **on-chain** while keeping the **exact payment amounts completely confidential**. Using **Fully Homomorphic Encryption (FHE)** via the iExec Nox framework, salary data is encrypted at the smart contract level — ensuring that no one (not even blockchain explorers) can see how much each employee earns.

Deployed on **Arbitrum Sepolia**, ShadowRoll provides a full-stack Web3 experience: from FHE-enabled smart contracts to a polished, glassmorphism-styled frontend.

---

## 🔴 The Transparency Paradox

Traditional blockchains are **fully transparent by design**. While this is a feature for standard DeFi, it's a **critical vulnerability** for payroll:
- **Salary Exposure:** Anyone can look up exactly how much an employee earns, violating privacy.
- **Competitive Intelligence Leak:** Competitors can monitor payroll spending to deduce headcount and burn rate.
- **Targeted Attacks:** High-value wallets become prime targets for phishing and physical theft.
- **Regulatory Non-Compliance:** Disclosing salary data without consent violates global data privacy laws (GDPR, UU PDP).

**Existing Solutions Fall Short:** Tornado Cash masks transfers, not data. zkSNARKs prove computation but can't compute on encrypted data (like adding to an encrypted salary balance).

## 🟢 The ShadowRoll Solution

ShadowRoll introduces a **Shielded Pool + FHE Ledger** architecture:
1. **Employer** funds a shielded pool with a lump sum (amount is public, masking individual allocations).
2. **Employer** schedules payments using FHE encryption (`euint256`). The exact amount assigned to each wallet is hidden.
3. **Employees** decrypt their balances locally and execute partial/full unshielding to claim their tokens.

### Privacy Matrix

| Action | Visible on Arbiscan | Protected by FHE |
|--------|--------------------|--------------------|
| Pool Funding | ✅ Total Deposit Amount | 🔒 Individual Salary Allocations |
| Salary Schedule | ✅ Wallet Addresses | 🔒 Exact Payment Amount |
| Partial Unshield | ✅ Withdrawal Size | 🔒 Total Salary Remaining |

---

## 📊 Key Features

- **Batch Payroll Processing:** Encrypt and schedule multiple salaries in a single, gas-efficient transaction.
- **Recurring Salary Schedules:** Create automated, recurring encrypted payment schedules (e.g., monthly auto-pay).
- **FHE Data Encryption:** Salary amounts encrypted using `euint256` on-chain.
- **Live Event Monitoring:** Real-time on-chain event monitoring for Deposits, Schedules, and Revokes via `viem`.
- **Recipient Privacy:** Partial unshielding allows employees to withdraw a portion of their salary while keeping the remaining balance completely hidden.

---

## 🏗️ Architecture & Tech Stack

**Frontend:**
- **Framework:** Next.js 14 (App Router)
- **Styling:** TailwindCSS (Glassmorphism, Dark Mode)
- **Web3 Integration:** Wagmi v2, Viem, RainbowKit
- **Icons:** Lucide React

**Smart Contracts:**
- **Network:** Arbitrum Sepolia
- **Language:** Solidity 0.8.24
- **Framework:** Hardhat
- **Cryptography:** iExec Nox FHE (Abstraction layer ready for mainnet SDK)

---

## 🚀 How to Run Locally

### Prerequisites
- Node.js 18+
- MetaMask browser extension

### Setup Frontend

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/ShadowRoll.git
cd ShadowRoll

# Install frontend dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📝 Smart Contract Addresses (Arbitrum Sepolia)

| Contract | Address |
|----------|---------|
| **ShadowRoll** | [`0x3a2673fE2AB583242EAC778eD0b685a53d508A33`](https://sepolia.arbiscan.io/address/0x3a2673fE2AB583242EAC778eD0b685a53d508A33) |
| **MockToken (MTK)** | [`0x7Ea332a34a889c5C9C6Daa38c6B3b21C9e90C68f`](https://sepolia.arbiscan.io/address/0x7Ea332a34a889c5C9C6Daa38c6B3b21C9e90C68f) |

---

## 🗺️ Roadmap Status

- ✅ **v0.1** Core FHE payroll contract
- ✅ **v0.2** Frontend with Wagmi v2 + RainbowKit
- ✅ **v0.3** Security audit & hardening
- ✅ **v0.4** Total Scheduled, Activity Log, UX Polish
- ✅ **v1.0** Real iExec Nox FHE SDK integration (via abstraction layer)
- ✅ **v1.1** Batch payroll (multi-recipient in single tx)
- ✅ **v1.2** Historical event service (alternative to The Graph)
- ✅ **v1.3** Recurring salary schedules (monthly auto-pay)
- 🔲 **v2.0** Mainnet deployment (Arbitrum One)

---

## 👥 Connect with Us

Follow the development and updates of ShadowRoll:
- **Instagram:** [@shadowr0ll](https://www.instagram.com/shadowr0ll/)

---

<p align="center">
  <b>ShadowRoll</b> — Your salary. Your secret.<br/>
  <i>Built on &lt;euint256&gt; Architecture // Powered by iExec Nox FHE</i>
</p>
