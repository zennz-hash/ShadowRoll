// SPDX-License-Identifier: MIT
// Inspired by OpenZeppelin Confidential Contracts (contracts/token/ERC7984/extensions/ERC7984ERC20Wrapper.sol)
pragma solidity ^0.8.28;

import {IERC1363Receiver} from "@openzeppelin/contracts/interfaces/IERC1363Receiver.sol";
import {IERC20} from "@openzeppelin/contracts/interfaces/IERC20.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/interfaces/IERC20Metadata.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import {
    Nox,
    euint256,
    externalEuint256
} from "@iexec-nox/nox-protocol-contracts/contracts/sdk/Nox.sol";
import {IERC7984} from "../../interfaces/IERC7984.sol";
import {IERC20ToERC7984Wrapper} from "../../interfaces/IERC20ToERC7984Wrapper.sol";
import {ERC7984} from "../ERC7984.sol";
import {ERC7984Base} from "../ERC7984Base.sol";

/**
 * @dev A wrapper contract built on top of {ERC7984} that allows wrapping an `ERC20` token
 * into an `ERC7984` token. The wrapper contract implements the `IERC1363Receiver` interface
 * which allows users to transfer `ERC1363` tokens directly to the wrapper with a callback to wrap the tokens.
 *
 * The wrapped token uses the same decimals as the underlying ERC-20 (1:1 conversion).
 * Unlike the OpenZeppelin implementation which uses `euint64` and requires a rate to compress
 * high-decimal values, this implementation uses `euint256` and can represent any ERC-20 value directly.
 *
 * WARNING: Minting assumes the full amount of the underlying token transfer has been received, hence some
 * non-standard tokens such as fee-on-transfer or other deflationary-type tokens are not supported by this wrapper.
 */
