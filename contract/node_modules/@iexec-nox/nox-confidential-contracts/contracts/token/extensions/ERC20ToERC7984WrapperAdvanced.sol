// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC20} from "@openzeppelin/contracts/interfaces/IERC20.sol";
import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import {euint256} from "@iexec-nox/nox-protocol-contracts/contracts/sdk/Nox.sol";
import {ERC7984Base} from "../ERC7984Base.sol";
import {ERC7984Advanced} from "../ERC7984Advanced.sol";
import {ERC20ToERC7984Wrapper} from "./ERC20ToERC7984Wrapper.sol";

/**
 * @dev Implementation of {ERC20ToERC7984Wrapper} using advanced Nox primitives.
 * @dev See {ERC20ToERC7984Wrapper}.
 */
abstract contract ERC20ToERC7984WrapperAdvanced is ERC20ToERC7984Wrapper, ERC7984Advanced {
    constructor(IERC20 underlying) ERC20ToERC7984Wrapper(underlying) {}

    /// @inheritdoc ERC7984Advanced
    function _update(
        address from,
        address to,
        euint256 amount
    ) internal virtual override(ERC20ToERC7984Wrapper, ERC7984Advanced) returns (euint256) {
        if (from == address(0)) _checkConfidentialTotalSupply();
        return ERC7984Advanced._update(from, to, amount);
    }

    /// @inheritdoc ERC7984Base
    function decimals()
        public
        view
        virtual
        override(ERC20ToERC7984Wrapper, ERC7984Base)
        returns (uint8)
    {
        return ERC20ToERC7984Wrapper.decimals();
    }

    /// @inheritdoc IERC165
    function supportsInterface(
        bytes4 interfaceId
    ) public view virtual override(ERC20ToERC7984Wrapper, ERC7984Base) returns (bool) {
        return ERC20ToERC7984Wrapper.supportsInterface(interfaceId);
    }
}
