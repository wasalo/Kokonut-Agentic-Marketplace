// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import {PriceOracleV2} from "../shared/PriceOracleV2.sol";

contract UpgradePriceOracleV2 is Script {
    address public constant PROXY_ADDRESS = 0x32fD2A54B722D2048A052fD0456004483a683aFE;

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        console.log("=============================================");
        console.log("PriceOracleV2 Upgrade - OZ v5 __UUPSUpgradeable_init() removal");
        console.log("=============================================");
        console.log("Deployer:", deployer);
        console.log("Proxy Address:", PROXY_ADDRESS);

        console.log("[1/2] Deploying new implementation...");

        vm.startBroadcast(deployerPrivateKey);

        PriceOracleV2 newImplementation = new PriceOracleV2();

        console.log("    New Implementation:", address(newImplementation));

        console.log("[2/2] Upgrading proxy...");

        PriceOracleV2(PROXY_ADDRESS).upgradeToAndCall(address(newImplementation), "");

        console.log("    Upgrade complete!");

        vm.stopBroadcast();

        console.log("");
        console.log("NEXT STEPS:");
        console.log("1. forge verify-contract <IMPL_ADDR> contracts/shared/PriceOracleV2.sol:PriceOracleV2 --chain 11155111");
        console.log("2. cast implementation 0x32fD2A54B722D2048A052fD0456004483a683aFE --rpc-url sepolia");
    }
}
