// SPDX-License-Identifier: MIT
// Inspired by OpenZeppelin Contracts (contracts/token/ERC7984/ERC7984.sol)
pragma solidity ^0.8.28;

import {Initializable} from "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import {ERC7984Base} from "./ERC7984Base.sol";

abstract contract ERC7984Upgradeable is ERC7984Base, Initializable {
    function __ERC7984_init(
        string memory name,
        string memory symbol,
        string memory contractURI
    ) internal onlyInitializing {
        __ERC7984Base_init(name, symbol, contractURI);
    }
}
