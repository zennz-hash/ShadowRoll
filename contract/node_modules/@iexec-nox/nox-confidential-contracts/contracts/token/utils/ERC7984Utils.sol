// SPDX-License-Identifier: MIT
// Inspired by OpenZeppelin Contracts (contracts/token/ERC7984/utils/ERC7984Utils.sol)
pragma solidity ^0.8.28;

import {Nox, ebool, euint256} from "@iexec-nox/nox-protocol-contracts/contracts/sdk/Nox.sol";
import {IERC7984Receiver} from "../../interfaces/IERC7984Receiver.sol";
import {ERC7984Base} from "../ERC7984Base.sol";

/**
 * @dev Library that provides common {ERC7984} utility functions.
 */
library ERC7984Utils {
    /**
     * @dev Performs a transfer callback to the recipient of the transfer `to`. Should be invoked
     * after all "transferAndCall" operations on an {ERC7984} token.
     *
     * The callback is not invoked if `to` has no code (EOA): returns an encrypted `true`.
     * If `to` has code, it must implement {IERC7984Receiver-onConfidentialTransferReceived} and
     * return an encrypted boolean indicating whether the transfer was accepted. If the call reverts
     * with an empty reason, {ERC7984InvalidReceiver} is raised; otherwise the revert is bubbled up.
     */
    function checkOnTransferReceived(
        address operator,
        address from,
        address to,
        euint256 amount,
        bytes calldata data
    ) internal returns (ebool) {
        if (to.code.length == 0) {
            return Nox.toEbool(true);
        }
        try
            IERC7984Receiver(to).onConfidentialTransferReceived(operator, from, amount, data)
        returns (ebool retval) {
            return retval;
        } catch (bytes memory reason) {
            if (reason.length == 0) {
                revert ERC7984Base.ERC7984InvalidReceiver(to);
            } else {
                assembly ("memory-safe") {
                    revert(add(32, reason), mload(reason))
                }
            }
        }
    }
}
