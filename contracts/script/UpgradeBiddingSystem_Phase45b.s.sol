// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import {BiddingSystem} from "../shared/BiddingSystem.sol";

/**
 * @title UpgradeBiddingSystem_Phase45b
 * @dev Phase 45b — Bidding safety upgrade (6 changes):
 *      O-1: commit hash now binds to (sessionId, msg.sender, amount, message, salt)
 *           → prevents cross-bidder hash collisions and cross-session replay.
 *      O-2: explicit closeBidding() function + BiddingClosed event
 *           → makes the BiddingClosed state transition observable on-chain.
 *      O-3: slashNoShow() + BidderSlashed event + NO_SHOW_SLASH_BP (5%)
 *           → creator can penalize bidders who never reveal after the reveal window.
 *      O-10: per-token platform-fee accumulator + withdrawFees(token)
 *           → ERC-20 platform fees can now be withdrawn without breaking ETH path.
 *      O-13: EvaluatorFinalized event emitted in createJobAndFund
 *           → makes the moment the evaluator is locked in observable.
 *      O-20: removed unimplemented claimStake() from the contract surface.
 *
 * Storage layout: only `accumulatedFeesByToken` (mapping) is added at slot 64
 *                 (consumed from the existing __gap). No existing state shifts.
 */
contract UpgradeBiddingSystem_Phase45b is Script {
    address public constant PROXY_ADDRESS = 0x4D7F38C6A9DE5De44A7B789962B7A2B06bFE8fd6;

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        console.log("=============================================");
        console.log("BiddingSystem Phase 45b - Safety Upgrade");
        console.log("=============================================");
        console.log("Deployer:", deployer);
        console.log("Proxy:", PROXY_ADDRESS);

        vm.startBroadcast(deployerPrivateKey);

        console.log("[1/3] Deploying new implementation...");

        BiddingSystem newImplementation = new BiddingSystem();
        console.log("    New Implementation:", address(newImplementation));

        console.log("[2/3] Upgrading proxy (UUPS)...");

        BiddingSystem(payable(PROXY_ADDRESS)).upgradeToAndCall(address(newImplementation), "");
        console.log("    Upgrade complete!");

        vm.stopBroadcast();

        console.log("");
        console.log("NEW SURFACE (Phase 45b):");
        console.log("- closeBidding(uint256 sessionId)");
        console.log("- slashNoShow(uint256 sessionId, address bidder)");
        console.log("- withdrawFees(address token) // address(0) for native ETH");
        console.log("- accumulatedFeesByToken(address token) // view");
        console.log("- Events: BiddingClosed, BidderSlashed, EvaluatorFinalized, FeesWithdrawn");
        console.log("- REMOVED: claimStake (was never implemented; use withdrawStake/acceptBid)");
        console.log("");
        console.log("HASH FORMAT CHANGE (O-1):");
        console.log("- Pre-Phase-45b: keccak256(abi.encode(amount, message, salt))");
        console.log("- Phase-45b:     keccak256(abi.encode(sessionId, msg.sender, amount, message, salt))");
        console.log("- Any pre-upgrade commits must reveal before the upgrade; post-upgrade commits use the new form.");
        console.log("");
        console.log("NEXT STEPS:");
        console.log(string.concat("1. forge verify-contract ", vm.toString(address(newImplementation)), " contracts/shared/BiddingSystem.sol:BiddingSystem --chain 11155111 --etherscan-api-key $ETHERSCAN_API_KEY"));
        console.log("2. cast implementation 0x4D7F38C6A9DE5De44A7B789962B7A2B06bFE8fd6 --rpc-url sepolia");
        console.log("3. Update config/address-manifest.json to 2026-06-XX-phase-45b and regenerate network configs");
    }
}
