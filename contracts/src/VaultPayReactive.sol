// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IReactive, ISystemContract} from "./interfaces/IVaultPay.sol";

/**
 * @title VaultPayReactive
 * @notice Autonomous Brain Contract deployed on Reactive Omni / Lasna Testnet (Chain ID: 5318007).
 * @dev Listens 24/7 with ~1s CometBFT finality to `VaultPayCore` on Base Sepolia (Chain ID: 84532)
 *      for 3 events:
 *      1. `SalaryReceived(address,uint256,uint256)`
 *         -> Dispatches `executeSalarySplit(address,address,uint256)` callback.
 *      2. `SuspiciousActivityDetected(address,uint256,uint256,string)`
 *         -> Dispatches `executeAutoEscape(address,address,string)` callback ("AUTO_HACK_DEFENSE").
 *      3. `PanicButtonPressed(address,uint256,uint256)`
 *         -> Dispatches `executeAutoEscape(address,address,string)` callback ("USER_PANIC_BUTTON").
 */
contract VaultPayReactive is IReactive {
    uint256 public constant BASE_SEPOLIA_CHAIN_ID = 84532;
    uint256 public constant REACTIVE_IGNORE =
        0xa65f96fc951c35ead38878e0f0b7a3c744a6f5ccc1476b313353ce31712313ad;
    uint64 public constant CALLBACK_GAS_LIMIT = 400_000;

    ISystemContract public constant SYSTEM =
        ISystemContract(payable(0x0000000000000000000000000000000000fffFfF));

    /// @notice Event Topic0 signatures on Base Sepolia
    uint256 public constant SALARY_RECEIVED_TOPIC_0 =
        uint256(keccak256("SalaryReceived(address,uint256,uint256)"));
    uint256 public constant SUSPICIOUS_ACTIVITY_TOPIC_0 =
        uint256(keccak256("SuspiciousActivityDetected(address,uint256,uint256,string)"));
    uint256 public constant PANIC_BUTTON_TOPIC_0 =
        uint256(keccak256("PanicButtonPressed(address,uint256,uint256)"));

    address public immutable vaultPayCore;
    bool public immutable isVm;

    uint256 public totalSplitsDispatched;
    uint256 public totalEscapesDispatched;

    event ReactiveDecisionDispatched(
        uint256 indexed originTopic0,
        address indexed user,
        string action,
        uint256 originTimestamp
    );

    constructor(address _vaultPayCore) payable {
        vaultPayCore = _vaultPayCore;

        // Detect whether running on Reactive Network or inside RVM sandbox
        uint256 size;
        assembly {
            size := extcodesize(0x0000000000000000000000000000000000fffFfF)
        }
        isVm = (size == 0);

        if (!isVm) {
            // Subscribe to Loop 1: SalaryReceived
            SYSTEM.subscribe(
                BASE_SEPOLIA_CHAIN_ID,
                _vaultPayCore,
                SALARY_RECEIVED_TOPIC_0,
                REACTIVE_IGNORE,
                REACTIVE_IGNORE,
                REACTIVE_IGNORE
            );

            // Subscribe to Loop 2: SuspiciousActivityDetected
            SYSTEM.subscribe(
                BASE_SEPOLIA_CHAIN_ID,
                _vaultPayCore,
                SUSPICIOUS_ACTIVITY_TOPIC_0,
                REACTIVE_IGNORE,
                REACTIVE_IGNORE,
                REACTIVE_IGNORE
            );

            // Subscribe to Loop 3: PanicButtonPressed
            SYSTEM.subscribe(
                BASE_SEPOLIA_CHAIN_ID,
                _vaultPayCore,
                PANIC_BUTTON_TOPIC_0,
                REACTIVE_IGNORE,
                REACTIVE_IGNORE,
                REACTIVE_IGNORE
            );
        }
    }

    /**
     * @notice Invoked automatically by Reactive Omni within ~1s when a subscribed log is emitted on Base Sepolia.
     */
    function react(LogRecord calldata log_) external override {
        if (log_.chain_id != BASE_SEPOLIA_CHAIN_ID) return;
        if (log_._contract != vaultPayCore) return;

        address user = address(uint160(log_.topic_1));

        // ---------------------------------------------------------------------
        // LOOP 1: SalaryReceived -> executeSalarySplit(rvmId, user, amount)
        // ---------------------------------------------------------------------
        if (log_.topic_0 == SALARY_RECEIVED_TOPIC_0) {
            (uint256 amount, uint256 originTimestamp) = abi.decode(
                log_.data,
                (uint256, uint256)
            );

            bytes memory payload = abi.encodeWithSignature(
                "executeSalarySplit(address,address,uint256)",
                address(0),
                user,
                amount
            );

            totalSplitsDispatched++;
            _dispatchCallback(payload);

            emit ReactiveDecisionDispatched(
                SALARY_RECEIVED_TOPIC_0,
                user,
                "EXECUTE_SALARY_SPLIT",
                originTimestamp
            );
        }
        // ---------------------------------------------------------------------
        // LOOP 2: SuspiciousActivityDetected -> executeAutoEscape(rvmId, user, "AUTO_HACK_DEFENSE")
        // ---------------------------------------------------------------------
        else if (log_.topic_0 == SUSPICIOUS_ACTIVITY_TOPIC_0) {
            (, uint256 originTimestamp, ) = abi.decode(
                log_.data,
                (uint256, uint256, string)
            );

            bytes memory payload = abi.encodeWithSignature(
                "executeAutoEscape(address,address,string)",
                address(0),
                user,
                "AUTO_HACK_DEFENSE"
            );

            totalEscapesDispatched++;
            _dispatchCallback(payload);

            emit ReactiveDecisionDispatched(
                SUSPICIOUS_ACTIVITY_TOPIC_0,
                user,
                "AUTO_HACK_DEFENSE",
                originTimestamp
            );
        }
        // ---------------------------------------------------------------------
        // LOOP 3: PanicButtonPressed -> executeAutoEscape(rvmId, user, "USER_PANIC_BUTTON")
        // ---------------------------------------------------------------------
        else if (log_.topic_0 == PANIC_BUTTON_TOPIC_0) {
            (, uint256 originTimestamp) = abi.decode(
                log_.data,
                (uint256, uint256)
            );

            bytes memory payload = abi.encodeWithSignature(
                "executeAutoEscape(address,address,string)",
                address(0),
                user,
                "USER_PANIC_BUTTON"
            );

            totalEscapesDispatched++;
            _dispatchCallback(payload);

            emit ReactiveDecisionDispatched(
                PANIC_BUTTON_TOPIC_0,
                user,
                "USER_PANIC_BUTTON",
                originTimestamp
            );
        }
    }

    /**
     * @dev Emits the standard Reactive `Callback` event and calls `SYSTEM.requestCallbackV_1_0`
     *      when System Contract code is present.
     */
    function _dispatchCallback(bytes memory payload) internal {
        emit Callback(
            BASE_SEPOLIA_CHAIN_ID,
            vaultPayCore,
            CALLBACK_GAS_LIMIT,
            payload
        );

        if (!isVm) {
            try
                SYSTEM.requestCallbackV_1_0(
                    BASE_SEPOLIA_CHAIN_ID,
                    vaultPayCore,
                    CALLBACK_GAS_LIMIT,
                    payload
                )
            {} catch {}
        }
    }

    receive() external payable {}
}
