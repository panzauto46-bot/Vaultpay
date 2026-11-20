// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {VaultPayCore} from "../src/VaultPayCore.sol";

interface Vm {
    function envUint(string calldata name) external view returns (uint256);
    function envAddress(string calldata name) external view returns (address);
    function envOr(string calldata name, address defaultValue) external view returns (address);
    function addr(uint256 privateKey) external pure returns (address);
    function startBroadcast(uint256 privateKey) external;
    function stopBroadcast() external;
}

/**
 * @title RunFullDemoProof
 * @notice Triggers VaultPay's 3 core scenarios on Base Sepolia (84532) to generate
 *         on-chain Origin Tx -> Reactive Omni Tx -> Callback Tx hashes for DoraHacks submission:
 *         1. Configure Rules + Deposit Salary (Loop 1: Auto-Split & 20% Time-Locked Savings)
 *         2. Simulate Hack Attempt (Loop 2: 1s Auto-Escape to Safe Backup Wallet)
 *         3. Trigger 1-Click Emergency Panic Button (Loop 3: Instant Evacuation)
 */
contract RunFullDemoProof {
    Vm constant vm = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));

    function run() external {
        uint256 userPrivateKey = vm.envUint("PRIVATE_KEY");
        address userAddr = vm.addr(userPrivateKey);
        address coreAddr = vm.envAddress("VAULTPAY_CORE_ADDRESS");
        address safeBackup = vm.envOr("SAFE_BACKUP_WALLET", userAddr);
        address billsRecipient = vm.envOr("BILLS_WALLET", userAddr);

        VaultPayCore core = VaultPayCore(payable(coreAddr));

        vm.startBroadcast(userPrivateKey);

        // 1. Set It & Forget It: Configure 20% Locked Savings (30 days via block.timestamp),
        //    10% Auto-Pay Bills, 70% Spending, 0.3 ETH Max Safe Withdraw, 60s Cooldown
        core.configureRules(
            2000,           // 20% Locked Savings
            1000,           // 10% Auto-Pay Bills
            30 days,        // 30 days lock in UNIX seconds (block.timestamp)
            0.3 ether,      // Max safe single withdrawal
            60,             // 60 seconds cooldown
            billsRecipient, // Bills wallet
            safeBackup      // Safe backup wallet
        );

        // 2. Trigger Loop 1: Deposit Salary -> Emits SalaryReceived -> Reactive Omni splits in ~1s
        core.depositSalary{value: 0.01 ether}();

        // 3. Trigger Loop 2: Simulate Hack Attempt -> Emits SuspiciousActivityDetected -> Auto-Escape in ~1s
        core.simulateHackAttempt(0.8 ether);

        // 4. Trigger Loop 3: 1-Click Emergency Panic Button -> Emits PanicButtonPressed
        core.triggerPanicButton();

        vm.stopBroadcast();
    }
}
