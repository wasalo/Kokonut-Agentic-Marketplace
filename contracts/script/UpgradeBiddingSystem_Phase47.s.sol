// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import {BiddingSystem} from "../shared/BiddingSystem.sol";

/**
 * @title UpgradeBiddingSystem_Phase47
 * @dev Phase 47 Pashov audit remediation for BiddingSystem:
 *      - revealBid: enforce bid.commitHash == expectedHash (prevents sybil commitment optionality)
 *      - acceptBid: require block.timestamp >= revealWindowEnd (prevents premature winner selection)
 *      - withdrawStake: apply 5% no-show slash for unrevealed (Pending) bids (95% refund)
 *      - Pull-based bid refunds: acceptBid/rejectBid/createJobAndFund record pendingBidRefund;
 *        new withdrawBidRefund() function for bidders to claim.
 *      Storage layout: pendingBidRefund appended after platformFeeBPByToken; __gap unchanged (40).
 */
contract UpgradeBiddingSystem_Phase47 is Script {
    address public constant PROXY_ADDRESS = 0x4D7F38C6A9DE5De44A7B789962B7A2B06bFE8fd6;

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        console.log("=============================================");
        console.log("BiddingSystem Phase 47 Upgrade");
        console.log("=============================================");
        console.log("Deployer:", deployer);
        console.log("Proxy:", PROXY_ADDRESS);

        vm.startBroadcast(deployerPrivateKey);

        BiddingSystem newImplementation = new BiddingSystem();
        console.log("New Implementation:", address(newImplementation));

        BiddingSystem(payable(PROXY_ADDRESS)).upgradeToAndCall(address(newImplementation), "");
        console.log("Upgrade complete");

        vm.stopBroadcast();

        console.log("NEXT STEPS:");
        console.log(string.concat("1. forge verify-contract ", vm.toString(address(newImplementation)), " contracts/shared/BiddingSystem.sol:BiddingSystem --chain 11155111 --etherscan-api-key $ETHERSCAN_API_KEY"));
        console.log("2. Update config/address-manifest.json biddingSystemImpl after deployment");
    }
}
