// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./NoxLibrary.sol";

contract ShadowRoll {
    address public owner;
    IERC20 public token;

    mapping(address => uint256) public employerPool;
    mapping(address => euint256) private encryptedBalances;
    mapping(address => bool) public hasSalary;
    address[] private recipientList;

    // v1.3: Recurring schedule metadata
    struct RecurringSchedule {
        bytes encryptedAmount;
        uint256 intervalSeconds;   // e.g. 2592000 = ~30 days
        uint256 lastExecuted;
        bool active;
    }
    mapping(address => RecurringSchedule) public recurringSchedules;
    address[] private recurringRecipients;

    // Reentrancy guard
    bool private locked;

    error Unauthorized();
    error NoSalaryFound();
    error TransferFailed();
    error InsufficientPool();
    error ZeroAmount();
    error ReentrantCall();
    error ArrayLengthMismatch();
    error TooEarly();

    // Privacy-safe events
    event PoolFunded(address indexed employer, uint256 amount);
    event PaymentScheduled(address indexed employer, address indexed recipient);
    event PaymentClaimed(address indexed recipient);
    event PaymentRevoked(address indexed employer, address indexed recipient);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    // v1.1
    event BatchPaymentScheduled(address indexed employer, uint256 count);
    // v1.3
    event RecurringScheduleCreated(address indexed employer, address indexed recipient, uint256 intervalSeconds);
    event RecurringScheduleCancelled(address indexed employer, address indexed recipient);
    event RecurringPaymentExecuted(address indexed employer, address indexed recipient);

    constructor(address _token) {
        owner = msg.sender;
        token = IERC20(_token);
    }

    modifier onlyOwner() {
        if (msg.sender != owner) revert Unauthorized();
        _;
    }

    modifier nonReentrant() {
        if (locked) revert ReentrantCall();
        locked = true;
        _;
        locked = false;
    }

    // SEC-01: Allow ownership transfer
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid address");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    // Fund the employer's pool
    function fundPool(uint256 amount) external onlyOwner {
        if (amount == 0) revert ZeroAmount();
        bool success = token.transferFrom(msg.sender, address(this), amount);
        if (!success) revert TransferFailed();
        employerPool[msg.sender] += amount;
        emit PoolFunded(msg.sender, amount);
    }

    // Schedule single payment
    function schedulePayment(address recipient, bytes calldata encryptedAmount) external onlyOwner {
        _schedulePayment(recipient, encryptedAmount);
        emit PaymentScheduled(msg.sender, recipient);
    }

    // v1.1: Batch schedule — multiple recipients in a single transaction
    function batchSchedulePayment(
        address[] calldata recipients,
        bytes[] calldata encryptedAmounts
    ) external onlyOwner {
        if (recipients.length != encryptedAmounts.length) revert ArrayLengthMismatch();
        if (recipients.length == 0) revert ZeroAmount();

        for (uint256 i = 0; i < recipients.length; i++) {
            _schedulePayment(recipients[i], encryptedAmounts[i]);
            emit PaymentScheduled(msg.sender, recipients[i]);
        }

        emit BatchPaymentScheduled(msg.sender, recipients.length);
    }

    // Internal: shared scheduling logic
    function _schedulePayment(address recipient, bytes calldata encryptedAmount) internal {
        euint256 amount = Nox.asEuint256(encryptedAmount);
        uint256 plainAmount = Nox.decrypt(amount);
        if (plainAmount == 0) revert ZeroAmount();

        if (!hasSalary[recipient]) {
            recipientList.push(recipient);
            hasSalary[recipient] = true;
            encryptedBalances[recipient] = amount;
        } else {
            encryptedBalances[recipient] = Nox.add(encryptedBalances[recipient], amount);
        }
    }

    // v1.3: Create a recurring schedule
    function createRecurringSchedule(
        address recipient,
        bytes calldata encryptedAmount,
        uint256 intervalSeconds
    ) external onlyOwner {
        require(intervalSeconds >= 60, "Interval too short");
        require(recipient != address(0), "Invalid address");

        // Validate the encrypted amount
        euint256 amount = Nox.asEuint256(encryptedAmount);
        uint256 plainAmount = Nox.decrypt(amount);
        if (plainAmount == 0) revert ZeroAmount();

        // Execute first payment immediately
        _schedulePayment(recipient, encryptedAmount);

        // Store schedule
        if (!recurringSchedules[recipient].active) {
            recurringRecipients.push(recipient);
        }
        recurringSchedules[recipient] = RecurringSchedule({
            encryptedAmount: encryptedAmount,
            intervalSeconds: intervalSeconds,
            lastExecuted: block.timestamp,
            active: true
        });

        emit RecurringScheduleCreated(msg.sender, recipient, intervalSeconds);
        emit PaymentScheduled(msg.sender, recipient);
    }

    // v1.3: Execute a recurring payment (callable by anyone when interval has passed)
    function executeRecurring(address recipient) external {
        RecurringSchedule storage schedule = recurringSchedules[recipient];
        if (!schedule.active) revert NoSalaryFound();
        if (block.timestamp < schedule.lastExecuted + schedule.intervalSeconds) revert TooEarly();

        // Execute the scheduled payment
        euint256 amount = Nox.asEuint256FromMemory(schedule.encryptedAmount);
        uint256 plainAmount = Nox.decrypt(amount);
        if (plainAmount == 0) revert ZeroAmount();

        if (!hasSalary[recipient]) {
            recipientList.push(recipient);
            hasSalary[recipient] = true;
            encryptedBalances[recipient] = amount;
        } else {
            encryptedBalances[recipient] = Nox.add(encryptedBalances[recipient], amount);
        }

        schedule.lastExecuted = block.timestamp;
        emit RecurringPaymentExecuted(owner, recipient);
    }

    // v1.3: Cancel a recurring schedule
    function cancelRecurringSchedule(address recipient) external onlyOwner {
        if (!recurringSchedules[recipient].active) revert NoSalaryFound();
        recurringSchedules[recipient].active = false;

        // Clean up list
        for (uint256 i = 0; i < recurringRecipients.length; i++) {
            if (recurringRecipients[i] == recipient) {
                recurringRecipients[i] = recurringRecipients[recurringRecipients.length - 1];
                recurringRecipients.pop();
                break;
            }
        }

        emit RecurringScheduleCancelled(msg.sender, recipient);
    }

    // v1.3: Get all active recurring recipients
    function getRecurringRecipients() external view returns (address[] memory) {
        if (msg.sender != owner) revert Unauthorized();
        return recurringRecipients;
    }

    // Revoke payment
    function revokePayment(address recipient) external onlyOwner {
        if (!hasSalary[recipient]) revert NoSalaryFound();
        encryptedBalances[recipient] = Nox.asEuint256(0);
        hasSalary[recipient] = false;

        for (uint256 i = 0; i < recipientList.length; i++) {
            if (recipientList[i] == recipient) {
                recipientList[i] = recipientList[recipientList.length - 1];
                recipientList.pop();
                break;
            }
        }

        emit PaymentRevoked(msg.sender, recipient);
    }

    // Partial Unshielding with reentrancy guard
    function unshield(uint256 amountToWithdraw) external nonReentrant {
        if (!hasSalary[msg.sender]) revert NoSalaryFound();
        if (amountToWithdraw == 0) revert ZeroAmount();
        
        uint256 currentBalance = Nox.decrypt(encryptedBalances[msg.sender]);
        if (currentBalance < amountToWithdraw) revert InsufficientPool();

        euint256 encryptedWithdrawal = Nox.asEuint256(amountToWithdraw);
        encryptedBalances[msg.sender] = Nox.sub(encryptedBalances[msg.sender], encryptedWithdrawal);

        if (employerPool[owner] < amountToWithdraw) revert InsufficientPool();
        employerPool[owner] -= amountToWithdraw;

        uint256 remainingBalance = Nox.decrypt(encryptedBalances[msg.sender]);
        if (remainingBalance == 0) {
            hasSalary[msg.sender] = false;
            for (uint256 i = 0; i < recipientList.length; i++) {
                if (recipientList[i] == msg.sender) {
                    recipientList[i] = recipientList[recipientList.length - 1];
                    recipientList.pop();
                    break;
                }
            }
        }

        bool success = token.transfer(msg.sender, amountToWithdraw);
        if (!success) revert TransferFailed();

        emit PaymentClaimed(msg.sender);
    }

    // Access-controlled balance query
    function getEncryptedBalance(address user) external view returns (uint256) {
        if (msg.sender != user && msg.sender != owner) revert Unauthorized();
        return Nox.decrypt(encryptedBalances[user]);
    }

    // Owner-only recipient list
    function getRecipientList() external view returns (address[] memory) {
        if (msg.sender != owner) revert Unauthorized();
        return recipientList;
    }

    // Privacy-safe salary check
    function checkMySalary() external view returns (bool) {
        return hasSalary[msg.sender];
    }
}
