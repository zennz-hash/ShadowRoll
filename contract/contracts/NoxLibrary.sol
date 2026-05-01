// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

type euint256 is uint256;

library Nox {
    function asEuint256(bytes calldata encryptedAmount) internal pure returns (euint256) {
        // Mock: In real Nox FHE, ciphertext is processed in TEE.
        // For testnet mock, we decode the ABI-encoded uint256 from the bytes.
        uint256 value = abi.decode(encryptedAmount, (uint256));
        return euint256.wrap(value);
    }

    function add(euint256 a, euint256 b) internal pure returns (euint256) {
        return euint256.wrap(euint256.unwrap(a) + euint256.unwrap(b));
    }

    function sub(euint256 a, euint256 b) internal pure returns (euint256) {
        return euint256.wrap(euint256.unwrap(a) - euint256.unwrap(b));
    }

    function lte(euint256 a, euint256 b) internal pure returns (bool) {
        return euint256.unwrap(a) <= euint256.unwrap(b);
    }

    function decrypt(euint256 a) internal pure returns (uint256) {
        // Mock implementation for testnet
        return uint256(euint256.unwrap(a));
    }

    function asEuint256(uint256 amount) internal pure returns (euint256) {
        return euint256.wrap(amount);
    }

    function asEuint256FromMemory(bytes memory encryptedAmount) internal pure returns (euint256) {
        uint256 value = abi.decode(encryptedAmount, (uint256));
        return euint256.wrap(value);
    }
}
