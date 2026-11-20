// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IVaultPay} from "./interfaces/IVaultPay.sol";

/**
 * @title VaultPayCore
 * @notice Origin & Callback Destination Contract deployed on Base Sepolia (Chain ID: 84532).
 * @dev Implements VaultPay's 3 autonomous Reactive Omni loops:
 *      1. Gaji Masuk -> Otomatis Terbagi (20% Tabungan Terkunci, 10% Bayar Tagihan, 70% Belanja)
 *      2. Dompet Kena Hack -> Uang Kabur Sendiri dalam ~1 Detik ke Dompet Cadangan Aman
 *      3. Tombol Panik 1-Klik -> Evakuasi Darurat 100% Saldo ke Dompet Cadangan Aman
 *
 *      GROUND RULES COMPLIANCE (Base Sepolia 200ms Block Time):
 *      All time locks, cooldowns, and activity windows strictly use `block.timestamp`
 *      (UNIX seconds) and NEVER `block.number`.
 */
contract VaultPayCore is IVaultPay {
    /// @notice Base Sepolia Callback Proxy: 0xa6eA49Ed671B8a4dfCDd34E36b7a75Ac79B8A5a6
    address public immutable callbackProxy;
    address public immutable owner;

    uint16 public constant MAX_BPS = 10_000;
    uint16 public constant DEFAULT_SAVINGS_BPS = 2_000; // 20%
    uint16 public constant DEFAULT_BILLS_BPS = 1_000;   // 10%
    uint256 public constant DEFAULT_LOCK_SECONDS = 30 days; // 2,592,000 UNIX seconds

    mapping(address => UserRule) public rules;
    mapping(address => PocketBalances) public pockets;

    error OnlyCallbackProxyOrOwner();
    error InvalidBpsConfiguration();
    error InvalidBackupWallet();
    error VaultIsFrozen();
    error ZeroAmount();
    error InsufficientSpendingBalance();
    error TransferFailed();

    modifier onlyCallback() {
        if (msg.sender != callbackProxy && msg.sender != owner) {
            revert OnlyCallbackProxyOrOwner();
        }
        _;
    }

    constructor(address _callbackProxy) {
        callbackProxy = _callbackProxy;
        owner = msg.sender;
    }

    // =========================================================================
    // 1. SET IT AND FORGET IT: ONE-TIME RULE CONFIGURATION
    // =========================================================================

    /**
     * @notice Configure autonomous salary splitting, savings time-lock, and anti-hack backup wallet once.
     * @param savingsBps Basis points for Time-Locked Savings (e.g., 2000 = 20%)
     * @param billsBps Basis points for Auto-Pay Bills (e.g., 1000 = 10%)
     * @param lockDurationSeconds Duration in UNIX seconds to lock savings (uses block.timestamp)
     * @param maxSafeWithdraw Maximum single spending withdrawal before triggering Auto-Escape
     * @param cooldownSeconds Minimum UNIX seconds between spending withdrawals
     * @param billsAddress Recipient wallet for automatic bill payments
     * @param safeBackupWallet Safe backup wallet where 100% of funds escape on hack/panic
     */
    function configureRules(
        uint16 savingsBps,
        uint16 billsBps,
        uint256 lockDurationSeconds,
        uint256 maxSafeWithdraw,
        uint256 cooldownSeconds,
        address billsAddress,
        address safeBackupWallet
    ) external {
        if (savingsBps + billsBps > MAX_BPS) revert InvalidBpsConfiguration();
        if (safeBackupWallet == address(0)) revert InvalidBackupWallet();

        UserRule storage rule = rules[msg.sender];
        rule.savingsBps = savingsBps;
        rule.billsBps = billsBps;
        rule.lockDurationSeconds = lockDurationSeconds > 0
            ? lockDurationSeconds
            : DEFAULT_LOCK_SECONDS;
        rule.maxSafeWithdraw = maxSafeWithdraw;
        rule.cooldownSeconds = cooldownSeconds;
        rule.billsAddress = billsAddress != address(0) ? billsAddress : msg.sender;
        rule.safeBackupWallet = safeBackupWallet;
        rule.isConfigured = true;
        rule.isFrozen = false;

        emit RulesConfigured(
            msg.sender,
            savingsBps,
            billsBps,
            rule.lockDurationSeconds,
            maxSafeWithdraw,
            rule.billsAddress,
            safeBackupWallet,
            block.timestamp
        );
    }

    // =========================================================================
    // 2. LOOP 1: SALARY IN -> AUTO-SPLIT, TIME-LOCKED SAVINGS & AUTO-PAY BILLS
    // =========================================================================

    /**
     * @notice Deposit salary/income into VaultPay. Emits `SalaryReceived` which Reactive Omni
     *         catches in ~1 second to trigger `executeSalarySplit`.
     */
    function depositSalary() public payable {
        if (msg.value == 0) revert ZeroAmount();
        if (rules[msg.sender].isFrozen) revert VaultIsFrozen();

        // Auto-initialize sensible default 20/10/70 rules if user deposits before configuring
        if (!rules[msg.sender].isConfigured) {
            rules[msg.sender] = UserRule({
                savingsBps: DEFAULT_SAVINGS_BPS,
                billsBps: DEFAULT_BILLS_BPS,
                lockDurationSeconds: DEFAULT_LOCK_SECONDS,
                maxSafeWithdraw: 0.3 ether,
                cooldownSeconds: 60,
                billsAddress: msg.sender,
                safeBackupWallet: msg.sender,
                isConfigured: true,
                isFrozen: false
            });
        }

        pockets[msg.sender].unallocatedBalance += msg.value;

        emit SalaryReceived(msg.sender, msg.value, block.timestamp);
    }

    receive() external payable {
        depositSalary();
    }

    /**
     * @notice Callback executed by Reactive Omni (~1s after `SalaryReceived`).
     *         Locks 20% in Time-Locked Savings (via block.timestamp), transfers 10% directly
     *         to billsAddress, and credits 70% to Spending Balance.
     * @param rvmId Reactive VM ID injected by Callback Proxy
     * @param user Vault owner whose salary is being split
     * @param amount Amount of salary to split
     */
    function executeSalarySplit(
        address rvmId,
        address user,
        uint256 amount
    ) external onlyCallback {
        rvmId; // silence unused warning
        UserRule memory rule = rules[user];
        PocketBalances storage pocket = pockets[user];

        uint256 splitTarget = pocket.unallocatedBalance >= amount
            ? amount
            : pocket.unallocatedBalance;
        if (splitTarget == 0) return;

        pocket.unallocatedBalance -= splitTarget;

        uint16 savBps = rule.isConfigured ? rule.savingsBps : DEFAULT_SAVINGS_BPS;
        uint16 bilBps = rule.isConfigured ? rule.billsBps : DEFAULT_BILLS_BPS;

        uint256 savingsAmount = (splitTarget * savBps) / MAX_BPS;
        uint256 billsAmount = (splitTarget * bilBps) / MAX_BPS;
        uint256 spendingAmount = splitTarget - savingsAmount - billsAmount;

        // 1. Lock 20% in Time-Locked Savings strictly using block.timestamp (200ms block rule)
        pocket.lockedSavings += savingsAmount;
        uint256 newUnlockTime = block.timestamp +
            (rule.lockDurationSeconds > 0 ? rule.lockDurationSeconds : DEFAULT_LOCK_SECONDS);
        if (newUnlockTime > pocket.savingsUnlockTimestamp) {
            pocket.savingsUnlockTimestamp = newUnlockTime;
        }

        // 2. Credit 70% to Daily Spending Balance
        pocket.spendingBalance += spendingAmount;

        // 3. Auto-Pay 10% Bills directly to billsAddress
        address billTarget = rule.billsAddress != address(0) ? rule.billsAddress : user;
        if (billsAmount > 0) {
            pocket.totalBillsPaid += billsAmount;
            (bool sent, ) = payable(billTarget).call{value: billsAmount}("");
            if (!sent) revert TransferFailed();
        }

        emit SalarySplitCompleted(
            user,
            savingsAmount,
            billsAmount,
            spendingAmount,
            pocket.savingsUnlockTimestamp,
            block.timestamp
        );
    }

    // =========================================================================
    // 3. LOOP 2: WALLET HACKED -> YOUR MONEY ESCAPES ON ITS OWN (~1s)
    // =========================================================================

    /**
     * @notice Withdraw from daily spending balance.
     *         If the withdrawal exceeds `maxSafeWithdraw` or violates the `block.timestamp`
     *         cooldown window, the withdrawal is blocked and `SuspiciousActivityDetected`
     *         is emitted so Reactive Omni evacuates 100% of funds in ~1s!
     */
    function withdrawSpending(uint256 amount) external {
        if (amount == 0) revert ZeroAmount();
        UserRule memory rule = rules[msg.sender];
        if (rule.isFrozen) revert VaultIsFrozen();

        PocketBalances storage pocket = pockets[msg.sender];

        // Check 1: Exceeds maxSafeWithdraw threshold
        if (rule.maxSafeWithdraw > 0 && amount > rule.maxSafeWithdraw) {
            emit SuspiciousActivityDetected(
                msg.sender,
                amount,
                block.timestamp,
                "EXCEEDS_MAX_SAFE_WITHDRAW"
            );
            return;
        }

        // Check 2: Rapid consecutive drain attempt within block.timestamp cooldown window
        if (
            rule.cooldownSeconds > 0 &&
            pocket.lastWithdrawTimestamp > 0 &&
            block.timestamp < pocket.lastWithdrawTimestamp + rule.cooldownSeconds
        ) {
            emit SuspiciousActivityDetected(
                msg.sender,
                amount,
                block.timestamp,
                "RAPID_DRAIN_COOLDOWN_VIOLATION"
            );
            return;
        }

        if (pocket.spendingBalance < amount) revert InsufficientSpendingBalance();

        pocket.spendingBalance -= amount;
        pocket.lastWithdrawTimestamp = block.timestamp;

        (bool sent, ) = payable(msg.sender).call{value: amount}("");
        if (!sent) revert TransferFailed();
    }

    /**
     * @notice Withdraw from 20% Locked Savings after `savingsUnlockTimestamp`.
     *         If someone tries to pull locked savings before `block.timestamp >= savingsUnlockTimestamp`,
     *         it emits `SuspiciousActivityDetected` to trigger Reactive Omni Auto-Escape!
     */
    function withdrawLockedSavings(uint256 amount) external {
        if (amount == 0) revert ZeroAmount();
        UserRule memory rule = rules[msg.sender];
        if (rule.isFrozen) revert VaultIsFrozen();

        PocketBalances storage pocket = pockets[msg.sender];

        // Strictly check time-lock using block.timestamp
        if (block.timestamp < pocket.savingsUnlockTimestamp) {
            emit SuspiciousActivityDetected(
                msg.sender,
                amount,
                block.timestamp,
                "UNAUTHORIZED_LOCKED_SAVINGS_BREACH"
            );
            return;
        }

        if (pocket.lockedSavings < amount) revert InsufficientSpendingBalance();

        pocket.lockedSavings -= amount;
        pocket.lastWithdrawTimestamp = block.timestamp;

        (bool sent, ) = payable(msg.sender).call{value: amount}("");
        if (!sent) revert TransferFailed();
    }

    /**
     * @notice 1-Click Judge Demo Helper: Simulates a hack/exploit attempt on Base Sepolia
     *         so judges can watch Reactive Omni evacuate the vault in ~1 second.
     */
    function simulateHackAttempt(uint256 attemptedAmount) external {
        emit SuspiciousActivityDetected(
            msg.sender,
            attemptedAmount > 0 ? attemptedAmount : 1 ether,
            block.timestamp,
            "SIMULATED_HACK_ATTEMPT"
        );
    }

    // =========================================================================
    // 4. LOOP 3: 1-CLICK EMERGENCY PANIC BUTTON
    // =========================================================================

    /**
     * @notice 1-Click Emergency Panic Button on the VaultPay Web Dashboard.
     *         Emits `PanicButtonPressed`, prompting Reactive Omni to fire `executeAutoEscape`
     *         and move 100% of funds (including locked savings) to `safeBackupWallet`.
     */
    function triggerPanicButton() external {
        PocketBalances memory pocket = pockets[msg.sender];
        uint256 totalAtRisk = pocket.unallocatedBalance +
            pocket.lockedSavings +
            pocket.spendingBalance;

        emit PanicButtonPressed(msg.sender, totalAtRisk, block.timestamp);
    }

    /**
     * @notice Callback executed by Reactive Omni (~1s after `SuspiciousActivityDetected` or `PanicButtonPressed`).
     *         Overrides the savings time-lock, sweeps 100% of user funds (Locked Savings + Spending + Unallocated)
     *         to `safeBackupWallet`, and freezes the compromised vault.
     * @param rvmId Reactive VM ID injected by Callback Proxy
     * @param user Vault owner whose funds are being evacuated
     * @param reason Reason code ("AUTO_HACK_DEFENSE" or "USER_PANIC_BUTTON")
     */
    function executeAutoEscape(
        address rvmId,
        address user,
        string calldata reason
    ) external onlyCallback {
        rvmId; // silence unused warning
        UserRule storage rule = rules[user];
        PocketBalances storage pocket = pockets[user];

        uint256 totalToEvacuate = pocket.unallocatedBalance +
            pocket.lockedSavings +
            pocket.spendingBalance;

        // Zero out all balances before external transfer (CEI pattern)
        pocket.unallocatedBalance = 0;
        pocket.lockedSavings = 0;
        pocket.spendingBalance = 0;
        pocket.savingsUnlockTimestamp = 0;
        pocket.totalEvacuated += totalToEvacuate;

        // Freeze old vault
        rule.isFrozen = true;

        address safeTarget = rule.safeBackupWallet != address(0)
            ? rule.safeBackupWallet
            : user;

        if (totalToEvacuate > 0) {
            (bool sent, ) = payable(safeTarget).call{value: totalToEvacuate}("");
            if (!sent) revert TransferFailed();
        }

        emit AutoEscapeExecuted(
            user,
            safeTarget,
            totalToEvacuate,
            reason,
            block.timestamp
        );
    }

    // =========================================================================
    // 5. VIEW HELPERS FOR WEB DASHBOARD
    // =========================================================================

    function getVaultSummary(
        address user
    )
        external
        view
        returns (
            uint256 totalBalance,
            uint256 lockedSavings,
            uint256 spendingBalance,
            uint256 totalBillsPaid,
            uint256 savingsUnlockTimestamp,
            uint256 secondsUntilUnlock,
            address safeBackupWallet,
            bool isFrozen
        )
    {
        PocketBalances memory p = pockets[user];
        UserRule memory r = rules[user];

        totalBalance = p.unallocatedBalance + p.lockedSavings + p.spendingBalance;
        lockedSavings = p.lockedSavings;
        spendingBalance = p.spendingBalance;
        totalBillsPaid = p.totalBillsPaid;
        savingsUnlockTimestamp = p.savingsUnlockTimestamp;
        secondsUntilUnlock = p.savingsUnlockTimestamp > block.timestamp
            ? p.savingsUnlockTimestamp - block.timestamp
            : 0;
        safeBackupWallet = r.safeBackupWallet;
        isFrozen = r.isFrozen;
    }
}
