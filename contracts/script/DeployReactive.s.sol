// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {VaultPayReactive} from "../src/VaultPayReactive.sol";

interface Vm {
    function envUint(string calldata name) external view returns (uint256);
    function envAddress(string calldata name) external view returns (address);
    function startBroadcast(uint256 privateKey) external;
    function stopBroadcast() external;
}

/**
 * @title DeployReactive
 * @notice Deploys `VaultPayReactive.sol` to Reactive Omni / Lasna Testnet (Chain ID: 5318007).
 * @dev Usage:
 *      forge script script/DeployReactive.s.sol:DeployReactive --rpc-url $REACTIVE_OMNI_RPC_URL --broadcast
 */
contract DeployReactive {
    Vm constant vm = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));

    function run() external returns (VaultPayReactive deployedReactive) {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address vaultPayCoreAddress = vm.envAddress("VAULTPAY_CORE_ADDRESS");

        vm.startBroadcast(deployerPrivateKey);
        deployedReactive = new VaultPayReactive{value: 0.05 ether}(
            vaultPayCoreAddress
        );
        vm.stopBroadcast();
    }
}
