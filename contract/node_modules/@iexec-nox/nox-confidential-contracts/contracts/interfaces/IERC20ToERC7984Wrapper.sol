// SPDX-License-Identifier: MIT
// Inspired by OpenZeppelin Confidential Contracts (contracts/interfaces/IERC7984ERC20Wrapper.sol)
pragma solidity ^0.8.28;

import {euint256, externalEuint256} from "@iexec-nox/nox-protocol-contracts/contracts/sdk/Nox.sol";
import {IERC7984} from "./IERC7984.sol";

/// @dev Interface for ERC20ToERC7984Wrapper contract.
interface IERC20ToERC7984Wrapper is IERC7984 {
    event UnwrapRequested(address indexed receiver, euint256 amount);
    event UnwrapFinalized(
        address indexed receiver,
        euint256 encryptedAmount,
        uint256 plaintextAmount
    );

    /**
     * @dev Wraps `amount` of the underlying ERC-20 token into a confidential token and sends it to `to`.
     * Tokens are exchanged 1:1. Returns the encrypted amount of wrapped tokens.
     */
    function wrap(address to, uint256 amount) external returns (euint256);

    /**
     * @dev Unwraps confidential tokens from `from` and sends underlying ERC-20 tokens to `to`.
     * The caller must be `from` or an approved operator for `from`.
     * The caller *must* already be allowed by ACL for the given `amount`.
     *
     * NOTE: The unwrap request created by this function must be finalized by calling {finalizeUnwrap}.
     */
    function unwrap(
        address from,
        address to,
        euint256 amount
    ) external returns (euint256 unwrapRequestId);

    /**
     * @dev Same as {unwrap}, but accepts an external encrypted amount with an input proof
     * instead of requiring prior ACL access.
     */
    function unwrap(
        address from,
        address to,
        externalEuint256 encryptedAmount,
        bytes calldata inputProof
    ) external returns (euint256 unwrapRequestId);

    /**
     * @dev Finalizes an unwrap request by verifying the decryption proof and transferring the
     * underlying ERC-20 tokens to the recipient.
     * @dev `unwrapRequestId` is the amount handle returned by {unwrap}.
     */
    function finalizeUnwrap(
        euint256 unwrapRequestId,
        bytes calldata decryptedAmountAndProof
    ) external;

    /// @dev Returns the address of the underlying ERC-20 token being wrapped.
    function underlying() external view returns (address);

    /**
     * @dev Returns `balanceOf(address(this))`, a value greater than or equal to the actual
     * {confidentialTotalSupply}. Can be inflated by directly sending underlying tokens to this contract.
     *
     * NOTE: After an {unwrap}, the encrypted total supply decreases immediately (tokens are burned),
     * but the underlying ERC-20 balance stays unchanged until {finalizeUnwrap} actually transfers them out.
     * Between these two calls, this value is temporarily higher than the real total supply.
     */
    function inferredTotalSupply() external view returns (uint256);

    /// @dev Returns the maximum total supply of wrapped tokens.
    function maxTotalSupply() external view returns (uint256);

    /// @dev Returns the recipient of the pending unwrap request for `unwrapAmount`, or `address(0)`.
    function unwrapRequester(euint256 unwrapAmount) external view returns (address);
}
