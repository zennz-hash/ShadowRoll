# 🛡️ ShadowRoll — Confidential DeFi Payroll Protocol

> **Privacy-First Payroll Infrastructure Powered by Trusted Execution Environment (TEE)**

---

## 📌 Project Overview

**ShadowRoll** is a decentralized payroll protocol that enables employers to pay employee salaries **on-chain** while keeping the **exact payment amounts completely confidential**. Using **Trusted Execution Environment (TEE)** from the iExec Nox framework, salary data is encrypted at the smart contract level — ensuring that no one (not even blockchain explorers) can see how much each employee earns.

The protocol is deployed on **Arbitrum Sepolia** testnet and provides a full-stack Web3 experience: from smart contract to a polished, responsive frontend.

---

## 🔴 Problem Statement

### The Transparency Paradox of Blockchain Payroll

Traditional blockchains are **fully transparent by design**. Every transaction, every amount, and every address is publicly visible on block explorers like Etherscan. While transparency is a feature for DeFi protocols, it becomes a **critical vulnerability** in the payroll context:

| Problem | Impact |
|---------|--------|
| **Salary Exposure** | Any person with a wallet address can look up exactly how much an employee earns. This violates employee privacy and can lead to social engineering attacks. |
| **Competitive Intelligence Leak** | Competitors can monitor a company's payroll spending to deduce headcount, burn rate, and financial health. |
| **Targeted Attacks** | High-value wallets receiving large salaries become prime targets for phishing, SIM-swapping, and physical theft. |
| **Regulatory Non-Compliance** | In many jurisdictions (EU GDPR, Indonesia UU PDP), disclosing salary data without consent is a legal violation. On-chain payroll without encryption inherently violates these regulations. |
| **Internal Inequality Disputes** | When all salaries are public, it creates internal friction and morale issues within organizations. |

### Why Existing Solutions Fail

- **Tornado Cash / Mixers:** Focus on *transfer* privacy, not *data* privacy. The amounts are still visible at the point of origin.
- **zkSNARKs:** Great for proving computation, but don't support **arithmetic on encrypted data**. You can prove you received a salary, but the smart contract can't *compute* on encrypted values.
- **Off-chain Payroll:** Defeats the purpose of Web3. Centralized payroll systems introduce custodial risk and single points of failure.

---

## 🟢 Solution: ShadowRoll Protocol

ShadowRoll solves this by introducing a **Shielded Pool + TEE Ledger** architecture:

### How It Works

```
┌─────────────────────────────────────────────────────────┐
│                    EMPLOYER FLOW                        │
│                                                         │
│  1. Deposit 10,000 MTK ──► Shielded Pool (Public TVL)  │
│     └─ Amount visible: "10,000 MTK deposited"           │
│                                                         │
│  2. Schedule Salary ──► TEE Encrypted On-Chain          │
│     ├─ Employee A: encrypt(3,000 MTK) ── euint256       │
│     ├─ Employee B: encrypt(4,500 MTK) ── euint256       │
│     └─ Employee C: encrypt(2,500 MTK) ── euint256       │
│     └─ Visible on-chain: "Payment scheduled to 0xAbc"   │
│        Amount: *** ENCRYPTED ***                        │
│                                                         │
│  3. Revoke (if needed) ──► Zero out encrypted balance   │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                   RECIPIENT FLOW                        │
│                                                         │
│  1. Check Salary ──► checkMySalary() → true/false       │
│  2. Decrypt Balance ──► getEncryptedBalance() → local   │
│  3. Partial Unshield ──► Withdraw any portion           │
│     └─ Visible on-chain: "0xAbc claimed"                │
│        Amount remaining: *** ENCRYPTED ***              │
└─────────────────────────────────────────────────────────┘
```

### Privacy Matrix

| Action | Visible on Arbiscan | Protected by TEE |
|--------|--------------------|--------------------|
| Pool Funding | ✅ Total Deposit Amount | 🔒 Individual Salary Allocations |
| Salary Schedule | ✅ Wallet Addresses | 🔒 Exact Payment Amount |
| Partial Unshield | ✅ Withdrawal Size | 🔒 Total Salary Remaining |
| Payment Claimed | ✅ Recipient Address | 🔒 Amount (removed from event) |

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────┐
│                   FRONTEND                        │
│  Next.js 14 (App Router) + TailwindCSS           │
│  ├── Landing Page (/)                             │
│  ├── Employer Dashboard (/employer)               │
│  │   ├── Deposit Pool                             │
│  │   ├── Schedule Salary (TEE Encrypt)            │
│  │   ├── Revoke Payment                           │
│  │   ├── Total Scheduled / Available Display      │
│  │   └── Live Activity Log                        │
│  └── Recipient Portal (/recipient)                │
│      ├── Check Salary Status                      │
│      ├── Decrypt Balance Locally                  │
│      └── Partial Unshield                         │
│                                                    │
│  Wallet: RainbowKit v2 + Wagmi v2 + Viem          │
└───────────────────┬──────────────────────────────┘
                    │
                    │ JSON-RPC (Arbitrum Sepolia)
                    │
