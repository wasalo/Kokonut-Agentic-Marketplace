// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import {BiddingSystem} from "../shared/BiddingSystem.sol";

/**
 * @title UpgradeBiddingSystem_Phase45c
 * @dev Phase 45c — Bidding feature upgrade (10 changes):
 *      O-4: Min/Max Stake Validation (constants + per-call check)
 *           → DEFAULT_MIN_STAKE = 0.001 ether, DEFAULT_MAX_STAKE = 100 ether
 *           → enforced in createBiddingSession via new stake-bounds check
 *      O-5: Deadline Sanity tightened (1h to 30d)
 *           → MIN_SESSION_DURATION bumped 5 min → 1 hour
 *           → MAX_SESSION_DURATION kept 30 days
 *      O-6: evaluatorFee param (creator-set, stored on Session)
 *      O-7: hook param (creator-set, contract address only)
 *      O-8: PROTOCOL_VERSION=2 in commit hash
 *           → pre-Phase-45c reveals will fail. Bidders who committed pre-upgrade
 *             must reveal before the upgrade; post-upgrade commits use the new form.
 *      O-9: Withdraw timeout + sweepUnclaimedStakes
 *           → WITHDRAW_TIMEOUT = 30 days
 *           → acceptBid/cancelSession/completeSession stamp a deadline
 *           → sweepUnclaimedStakes() is permissionless after the deadline
 *      O-11: Platform fee per token (mapping) + getPlatformFeeBPForToken(token)
 *            → owner can override per ERC-20; defaults to global platformFeeBP
 *      O-12: BidStatus enum + status field on Bid
 *            → state machine: None → Pending → Revealed → Accepted/Rejected/Withdrawn
 *      O-14: BidRevealed event already emits; no contract change
 *      O-15: BidRejected event already emits; no contract change
 *
 * Storage layout: 4 new top-level state variables (minStake, maxStake,
 *                 withdrawStakeClaimableAt, platformFeeBPByToken). The __gap
 *                 was reduced from 49 to 42 slots accordingly. The Session
 *                 and Bid structs gained new fields at the END (so existing
 *                 struct members keep their layout). Storage layout check
 *                 reports 9/9 contracts compatible after regeneration.
 */
contract UpgradeBiddingSystem_Phase45c is Script {
    address public constant PROXY_ADDRESS = 0x4D7F38C6A9DE5De44A7B789962B7A2B06bFE8fd6;

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        console.log("=============================================");
        console.log("BiddingSystem Phase 45c - Feature Upgrade");
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
        console.log("NEW SURFACE (Phase 45c):");
        console.log("- createBiddingSession now takes (evaluatorFee, hook) and validates");
        console.log("  the stake is within [minStake, maxStake].");
        console.log("- sweepUnclaimedStakes(uint256 sessionId) - permissionless after 30 days");
        console.log("- setMinStake / setMaxStake / setStakeBounds - owner only");
        console.log("- setPlatformFeeBPForToken(token, bp) / getPlatformFeeBP(token)");
        console.log("- getBidStatus(sessionId, bidder) - explicit BidStatus lookup");
        console.log("- withdrawStakeClaimableAt(sessionId, bidder) - sweep deadline");
        console.log("- Bid struct: status (None=0, Pending=1, Revealed=2,");
        console.log("  Accepted=3, Rejected=4, Withdrawn=5)");
        console.log("- Session struct: evaluatorFee (bool), hook (address)");
        console.log("");
        console.log("HASH FORMAT CHANGE (O-8):");
        console.log("- Pre-Phase-45c: keccak256(abi.encode(sessionId, msg.sender, amount, message, salt))");
        console.log("- Phase-45c:     keccak256(abi.encode(PROTOCOL_VERSION=2, sessionId, msg.sender, amount, message, salt))");
        console.log("- Pre-upgrade commits must reveal before the upgrade or be re-committed.");
        console.log("");
        console.log("POST-UPGRADE OWNER ACTIONS:");
        console.log("  1. If you need ERC-20-specific fees: setPlatformFeeBPForToken(token, bp)");
        console.log("  2. If you need different stake bounds: setStakeBounds(newMin, newMax)");
        console.log("     (defaults 0.001 ETH - 100 ETH are seeded in initialize() for new deploys;");
        console.log("      upgrades rely on the existing storage which is 0/0; call setStakeBounds to set).");
        console.log("");
        console.log("NEXT STEPS:");
        console.log(string.concat("1. forge verify-contract ", vm.toString(address(newImplementation)), " contracts/shared/BiddingSystem.sol:BiddingSystem --chain 11155111 --etherscan-api-key $ETHERSCAN_API_KEY"));
        console.log("2. cast implementation 0x4D7F38C6A9DE5De44A7B789962B7A2B06bFE8fd6 --rpc-url sepolia");
        console.log("3. Update config/address-manifest.json to 2026-06-XX-phase-45c and regenerate network configs");
        console.log("4. (Optional) setStakeBounds(0.001 ether, 100 ether) to seed the post-upgrade bounds");
        console.log("5. Smoke-test: pnpm --filter @kokonut/web test:components");
    }
}
