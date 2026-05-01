# Nox · nox-confidential-contracts

[![License](https://img.shields.io/badge/license-MIT-blue)](./LICENSE)
[![Docs](https://img.shields.io/badge/docs-nox--protocol-purple)](https://docs.iex.ec)
[![Discord](https://img.shields.io/badge/chat-Discord-5865F2)](https://discord.com/invite/5TewNUnJHN)
[![Tag](https://img.shields.io/github/v/tag/iExec-Nox/nox-confidential-contracts?label=tag)](https://github.com/iExec-Nox/nox-confidential-contracts/releases)
[![npm](https://img.shields.io/npm/v/@iexec-nox/nox-confidential-contracts?label=npm)](https://www.npmjs.com/package/@iexec-nox/nox-confidential-contracts)

> A library of confidential smart contracts for the [Nox protocol](https://github.com/iExec-Nox/nox-protocol-contracts). Implementations of standards like [ERC-7984](https://eips.ethereum.org/EIPS/eip-7984), with extensions and utilities for building confidential applications.

## Table of Contents

- [Nox · nox-confidential-contracts](#nox--nox-confidential-contracts)
    - [Table of Contents](#table-of-contents)
    - [Overview](#overview)
    - [Prerequisites](#prerequisites)
    - [Getting Started](#getting-started)
    - [Testing](#testing)
    - [Configuration notes](#configuration-notes)
    - [Related Repositories](#related-repositories)
    - [Contributing](#contributing)
        - [Code style](#code-style)
    - [License](#license)

## Overview

**nox-confidential-contracts** provides production-ready Solidity implementations for confidential tokens on the Nox protocol:

- **ERC7984**: a confidential fungible token standard ([ERC-7984](https://eips.ethereum.org/EIPS/eip-7984)) implementation.
- **ERC7984Advanced**: the same interface using more gas-efficient Nox primitives.
- **ERC20ToERC7984Wrapper**: wraps existing ERC-20 tokens into confidential ERC-7984 tokens.
- **ERC20ToERC7984WrapperAdvanced**: more gas-efficient variant of the wrapper.
- **ERC7984Utils**: shared utility library for confidential token operations.

## Prerequisites

- Node.js >= 24 (see `.nvmrc`)
- pnpm >= 10 (see `packageManager` in `package.json`)
- Hardhat >= 3

## Getting Started

```bash
git clone https://github.com/iExec-Nox/nox-confidential-contracts.git
cd nox-confidential-contracts

# Use the correct Node version
nvm install && nvm use

# Install dependencies
pnpm install

# Build contracts
pnpm run build
```

## Testing

```bash
# Run all tests
pnpm run test

# Run coverage
pnpm run coverage
```

## Configuration notes

- Solidity compiler version is pinned in [`.solc.json`](.solc.json).
- Depends on [`@iexec-nox/nox-protocol-contracts`](https://github.com/iExec-Nox/nox-protocol-contracts) for Nox SDK and protocol interfaces.

## Related Repositories

| Repository                                                                    | Description                                     |
| ----------------------------------------------------------------------------- | ----------------------------------------------- |
| [nox-protocol-contracts](https://github.com/iExec-Nox/nox-protocol-contracts) | Core Nox protocol contracts (NoxCompute, SDK)   |
| [nox-handle-sdk](https://github.com/iExec-Nox/nox-handle-sdk)                 | TypeScript SDK for handle encryption/decryption |
| [encrypted-types](https://github.com/iExec-Nox/encrypted-types)               | Solidity types for encrypted values             |

## Contributing

Contributions are welcome. Please open an issue first to discuss your proposed changes.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/my-feature`)
3. Commit your changes
4. Push to the branch (`git push origin feature/my-feature`)
5. Open a Pull Request

### Code style

```bash
# Format all files
pnpm run format

# Check formatting
pnpm run format:check
```

## License

This project is released under the [MIT License](./LICENSE).