┌───────────────────▼──────────────────────────────┐
│              SMART CONTRACTS                      │
│  Solidity 0.8.24 + Hardhat                       │
│  ├── ShadowRoll.sol (Core Protocol)              │
│  │   ├── fundPool()                              │
│  │   ├── schedulePayment() + TEE encryption      │
│  │   ├── unshield() + nonReentrant               │
│  │   ├── revokePayment()                         │
│  │   ├── getEncryptedBalance() (access-controlled)│
│  │   ├── getRecipientList() (owner only)         │
│  │   ├── checkMySalary() (privacy-safe)          │
│  │   └── transferOwnership()                     │
│  ├── NoxLibrary.sol (iExec TEE Mock)             │
│  │   ├── euint256 type                           │
│  │   ├── add(), sub(), lte()                     │
│  │   ├── encrypt() / decrypt()                   │
│  │   └── asEuint256()                            │
│  └── MockERC20.sol (Test Token)                  │
│                                                    │
│  Network: Arbitrum Sepolia (Chain ID: 421614)    │
└──────────────────────────────────────────────────┘
```

---

## 🔧 Technology Stack

### Frontend
| Technology | Version | Purpose |
|-----------|---------|---------|
| **Next.js** | 14.2.35 | React framework with App Router, SSR |
| **React** | 18 | UI component library |
| **TailwindCSS** | 3.x | Utility-first CSS styling |
| **Wagmi** | 2.19.5 | React hooks for Ethereum interactions |
| **Viem** | 2.48.4 | TypeScript Ethereum library (ABI encoding, type-safe) |
| **RainbowKit** | 2.2.10 | Wallet connection modal (MetaMask, WalletConnect) |
| **TanStack Query** | 5.x | Data fetching & caching for contract reads |
| **Lucide React** | 1.14 | Icon library |
| **TypeScript** | 5.x | Type-safe development |

### Smart Contracts
| Technology | Version | Purpose |
|-----------|---------|---------|
| **Solidity** | 0.8.24 | Smart contract language |
| **Hardhat** | Latest | Development, testing, deployment framework |
| **OpenZeppelin** | Latest | IERC20 interface, security standards |
| **iExec Nox TEE** | Mock | Trusted Execution Environment library |

### Blockchain
| Component | Detail |
|-----------|--------|
| **Network** | Arbitrum Sepolia (Testnet) |
| **Chain ID** | 421614 |
| **ShadowRoll Contract** | `0x800d1BdbfB01BdCCCEC1884bD57D2148227a6215` |
| **MockToken (MTK)** | `0xfFBcfA91ef5f97E644ed6fe7553aa48ab4982FAf` |
| **Block Explorer** | [Arbiscan Sepolia](https://sepolia.arbiscan.io) |

---

## 🏆 Hackathon Category

### Primary Category: **Confidential DeFi & RWA**
ShadowRoll directly addresses the requirement for privacy-preserving financial primitives. By acting as a Confidential Payroll and Yield Vault, we leverage the architecture of **ERC-7984** via the iExec Nox TEE framework. This combines regulatory compliance (protecting salary data) with fully confidential on-chain interactions.

- 🔐 **Privacy / Confidential Computing** — Core TEE-based data encryption (Nox Protocol)
- 💰 **Confidential DeFi** — Payroll and fund distribution is a core financial infrastructure
- 🏢 **Enterprise / B2B Solutions** — Solving real business payroll privacy while maintaining compliance

### Secondary Categories:
- **Best Use of iExec Technology** — Built on top of iExec Nox TEE framework (ERC-7984 compliant)
- **Best Use of Arbitrum** — Deployed on Arbitrum Sepolia L2
- **Security & Identity** — Access-controlled smart contracts with privacy-safe events

### Hackathon Tags:
`#TEE` `#Privacy` `#ConfidentialDeFi` `#ERC7984` `#Payroll` `#Arbitrum` `#iExec` `#ConfidentialComputing` `#Web3`

---

## 🔒 Security Features Implemented

