// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {VaultPayCore} from "../src/VaultPayCore.sol";

interface Vm {
    function envUint(string calldata name) external view returns (uint256);
    function envOr(string calldata name, address defaultValue) external view returns (address);
    function startBroadcast(uint256 privateKey) external;
    function stopBroadcast() external;
}

/**
 * @title DeployBase
 * @notice Deploys `VaultPayCore.sol` to Base Sepolia Testnet (Chain ID: 84532).
 * @dev Usage:
 *      forge script script/DeployBase.s.sol:DeployBase --rpc-url $BASE_SEPOLIA_RPC_URL --broadcast
 */
contract DeployBase {
    Vm constant vm = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));

    /// @notice Official Reactive Callback Proxy on Base Sepolia
    address public constant BASE_SEPOLIA_CALLBACK_PROXY =
        0xa6eA49Ed671B8a4dfCDd34E36b7a75Ac79B8A5a6;

    function run() external returns (VaultPayCore deployedCore) {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address callbackProxy = vm.envOr(
            "BASE_SEPOLIA_CALLBACK_PROXY",
            BASE_SEPOLIA_CALLBACK_PROXY
        );

        vm.startBroadcast(deployerPrivateKey);
        deployedCore = new VaultPayCore(callbackProxy);
        vm.stopBroadcast();
    }
}
