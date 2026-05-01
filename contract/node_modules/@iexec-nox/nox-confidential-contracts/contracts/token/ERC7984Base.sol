// SPDX-License-Identifier: MIT
// Inspired by OpenZeppelin Contracts (contracts/token/ERC7984/ERC7984.sol)
pragma solidity ^0.8.28;

import {ERC165} from "@openzeppelin/contracts/utils/introspection/ERC165.sol";
import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import {IERC7984} from "../interfaces/IERC7984.sol";
import {ERC7984Utils} from "./utils/ERC7984Utils.sol";
import {
    Nox,
    euint256,
    externalEuint256,
    ebool
} from "@iexec-nox/nox-protocol-contracts/contracts/sdk/Nox.sol";

/**
 * @dev Reference implementation for {IERC7984}.
 *
 * This contract implements a fungible token where balances and transfers are encrypted using the Nox TEE,
 * providing confidentiality to users. Token amounts are stored as encrypted, unsigned integers (`euint256`)
 * that can only be decrypted by authorized parties.
 *
 * Key features:
 *
 * - All balances are encrypted
 * - Transfers happen without revealing amounts
 * - Support for operators (delegated transfer capabilities with time bounds)
 * - Safe overflow/underflow handling for TEE operations
 */
abstract contract ERC7984Base is IERC7984, ERC165 {
    struct ERC7984Storage {
        mapping(address holder => euint256) _balances;
        mapping(address holder => mapping(address spender => uint48 until)) _operators;
        euint256 _totalSupply;
        string _name;
        string _symbol;
        string _contractURI;
    }

    function _getERC7984Storage() internal pure returns (ERC7984Storage storage $) {
        assembly {
            // keccak256(abi.encode(uint256(keccak256("nox.storage.ERC7984")) - 1)) & ~bytes32(uint256(0xff))
            $.slot := 0xb419a3e8264d03c5da9315fb9617f069307274561d78c35809e10a1cfb715600
        }
    }

    /// @dev The given receiver `receiver` is invalid for transfers.
    error ERC7984InvalidReceiver(address receiver);

    /// @dev The given sender `sender` is invalid for transfers.
    error ERC7984InvalidSender(address sender);

    /// @dev The given holder `holder` is not authorized to spend on behalf of `spender`.
    error ERC7984UnauthorizedSpender(address holder, address spender);

    /**
     * @dev The caller `user` does not have access to the encrypted amount `amount`.
     *
     * NOTE: Try using the equivalent transfer function with an input proof.
     */
    error ERC7984UnauthorizedUseOfEncryptedAmount(euint256 amount, address user);

    /// @dev The holder `holder` is trying to send tokens but has a balance of 0.
    error ERC7984ZeroBalance(address holder);

    /**
     * @dev Initializes the contract by setting a `name`, `symbol`, and `contractURI`.
     * Should be used in inheriting contract's constructor or initializer function.
     */
    function __ERC7984Base_init(
        string memory name_,
        string memory symbol_,
        string memory contractURI_
    ) internal {
        ERC7984Storage storage $ = _getERC7984Storage();
        $._name = name_;
        $._symbol = symbol_;
        $._contractURI = contractURI_;
    }

    // ============ View Functions ============

    /// @inheritdoc ERC165
    function supportsInterface(
        bytes4 interfaceId
    ) public view virtual override(IERC165, ERC165) returns (bool) {
        return interfaceId == type(IERC7984).interfaceId || super.supportsInterface(interfaceId);
    }

    /// @inheritdoc IERC7984
    function name() public view virtual returns (string memory) {
        ERC7984Storage storage $ = _getERC7984Storage();
        return $._name;
    }

    /// @inheritdoc IERC7984
    function symbol() public view virtual returns (string memory) {
        ERC7984Storage storage $ = _getERC7984Storage();
        return $._symbol;
    }

    /// @inheritdoc IERC7984
    function decimals() public view virtual returns (uint8) {
        return 18;
    }

    /// @inheritdoc IERC7984
    function contractURI() public view virtual returns (string memory) {
        ERC7984Storage storage $ = _getERC7984Storage();
        return $._contractURI;
    }

    /// @inheritdoc IERC7984
    function confidentialTotalSupply() public view virtual returns (euint256) {
        ERC7984Storage storage $ = _getERC7984Storage();
        return $._totalSupply;
    }

    /// @inheritdoc IERC7984
    function confidentialBalanceOf(address account) public view virtual returns (euint256) {
        ERC7984Storage storage $ = _getERC7984Storage();
        return $._balances[account];
    }

    /// @inheritdoc IERC7984
    function isOperator(address holder, address spender) public view virtual returns (bool) {
        ERC7984Storage storage $ = _getERC7984Storage();
        return holder == spender || block.timestamp <= $._operators[holder][spender];
    }

    // ============ External Functions ============

    /// @inheritdoc IERC7984
    function setOperator(address operator, uint48 until) public virtual {
        _setOperator(msg.sender, operator, until);
    }

    // ============ Transfer Functions ============

    /// @inheritdoc IERC7984
    function confidentialTransfer(
        address to,
        externalEuint256 encryptedAmount,
        bytes calldata inputProof
    ) public virtual returns (euint256) {
        return _transfer(msg.sender, to, Nox.fromExternal(encryptedAmount, inputProof));
    }

    /// @inheritdoc IERC7984
    function confidentialTransfer(address to, euint256 amount) public virtual returns (euint256) {
        require(
            Nox.isAllowed(amount, msg.sender),
            ERC7984UnauthorizedUseOfEncryptedAmount(amount, msg.sender)
        );
        return _transfer(msg.sender, to, amount);
    }

    /// @inheritdoc IERC7984
    function confidentialTransferFrom(
        address from,
        address to,
        externalEuint256 encryptedAmount,
        bytes calldata inputProof
    ) public virtual returns (euint256) {
        require(isOperator(from, msg.sender), ERC7984UnauthorizedSpender(from, msg.sender));
        euint256 transferred = _transfer(from, to, Nox.fromExternal(encryptedAmount, inputProof));
        Nox.allowTransient(transferred, msg.sender);
        return transferred;
    }

    /// @inheritdoc IERC7984
    function confidentialTransferFrom(
        address from,
        address to,
        euint256 amount
    ) public virtual returns (euint256) {
        require(
            Nox.isAllowed(amount, msg.sender),
            ERC7984UnauthorizedUseOfEncryptedAmount(amount, msg.sender)
        );
        require(isOperator(from, msg.sender), ERC7984UnauthorizedSpender(from, msg.sender));
        euint256 transferred = _transfer(from, to, amount);
        Nox.allowTransient(transferred, msg.sender);
        return transferred;
    }

    /// @inheritdoc IERC7984
    function confidentialTransferAndCall(
        address to,
        externalEuint256 encryptedAmount,
        bytes calldata inputProof,
        bytes calldata data
    ) public virtual returns (euint256 transferred) {
        transferred = _transferAndCall(
            msg.sender,
            to,
            Nox.fromExternal(encryptedAmount, inputProof),
            data
        );
        Nox.allowTransient(transferred, msg.sender);
    }

    /// @inheritdoc IERC7984
    function confidentialTransferAndCall(
        address to,
        euint256 amount,
        bytes calldata data
    ) public virtual returns (euint256 transferred) {
        require(
            Nox.isAllowed(amount, msg.sender),
            ERC7984UnauthorizedUseOfEncryptedAmount(amount, msg.sender)
        );
        transferred = _transferAndCall(msg.sender, to, amount, data);
        Nox.allowTransient(transferred, msg.sender);
    }

    /// @inheritdoc IERC7984
    function confidentialTransferFromAndCall(
        address from,
        address to,
        externalEuint256 encryptedAmount,
        bytes calldata inputProof,
        bytes calldata data
    ) public virtual returns (euint256 transferred) {
        require(isOperator(from, msg.sender), ERC7984UnauthorizedSpender(from, msg.sender));
        transferred = _transferAndCall(
            from,
            to,
            Nox.fromExternal(encryptedAmount, inputProof),
            data
        );
        Nox.allowTransient(transferred, msg.sender);
    }

    /// @inheritdoc IERC7984
    function confidentialTransferFromAndCall(
        address from,
        address to,
        euint256 amount,
        bytes calldata data
    ) public virtual returns (euint256 transferred) {
        require(
            Nox.isAllowed(amount, msg.sender),
            ERC7984UnauthorizedUseOfEncryptedAmount(amount, msg.sender)
        );
        require(isOperator(from, msg.sender), ERC7984UnauthorizedSpender(from, msg.sender));
        transferred = _transferAndCall(from, to, amount, data);
        Nox.allowTransient(transferred, msg.sender);
    }

    // TODO: Add requestDiscloseEncryptedAmount(euint256 encryptedAmount) and
    // discloseEncryptedAmount(euint256 encryptedAmount, uint256 cleartextAmount, bytes decryptionProof)

    // ============ Internal Functions ============

    function _setOperator(address holder, address operator, uint48 until) internal virtual {
        ERC7984Storage storage $ = _getERC7984Storage();
        $._operators[holder][operator] = until;
        emit OperatorSet(holder, operator, until);
    }

    /**
     * @dev Creates `amount` tokens and assigns them to `to`, updating the total supply.
     * Relies on the `_update` mechanism.
     *
     * Emits a {ConfidentialTransfer} event with `from` set to the zero address.
     *
     * NOTE: This function is not virtual. Override {_update} to customize token creation.
     */
    function _mint(address to, euint256 amount) internal returns (euint256) {
        require(to != address(0), ERC7984InvalidReceiver(address(0)));
        return _update(address(0), to, amount);
    }

    /**
     * @dev Destroys `amount` tokens from `from`, reducing the total supply.
     * Relies on the `_update` mechanism.
     *
     * Emits a {ConfidentialTransfer} event with `to` set to the zero address.
     *
     * NOTE: This function is not virtual. Override {_update} to customize token destruction.
     */
    function _burn(address from, euint256 amount) internal returns (euint256) {
        require(from != address(0), ERC7984InvalidSender(address(0)));
        return _update(from, address(0), amount);
    }

    /**
     * @dev Moves `amount` tokens from `from` to `to`.
     * Relies on the `_update` mechanism.
     *
     * Emits a {ConfidentialTransfer} event.
     *
     * NOTE: This function is not virtual. Override {_update} to customize token transfers.
     */
    function _transfer(address from, address to, euint256 amount) internal returns (euint256) {
        require(from != address(0), ERC7984InvalidSender(address(0)));
        require(to != address(0), ERC7984InvalidReceiver(address(0)));
        return _update(from, to, amount);
    }

    /**
     * @dev Moves `amount` tokens from `from` to `to`, then calls the {IERC7984Receiver-onConfidentialTransferReceived}
     * hook on `to` if it is a contract. The receiver returns an encrypted boolean; if it is `false`,
     * a confidential refund is issued back to `from`. If the receiver reverts, the revert is propagated.
     */
    function _transferAndCall(
        address from,
        address to,
        euint256 amount,
        bytes calldata data
    ) internal returns (euint256 transferred) {
        // Try to transfer amount + replace input with actually transferred amount.
        euint256 sent = _transfer(from, to, amount);
        // Perform callback
        ebool success = ERC7984Utils.checkOnTransferReceived(msg.sender, from, to, sent, data);

        // Refund `from` if callback returned false (encrypted).
        euint256 refund = _update(to, from, Nox.select(success, Nox.toEuint256(0), sent));
        transferred = Nox.sub(sent, refund);
    }

    /**
     * @dev Transfers `amount` from `from` to `to`, updating balances and total supply.
     * All customizations to transfers, mints, and burns should be done by overriding this function.
     *
     * - `from == address(0)` → mint: {Nox.safeAdd} increases the total supply.
     * - `to == address(0)` → burn: {Nox.sub} decreases the total supply.
     * - Both non-zero → transfer: {Nox.safeSub} decreases sender balance, {Nox.add} increases recipient balance.
     *
     * The actually transferred amount may be less than `amount` when the operation would overflow or underflow.
     * In that case success is false (encrypted) and the transferred amount is encrypted 0.
     *
     * Emits a {ConfidentialTransfer} event.
     */
    function _update(
        address from,
        address to,
        euint256 amount
    ) internal virtual returns (euint256 transferred) {
        ERC7984Storage storage $ = _getERC7984Storage();
        ebool success;
        euint256 ptr;

        if (from == address(0)) {
            // Mint: safely increase total supply.
            (success, ptr) = Nox.safeAdd($._totalSupply, amount);
            ptr = Nox.select(success, ptr, $._totalSupply);
            Nox.allowThis(ptr);
            $._totalSupply = ptr;
        } else {
            // Transfer/burn: safely decrease sender balance.
            euint256 fromBalance = $._balances[from];
            require(Nox.isInitialized(fromBalance), ERC7984ZeroBalance(from));
            (success, ptr) = Nox.safeSub(fromBalance, amount);
            ptr = Nox.select(success, ptr, fromBalance);
            Nox.allowThis(ptr);
            Nox.allow(ptr, from);
            $._balances[from] = ptr;
        }

        transferred = Nox.select(success, amount, Nox.toEuint256(0));

        if (to == address(0)) {
            // Burn: decrease total supply by actually transferred amount.
            ptr = Nox.sub($._totalSupply, transferred);
            Nox.allowThis(ptr);
            $._totalSupply = ptr;
        } else {
            // Mint/transfer: increase recipient balance by actually transferred amount.
            ptr = Nox.add($._balances[to], transferred);
            Nox.allowThis(ptr);
            Nox.allow(ptr, to);
            $._balances[to] = ptr;
        }

        if (from != address(0)) {
            Nox.allow(transferred, from);
        }
        if (to != address(0)) {
            Nox.allow(transferred, to);
        }
        Nox.allowThis(transferred);
        emit ConfidentialTransfer(from, to, transferred);
    }
}
