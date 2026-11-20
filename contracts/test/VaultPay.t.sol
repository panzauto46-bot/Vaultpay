// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {VaultPayCore} from "../src/VaultPayCore.sol";
import {VaultPayReactive} from "../src/VaultPayReactive.sol";
import {IReactive} from "../src/interfaces/IVaultPay.sol";

interface Vm {
    function warp(uint256 newTimestamp) external;
    function deal(address who, uint256 newBalance) external;
    function prank(address msgSender) external;
}

/**
 * @title VaultPayTest
 * @notice Comprehensive End-to-End Foundry Unit Test Suite for VaultPay:
 *         - Loop 1: Salary Auto-Split (20% Time-Locked Savings via block.timestamp, 10% Bills, 70% Spending)
 *         - Loop 2: 1-Second Auto-Escape Defense on Hack (Overrides lock & sweeps 100% to Safe Backup Wallet)
 *         - Loop 3: 1-Click Emergency Panic Button Evacuation
 *         - Base Sepolia 200ms Block Rule Compliance (`block.timestamp` verification)
 */
contract VaultPayTest {
    Vm constant vm = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));

    VaultPayCore public core;
    VaultPayReactive public reactiveBrain;

    address public callbackProxy = address(0xa6eA49Ed671B8a4dfCDd34E36b7a75Ac79B8A5a6);
    address public user = address(0x1111);
    address public billsWallet = address(0x2222);
    address public safeBackupWallet = address(0x9999);

    function setUp() public {
        vm.warp(1_700_000_000); // Initial UNIX timestamp
        core = new VaultPayCore(callbackProxy);
        reactiveBrain = new VaultPayReactive(address(core));

        vm.deal(user, 10 ether);

        // Configure "Set It and Forget It" rule once
        vm.prank(user);
        core.configureRules(
            2000,             // 20% Time-Locked Savings
            1000,             // 10% Auto-Pay Bills
            30 days,          // 30 days lock duration (UNIX seconds)
            0.3 ether,        // 0.3 ETH maxSafeWithdraw
            60,               // 60 seconds cooldown
            billsWallet,      // Bills recipient
            safeBackupWallet  // Safe backup wallet
        );
    }

    /// @notice Test Loop 1: Salary enters -> Reactive Omni catches event -> Callback splits 20/10/70
    function test_Loop1_AutonomousSalarySplitAndLockedSavings() public {
        uint256 salary = 1.0 ether;
        uint256 billsBefore = billsWallet.balance;

        // 1. Origin Tx: User receives 1.0 ETH salary on Base Sepolia
        vm.prank(user);
        core.depositSalary{value: salary}();

        // 2. Reactive Omni Brain processes LogRecord in ~1s
        IReactive.LogRecord memory log = IReactive.LogRecord({
            chain_id: 84532,
            _contract: address(core),
            topic_0: reactiveBrain.SALARY_RECEIVED_TOPIC_0(),
            topic_1: uint256(uint160(user)),
            topic_2: 0,
            topic_3: 0,
            data: abi.encode(salary, block.timestamp),
            block_number: 100,
            op_code: 0,
            block_hash: 0,
            tx_hash: 0,
            log_index: 0
        });
        reactiveBrain.react(log);
        require(reactiveBrain.totalSplitsDispatched() == 1, "Reactive split not dispatched");

        // 3. Callback Proxy executes executeSalarySplit on Base Sepolia
        vm.prank(callbackProxy);
        core.executeSalarySplit(address(reactiveBrain), user, salary);

        (
            uint256 totalBal,
            uint256 lockedSav,
            uint256 spendingBal,
            uint256 totalBills,
            uint256 unlockTime,
            uint256 secondsLeft,
            ,
            bool isFrozen
        ) = core.getVaultSummary(user);

        require(lockedSav == 0.2 ether, "20% should be in Locked Savings");
        require(spendingBal == 0.7 ether, "70% should be in Spending Balance");
        require(totalBills == 0.1 ether, "10% should be recorded as Bills Paid");
        require(billsWallet.balance == billsBefore + 0.1 ether, "10% bills transferred directly");
        require(totalBal == 0.9 ether, "Remaining vault balance should be 0.9 ETH");
        require(unlockTime == block.timestamp + 30 days, "Unlock timestamp must use block.timestamp");
        require(secondsLeft == 30 days, "Seconds until unlock must match 30 days");
        require(!isFrozen, "Vault should not be frozen");
    }

    /// @notice Test Loop 2: Suspicious withdrawal / Hack -> 100% funds escape to Safe Backup Wallet in ~1s
    function test_Loop2_WalletHackedAutoEscapeIn1Second() public {
        // First fund & split 1.0 ETH salary
        vm.prank(user);
        core.depositSalary{value: 1.0 ether}();
        vm.prank(callbackProxy);
        core.executeSalarySplit(address(reactiveBrain), user, 1.0 ether);

        uint256 safeBefore = safeBackupWallet.balance;

        // 1. Hacker/compromised key tries to drain 0.6 ETH (exceeds 0.3 ETH maxSafeWithdraw!)
        vm.prank(user);
        core.withdrawSpending(0.6 ether);

        // Verify the anomalous withdrawal was blocked (funds still in vault)
        (, uint256 lockedBeforeEscape, uint256 spendingBeforeEscape, , , , , ) = core
            .getVaultSummary(user);
        require(spendingBeforeEscape == 0.7 ether, "Anomalous withdrawal must be blocked");
        require(lockedBeforeEscape == 0.2 ether, "Locked savings still intact");

        // 2. Reactive Omni detects SuspiciousActivityDetected in ~1s
        IReactive.LogRecord memory hackLog = IReactive.LogRecord({
            chain_id: 84532,
            _contract: address(core),
            topic_0: reactiveBrain.SUSPICIOUS_ACTIVITY_TOPIC_0(),
            topic_1: uint256(uint160(user)),
            topic_2: 0,
            topic_3: 0,
            data: abi.encode(uint256(0.6 ether), block.timestamp, "EXCEEDS_MAX_SAFE_WITHDRAW"),
            block_number: 105,
            op_code: 0,
            block_hash: 0,
            tx_hash: 0,
            log_index: 0
        });
        reactiveBrain.react(hackLog);
        require(reactiveBrain.totalEscapesDispatched() == 1, "Reactive escape not dispatched");

        // 3. Callback Proxy executes executeAutoEscape -> Overrides lock & evacuates 100% (0.9 ETH)
        vm.prank(callbackProxy);
        core.executeAutoEscape(address(reactiveBrain), user, "AUTO_HACK_DEFENSE");

        (
            uint256 totalAfter,
            uint256 lockedAfter,
            uint256 spendingAfter,
            ,
            ,
            ,
            ,
            bool isFrozen
        ) = core.getVaultSummary(user);

        require(totalAfter == 0 && lockedAfter == 0 && spendingAfter == 0, "Vault must be 100% emptied");
        require(isFrozen, "Compromised vault must be frozen");
        require(
            safeBackupWallet.balance == safeBefore + 0.9 ether,
            "100% of funds (including locked savings) must escape to safeBackupWallet"
        );
    }

    /// @notice Test Loop 3: 1-Click Emergency Panic Button evacuates all funds & locked savings
    function test_Loop3_OneClickEmergencyPanicButton() public {
        vm.prank(user);
        core.depositSalary{value: 2.0 ether}();
        vm.prank(callbackProxy);
        core.executeSalarySplit(address(reactiveBrain), user, 2.0 ether);

        uint256 safeBefore = safeBackupWallet.balance;

        // 1. User clicks red 1-Click Panic Button on dashboard
        vm.prank(user);
        core.triggerPanicButton();

        // 2. Reactive Omni catches PanicButtonPressed in ~1s
        IReactive.LogRecord memory panicLog = IReactive.LogRecord({
            chain_id: 84532,
            _contract: address(core),
            topic_0: reactiveBrain.PANIC_BUTTON_TOPIC_0(),
            topic_1: uint256(uint160(user)),
            topic_2: 0,
            topic_3: 0,
            data: abi.encode(uint256(1.8 ether), block.timestamp),
            block_number: 110,
            op_code: 0,
            block_hash: 0,
            tx_hash: 0,
            log_index: 0
        });
        reactiveBrain.react(panicLog);

        // 3. Callback Proxy executes executeAutoEscape
        vm.prank(callbackProxy);
        core.executeAutoEscape(address(reactiveBrain), user, "USER_PANIC_BUTTON");

        require(
            safeBackupWallet.balance == safeBefore + 1.8 ether,
            "100% of remaining 1.8 ETH must be evacuated on Panic Button click"
        );
    }

    /// @notice Test Base Sepolia 200ms Block Rule: block.timestamp time-lock enforcement
    function test_BlockTimestampSavingsLockEnforcement() public {
        vm.prank(user);
        core.depositSalary{value: 1.0 ether}();
        vm.prank(callbackProxy);
        core.executeSalarySplit(address(reactiveBrain), user, 1.0 ether);

        // Attempt early withdrawal of locked savings before 30 days -> Blocked & flagged!
        vm.prank(user);
        core.withdrawLockedSavings(0.1 ether);
        (, uint256 lockedStillIntact, , , , , , ) = core.getVaultSummary(user);
        require(lockedStillIntact == 0.2 ether, "Early locked savings withdrawal must be blocked");

        // Warp block.timestamp forward by 30 days + 1 second
        vm.warp(block.timestamp + 30 days + 1);

        uint256 userBefore = user.balance;
        vm.prank(user);
        core.withdrawLockedSavings(0.2 ether);

        (, uint256 lockedAfterUnlock, , , , , , ) = core.getVaultSummary(user);
        require(lockedAfterUnlock == 0, "Unlocked savings should be withdrawable after block.timestamp expiry");
        require(user.balance == userBefore + 0.2 ether, "User received unlocked savings");
    }
}
