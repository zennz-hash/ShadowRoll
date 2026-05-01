// SPDX-License-Identifier: MIT
// Inspired by OpenZeppelin confidential contracts (contracts/interfaces/IERC7984Receiver.sol)
pragma solidity ^0.8.28;

import {ebool, euint256} from "@iexec-nox/nox-protocol-contracts/contracts/sdk/Nox.sol";

/**
 * @dev Interface for contracts that want to support {IERC7984-confidentialTransferAndCall}
 * and {IERC7984-confidentialTransferFromAndCall} from ERC-7984 token contracts.
 */
interface IERC7984Receiver {
    /**
     * @dev Called by an ERC-7984 token contract after a successful confidential transfer.
     *
     * NOTE: The `amount` handle is accessible to this contract via the ACL.
     *
     * @param operator Address which triggered the transfer.
     * @param from Address which previously owned the tokens.
     * @param amount Encrypted amount of tokens transferred.
     * @param data Additional data with no specified format.
     * @return An encrypted boolean indicating whether the transfer was accepted.
     */
    function onConfidentialTransferReceived(
        address operator,
        address from,
        euint256 amount,
        bytes calldata data
    ) external returns (ebool);
}
