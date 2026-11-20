// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title IVaultPay & Reactive Omni System Interfaces
 * @notice Interfaces, structs, and events for VaultPay on Base Sepolia (84532)
 *         and Reactive Omni / Lasna Testnet (5318007).
 */

enum CallbackVersion {
    V_1_0
}

interface ISystemContract {
    function subscribe(
        uint256 chain_id,
        address _contract,
        uint256 topic_0,
        uint256 topic_1,
        uint256 topic_2,
        uint256 topic_3
    ) external;

    function unsubscribe(
        uint256 chain_id,
        address _contract,
        uint256 topic_0,
        uint256 topic_1,
        uint256 topic_2,
        uint256 topic_3
    ) external;

    function requestCallbackV_1_0(
        uint256 chain_id,
        address _contract,
        uint64 gas_limit,
        bytes calldata payload
    ) external;
}

interface IReactive {
    struct LogRecord {
        uint256 chain_id;
        address _contract;
        uint256 topic_0;
        uint256 topic_1;
        uint256 topic_2;
        uint256 topic_3;
        bytes data;
        uint256 block_number;
        uint256 op_code;
        uint256 block_hash;
        uint256 tx_hash;
        uint256 log_index;
    }

    event Callback(
        uint256 indexed chain_id,
        address indexed _contract,
        uint64 indexed gas_limit,
        bytes payload
    );

    function react(LogRecord calldata log) external;
}

interface IVaultPay {
    /**
     * @notice User's "Set It and Forget It" rule configuration
     * @dev All time locks & cooldown windows strictly use UNIX seconds (block.timestamp)
     *      to comply with Base Sepolia's 200ms block time rule.
     */
    struct UserRule {
        uint16 savingsBps;          // e.g. 2000 = 20% Time-Locked Savings
        uint16 billsBps;            // e.g. 1000 = 10% Auto-Pay Bills
        uint256 lockDurationSeconds;// e.g. 30 days in UNIX seconds (2592000)
        uint256 maxSafeWithdraw;    // Max single withdrawal before triggering Auto-Escape
        uint256 cooldownSeconds;    // Min UNIX seconds between withdrawals
        address billsAddress;       // Destination wallet for automatic bill payments
        address safeBackupWallet;   // Destination wallet for 1s Auto-Escape / Panic Button
        bool isConfigured;          // True once the user saves their rules
        bool isFrozen;              // True after Auto-Escape or Panic Button evacuates funds
    }

    /**
     * @notice User's isolated smart pocket balances & timestamp trackers
     */
    struct PocketBalances {
        uint256 unallocatedBalance;     // Newly deposited salary awaiting ~1s Reactive split
        uint256 lockedSavings;          // 20% Time-Locked Savings balance
        uint256 spendingBalance;        // 70% Daily Spending balance
        uint256 totalBillsPaid;         // Cumulative 10% bills auto-transferred
        uint256 totalEvacuated;         // Total funds evacuated to safeBackupWallet
        uint256 savingsUnlockTimestamp; // UNIX timestamp (block.timestamp) when savings unlock
        uint256 lastWithdrawTimestamp;  // UNIX timestamp (block.timestamp) of last withdrawal
    }

    // ==================== ORIGIN EVENTS (Caught by Reactive Omni in ~1s) ====================

    /// @notice Loop 1 Origin Event: Emitted when salary/income enters the vault
    event SalaryReceived(
        address indexed user,
        uint256 amount,
        uint256 timestamp
    );

    /// @notice Loop 2 Origin Event: Emitted when an anomalous withdrawal or hack attempt occurs
    event SuspiciousActivityDetected(
        address indexed user,
        uint256 attemptedAmount,
        uint256 timestamp,
        string reason
    );

    /// @notice Loop 3 Origin Event: Emitted when user clicks the 1-Click Panic Button on dashboard
    event PanicButtonPressed(
        address indexed user,
        uint256 totalBalanceAtRisk,
        uint256 timestamp
    );

    // ==================== CALLBACK EXECUTION EVENTS ====================

    /// @notice Emitted when Reactive Omni callback splits salary into Locked Savings, Bills & Spending
    event SalarySplitCompleted(
        address indexed user,
        uint256 lockedSavingsAmount,
        uint256 billsPaidAmount,
        uint256 spendingAmount,
        uint256 savingsUnlockTimestamp,
        uint256 timestamp
    );

    /// @notice Emitted when Reactive Omni callback evacuates 100% of funds to safeBackupWallet
    event AutoEscapeExecuted(
        address indexed user,
        address indexed safeBackupWallet,
        uint256 totalEvacuatedAmount,
        string triggerReason,
        uint256 timestamp
    );

    /// @notice Emitted when user configures their Set-and-Forget rules
    event RulesConfigured(
        address indexed user,
        uint16 savingsBps,
        uint16 billsBps,
        uint256 lockDurationSeconds,
        uint256 maxSafeWithdraw,
        address billsAddress,
        address safeBackupWallet,
        uint256 timestamp
    );
}