abstract contract ERC20ToERC7984Wrapper is ERC7984, IERC20ToERC7984Wrapper, IERC1363Receiver {
    IERC20 private immutable _underlying;
    uint8 private immutable _decimals;

    mapping(euint256 unwrapAmount => address recipient) private _unwrapRequests;

    error ERC7984UnauthorizedCaller(address caller);
    error InvalidUnwrapRequest(euint256 unwrapRequestId);
    error ERC7984TotalSupplyOverflow();

    constructor(IERC20 underlying_) {
        _underlying = underlying_;
        _decimals = _tryGetAssetDecimals(underlying_);
    }

    // ============ External Functions ============

    /**
     * @dev ERC-1363 callback: wraps received tokens to the address in `data` (or `from` if empty).
     */
    function onTransferReceived(
        address /*operator*/,
        address from,
        uint256 amount,
        bytes calldata data
    ) public virtual returns (bytes4) {
        require(underlying() == msg.sender, ERC7984UnauthorizedCaller(msg.sender));
        address to = data.length < 20 ? from : address(bytes20(data));
        _mint(to, Nox.toEuint256(amount));
        return IERC1363Receiver.onTransferReceived.selector;
    }

    /// @inheritdoc IERC20ToERC7984Wrapper
    function wrap(address to, uint256 amount) public virtual override returns (euint256) {
        SafeERC20.safeTransferFrom(IERC20(underlying()), msg.sender, address(this), amount);
        euint256 wrappedAmount = _mint(to, Nox.toEuint256(amount));
        Nox.allowTransient(wrappedAmount, msg.sender);
        return wrappedAmount;
    }

    /// @inheritdoc IERC20ToERC7984Wrapper
    function unwrap(
        address from,
        address to,
        euint256 amount
    ) public virtual override returns (euint256) {
        require(
            Nox.isAllowed(amount, msg.sender),
            ERC7984UnauthorizedUseOfEncryptedAmount(amount, msg.sender)
        );
        return _unwrap(from, to, amount);
    }

    /// @inheritdoc IERC20ToERC7984Wrapper
    function unwrap(
        address from,
        address to,
        externalEuint256 encryptedAmount,
        bytes calldata inputProof
    ) public virtual override returns (euint256) {
        return _unwrap(from, to, Nox.fromExternal(encryptedAmount, inputProof));
    }

    /// @dev This interface slightly differs from Openzeppelin's (no plaintext amout).
    /// @inheritdoc IERC20ToERC7984Wrapper
    function finalizeUnwrap(
        euint256 unwrapRequestId,
        bytes calldata decryptedAmountAndProof
    ) external virtual override {
        address to = unwrapRequester(unwrapRequestId);
        require(to != address(0), InvalidUnwrapRequest(unwrapRequestId));
        delete _unwrapRequests[unwrapRequestId];
        uint256 plaintextAmount = Nox.publicDecrypt(unwrapRequestId, decryptedAmountAndProof);
        SafeERC20.safeTransfer(IERC20(underlying()), to, plaintextAmount);
        emit UnwrapFinalized(to, unwrapRequestId, plaintextAmount);
    }

    // TODO: Add a virtual `rate()` function to support custom conversion rates between the
    // underlying ERC-20 and the wrapped token. Integrate it into `wrap`, `onTransferReceived`
    // and `_unwrap`.

    // ============ View Functions ============

    /// @inheritdoc ERC7984Base
    function decimals() public view virtual override(IERC7984, ERC7984Base) returns (uint8) {
        return _decimals;
    }

    /// @inheritdoc IERC20ToERC7984Wrapper
    function underlying() public view virtual override returns (address) {
        return address(_underlying);
    }

    /// @inheritdoc IERC165
    function supportsInterface(
        bytes4 interfaceId
    ) public view virtual override(IERC165, ERC7984Base) returns (bool) {
        return
            interfaceId == type(IERC20ToERC7984Wrapper).interfaceId ||
            interfaceId == type(IERC1363Receiver).interfaceId ||
            super.supportsInterface(interfaceId);
    }

    /// @inheritdoc IERC20ToERC7984Wrapper
    function inferredTotalSupply() public view virtual returns (uint256) {
        return IERC20(underlying()).balanceOf(address(this));
    }

    /// @inheritdoc IERC20ToERC7984Wrapper
    function maxTotalSupply() public view virtual returns (uint256) {
        return type(uint256).max;
    }

    /// @inheritdoc IERC20ToERC7984Wrapper
    function unwrapRequester(euint256 unwrapAmount) public view virtual returns (address) {
        return _unwrapRequests[unwrapAmount];
    }

    // ============ Internal Functions ============

    /// @dev By default `maxTotalSupply` returns `type(uint256).max`, so this check never reverts.
    /// Override `maxTotalSupply` in a child contract to enforce a custom cap.
    function _checkConfidentialTotalSupply() internal virtual {
        if (inferredTotalSupply() > maxTotalSupply()) revert ERC7984TotalSupplyOverflow();
    }

    /// @inheritdoc ERC7984Base
    function _update(
        address from,
        address to,
        euint256 amount
    ) internal virtual override returns (euint256) {
        if (from == address(0)) _checkConfidentialTotalSupply();
        return super._update(from, to, amount);
    }

    /// @dev Burns `amount` from `from`, marks the result publicly decryptable, and records the unwrap request.
    function _unwrap(
        address from,
        address to,
        euint256 amount
    ) internal virtual returns (euint256) {
        require(to != address(0), ERC7984InvalidReceiver(to));
        require(
            from == msg.sender || isOperator(from, msg.sender),
            ERC7984UnauthorizedSpender(from, msg.sender)
        );
        // WARNING: Storing unwrap requests in a mapping from handle to address assumes that
        // handles are unique. This holds here because `_burn` always returns a fresh handle,
        // but be cautious when assuming handle uniqueness in other contexts.
        euint256 unwrapAmount = _burn(from, amount);
        Nox.allowPublicDecryption(unwrapAmount);
        assert(unwrapRequester(unwrapAmount) == address(0));
        _unwrapRequests[unwrapAmount] = to;
        emit UnwrapRequested(to, unwrapAmount);
        return unwrapAmount;
    }

    /// @dev Default decimals when the underlying ERC-20 does not expose {IERC20Metadata.decimals}.
    function _fallbackUnderlyingDecimals() internal pure virtual returns (uint8) {
        return 18;
    }

    function _tryGetAssetDecimals(IERC20 asset_) private view returns (uint8) {
        (bool success, bytes memory encodedDecimals) = address(asset_).staticcall(
            abi.encodeCall(IERC20Metadata.decimals, ())
        );
        if (success && encodedDecimals.length == 32) return abi.decode(encodedDecimals, (uint8));
        return _fallbackUnderlyingDecimals();
    }
}
