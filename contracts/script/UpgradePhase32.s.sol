// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import {AgenticCommerceV9} from "../shared/AgenticCommerceV9.sol";
import {BiddingSystem} from "../shared/BiddingSystem.sol";
import {AgentReviewV5} from "../shared/AgentReviewV5.sol";
import {MilestoneEscrowV2} from "../shared/MilestoneEscrowV2.sol";
import {MilestoneEscrow} from "../shared/MilestoneEscrow.sol";
import {AdminRegistry} from "../shared/AdminRegistry.sol";

/**
 * @title UpgradePhase32
 * @dev Phase 32: Multi-Audit Remediation — reentrancy, zero-checks, weak-prng
 *
 * Upgrades 6 contracts with Slither findings remediation:
 * - AgenticCommerceV9: zero-checks in initialize + cache array length
 * - BiddingSystem: reentrancy fix (guard flags before external call)
 * - AgentReviewV5: zero-check in initialize + nonReentrant on slashEvaluator/withdrawETH
 * - MilestoneEscrowV2: zero-check in initialize + blockhash entropy in flagDispute
 * - MilestoneEscrow: zero-checks in initialize/setAgenticCommerce + remove jobCounter
 * - AdminRegistry: zero-check + event in setSlashManager
 */
contract UpgradePhase32 is Script {
    // Phase 31 proxy addresses (Sepolia)
    address public constant AGENTIC_COMMERCE_V9_PROXY = 0x3a1Bc03cC84040A282F6bf238b917D8351499239;
    address public constant BIDDING_SYSTEM_PROXY = 0x4D7F38C6A9DE5De44A7B789962B7A2B06bFE8fd6;
    address public constant AGENT_REVIEW_V5_PROXY = 0x5CDb592Fd37749bF87448FBf5725D1Cd986dd1Cb;
    address public constant MILESTONE_ESCROW_V2_PROXY = 0xc89D63057288092012c5D3cEF66121C1F8449a9f;
    address public constant MILESTONE_ESCROW_PROXY = 0xd4Fdc345b1c6aF1B4Cc84339bcB251B33527Eb45;
    address public constant ADMIN_REGISTRY_PROXY = 0xC81C864CEAb6231ad764cf9867e031D8b6dee41d;

    struct UpgradeResult {
        string contractName;
        address proxy;
        address implementation;
    }

    UpgradeResult[] public results;

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        console.log("=============================================================");
        console.log("Phase 32: Multi-Audit Remediation Upgrade");
        console.log("=============================================================");
        console.log("Deployer:", deployer);
        console.log("");

        vm.startBroadcast(deployerPrivateKey);

        // 1. AgenticCommerceV9
        console.log("[1/6] Upgrading AgenticCommerceV9...");
        AgenticCommerceV9 newCommerce = new AgenticCommerceV9();
        AgenticCommerceV9(AGENTIC_COMMERCE_V9_PROXY).upgradeToAndCall(address(newCommerce), "");
        results.push(UpgradeResult("AgenticCommerceV9", AGENTIC_COMMERCE_V9_PROXY, address(newCommerce)));
        console.log("    Implementation:", address(newCommerce));
        console.log("    Proxy:", AGENTIC_COMMERCE_V9_PROXY);

        // 2. BiddingSystem
        console.log("[2/6] Upgrading BiddingSystem...");
        BiddingSystem newBidding = new BiddingSystem();
        BiddingSystem(payable(BIDDING_SYSTEM_PROXY)).upgradeToAndCall(address(newBidding), "");
        results.push(UpgradeResult("BiddingSystem", BIDDING_SYSTEM_PROXY, address(newBidding)));
        console.log("    Implementation:", address(newBidding));
        console.log("    Proxy:", BIDDING_SYSTEM_PROXY);

        // 3. AgentReviewV5
        console.log("[3/6] Upgrading AgentReviewV5...");
        AgentReviewV5 newReview = new AgentReviewV5();
        AgentReviewV5(payable(AGENT_REVIEW_V5_PROXY)).upgradeToAndCall(address(newReview), "");
        results.push(UpgradeResult("AgentReviewV5", AGENT_REVIEW_V5_PROXY, address(newReview)));
        console.log("    Implementation:", address(newReview));
        console.log("    Proxy:", AGENT_REVIEW_V5_PROXY);

        // 4. MilestoneEscrowV2
        console.log("[4/6] Upgrading MilestoneEscrowV2...");
        MilestoneEscrowV2 newMilestoneV2 = new MilestoneEscrowV2();
        MilestoneEscrowV2(MILESTONE_ESCROW_V2_PROXY).upgradeToAndCall(address(newMilestoneV2), "");
        results.push(UpgradeResult("MilestoneEscrowV2", MILESTONE_ESCROW_V2_PROXY, address(newMilestoneV2)));
        console.log("    Implementation:", address(newMilestoneV2));
        console.log("    Proxy:", MILESTONE_ESCROW_V2_PROXY);

        // 5. MilestoneEscrow (deprecated)
        console.log("[5/6] Upgrading MilestoneEscrow (deprecated)...");
        MilestoneEscrow newMilestone = new MilestoneEscrow();
        MilestoneEscrow(MILESTONE_ESCROW_PROXY).upgradeToAndCall(address(newMilestone), "");
        results.push(UpgradeResult("MilestoneEscrow", MILESTONE_ESCROW_PROXY, address(newMilestone)));
        console.log("    Implementation:", address(newMilestone));
        console.log("    Proxy:", MILESTONE_ESCROW_PROXY);

        // 6. AdminRegistry
        console.log("[6/6] Upgrading AdminRegistry...");
        AdminRegistry newAdmin = new AdminRegistry();
        AdminRegistry(ADMIN_REGISTRY_PROXY).upgradeToAndCall(address(newAdmin), "");
        results.push(UpgradeResult("AdminRegistry", ADMIN_REGISTRY_PROXY, address(newAdmin)));
        console.log("    Implementation:", address(newAdmin));
        console.log("    Proxy:", ADMIN_REGISTRY_PROXY);

        vm.stopBroadcast();

        console.log("");
        console.log("=============================================================");
        console.log("ALL UPGRADES COMPLETE");
        console.log("=============================================================");
        console.log("");

        for (uint256 i = 0; i < results.length; i++) {
            console.log(string.concat(results[i].contractName, " Proxy: ", vm.toString(results[i].proxy)));
            console.log(string.concat(results[i].contractName, " Impl:  ", vm.toString(results[i].implementation)));
            console.log("");
        }

        console.log("Etherscan verification commands:");
        for (uint256 i = 0; i < results.length; i++) {
            string memory cmd = string.concat(
                "forge verify-contract ",
                vm.toString(results[i].implementation),
                " contracts/shared/",
                results[i].contractName,
                ".sol:",
                results[i].contractName,
                " --chain 11155111 --etherscan-api-key $ETHERSCAN_API_KEY"
            );
            console.log(cmd);
        }
    }
}