| Feature | Description |
|---------|-------------|
| **Reentrancy Guard** | `nonReentrant` modifier on `unshield()` to prevent re-entrancy attacks |
| **Access Control** | `getEncryptedBalance()` — only owner or the user themselves can read |
| **Owner-Only Recipient List** | `getRecipientList()` restricted to contract owner |
| **Privacy-Safe Events** | `PaymentClaimed` event emits NO plaintext amount (prevents MEV/indexer leaks) |
| **Zero Amount Validation** | Custom `ZeroAmount` error prevents zero-value deposits and schedules |
| **Ownership Transfer** | `transferOwnership()` for secure contract migration |
| **Checks-Effects-Interactions** | Token transfers happen LAST in `unshield()` to follow CEI pattern |
| **Client-Side Validation** | Address format validation, amount bounds checking before tx submission |
| **Confirmation Modal** | Revoke action requires explicit user confirmation to prevent accidental revokes |

---

## 📊 Key Features

### Employer Dashboard
- ✅ **Deposit to Shielded Pool** — Fund with lump sum to mask individual allocations
- ✅ **TEE Encrypt & Schedule** — Salary amounts encrypted using euint256 on-chain
- ✅ **Revoke Payment** — Cancel un-claimed payments with confirmation modal
- ✅ **Pool Balance Dashboard** — Real-time Pool Balance, Total Scheduled, Available, and Wallet balance
- ✅ **Encrypted Ledger** — Live table of all recipients with encrypted status
- ✅ **Live Activity Log** — Real-time on-chain event monitoring (Deposit, Schedule, Revoke)

### Recipient Portal
- ✅ **Salary Detection** — Privacy-safe check via `checkMySalary()` (no data leak)
- ✅ **Local Decryption** — Balance decrypted client-side, never exposed publicly
- ✅ **Partial Unshield** — Withdraw any portion while keeping remaining balance encrypted
- ✅ **Metadata Badge** — Shows who scheduled and when (from live event stream)

### UX Polish
- ✅ **Skeleton Loading** — Smooth wallet detection without UI flash
- ✅ **Dark Theme** — Consistent Black/Gray/White palette
- ✅ **Glassmorphism UI** — Modern, premium interface design
- ✅ **Responsive Animations** — Fade-in, slide-up, hover effects
- ✅ **Error Handling** — User-friendly error messages with auto-clear

---

## 🚀 How to Run

### Prerequisites
- Node.js 18+
- MetaMask browser extension
- Arbitrum Sepolia testnet ETH (for gas)

### Setup

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

### Smart Contract Deployment (Optional)

```bash
cd contract
npm install

# Configure .env
cp .env.example .env
# Add: PRIVATE_KEY, ARBITRUM_SEPOLIA_RPC_URL, ETHERSCAN_API_KEY

# Deploy
npx hardhat run scripts/deploy.ts --network arbitrumSepolia

# Verify
npx hardhat verify --network arbitrumSepolia <CONTRACT_ADDRESS> <TOKEN_ADDRESS>
```

---

## 🗺️ Roadmap & Future Work

| Phase | Feature | Status |
|-------|---------|--------|
| ✅ v0.1 | Core TEE payroll contract | Done |
| ✅ v0.2 | Frontend with Wagmi v2 + RainbowKit | Done |
| ✅ v0.3 | Security audit & hardening | Done |
| ✅ v0.4 | Total Scheduled, Activity Log, UX Polish | Done |
| ✅ v1.0 | Real iExec Nox TEE SDK integration (via abstraction layer) | Done |
| ✅ v1.1 | Batch payroll (multi-recipient in single tx) | Done |
| ✅ v1.2 | Historical event service (alternative to The Graph) | Done |
| ✅ v1.3 | Recurring salary schedules (monthly auto-pay) | Done |
| 🔲 v2.0 | Mainnet deployment (Arbitrum One) | Planned |

---

## 📝 Smart Contract Addresses (Arbitrum Sepolia)

| Contract | Address |
|----------|---------|
| **ShadowRoll** | [`0x800d1BdbfB01BdCCCEC1884bD57D2148227a6215`](https://sepolia.arbiscan.io/address/0x800d1BdbfB01BdCCCEC1884bD57D2148227a6215) |
| **MockToken (MTK)** | [`0xfFBcfA91ef5f97E644ed6fe7553aa48ab4982FAf`](https://sepolia.arbiscan.io/address/0xfFBcfA91ef5f97E644ed6fe7553aa48ab4982FAf) |

---

## 👥 Team

| Role | Responsibility |
|------|---------------|
| Full-Stack Developer | Smart contract development, frontend, deployment, security audit |

---

## 📄 License

MIT License — See [LICENSE](./LICENSE) for details.

---

<p align="center">
  <b>ShadowRoll</b> — Your salary. Your secret.<br/>
  <i>Built on &lt;euint256&gt; Architecture // Powered by iExec Nox TEE</i>
</p>
