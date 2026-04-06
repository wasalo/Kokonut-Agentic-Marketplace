// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol";
import {AgenticCommerceV6} from "../shared/AgenticCommerceV6.sol";
import {MockERC20} from "./TestFixtures.sol";

contract AgenticCommerceV61Test is Test {
    AgenticCommerceV6 public commerce;
    MockERC20 public usdc;
    
    address public owner = makeAddr("owner");
    address public treasury = makeAddr("treasury");
    address public client = makeAddr("client");
    address public provider = makeAddr("provider");
    address public evaluator = makeAddr("evaluator");
    
    function setUp() public {
        usdc = new MockERC20("USDC", "USDC", 6);
        
        AgenticCommerceV6 impl = new AgenticCommerceV6();
        
        bytes memory initData = abi.encodeCall(AgenticCommerceV6.initialize, (treasury));
        TransparentUpgradeableProxy proxy = new TransparentUpgradeableProxy(
            address(impl),
            owner,
            initData
        );
        
        commerce = AgenticCommerceV6(payable(address(proxy)));
    }
    
    function testRolesMustBeDistinct_ClientCannotBeProvider() public {
        vm.prank(client);
        vm.expectRevert("Client cannot be provider");
        commerce.createJob(client, evaluator, block.timestamp + 7 days, "Test job", address(0), false);
    }
    
    function testRolesMustBeDistinct_ClientCannotBeEvaluator() public {
        vm.prank(client);
        vm.expectRevert("Client cannot be evaluator");
        commerce.createJob(provider, client, block.timestamp + 7 days, "Test job", address(0), false);
    }
    
    function testRolesMustBeDistinct_ProviderCannotBeEvaluator() public {
        vm.prank(client);
        vm.expectRevert("Provider cannot be evaluator");
        commerce.createJob(provider, provider, block.timestamp + 7 days, "Test job", address(0), false);
    }
    
    function testSetDisputeWindow_OnlyFunded() public {
        vm.prank(client);
        uint256 jobId = commerce.createJob(provider, evaluator, block.timestamp + 7 days, "Test job", address(0), false);
        
        vm.prank(client);
        vm.expectRevert("Wrong status");
        commerce.setDisputeWindow(jobId, 10 days);
    }
    
    function testSetNonResponsiveSlashBP_OnlyFunded() public {
        vm.prank(client);
        uint256 jobId = commerce.createJob(provider, evaluator, block.timestamp + 7 days, "Test job", address(0), false);
        
        vm.prank(client);
        vm.expectRevert("Wrong status");
        commerce.setNonResponsiveSlashBP(jobId, 200);
    }
    
    function testBiddingDisabled_CommitBid() public {
        vm.prank(client);
        uint256 jobId = commerce.createJob(provider, evaluator, block.timestamp + 7 days, "Test job", address(0), false);
        
        vm.prank(provider);
        vm.expectRevert("Bidding disabled");
        commerce.commitBid(jobId, keccak256("commit"));
    }
    
    function testBiddingDisabled_CreateOpenJob() public {
        vm.prank(client);
        vm.expectRevert("Bidding disabled in V6.1");
        commerce.createOpenJob(100e6, evaluator, block.timestamp + 7 days, "Open job", IERC20(address(usdc)), false);
    }
    
    function testBiddingDisabled_AcceptBid() public {
        vm.prank(client);
        vm.expectRevert("Bidding disabled");
        commerce.acceptBid(1, 1);
    }
    
    function testBiddingDisabled_WithdrawStake() public {
        vm.prank(client);
        vm.expectRevert("Bidding disabled");
        commerce.withdrawStake(1);
    }
    
    function testBiddingDisabled_RevealBid() public {
        vm.prank(client);
        vm.expectRevert("Bidding disabled");
        commerce.revealBid(1, 100e6, "message", bytes32(0));
    }
    
    function testBiddingDisabled_CalculateStake() public {
        vm.expectRevert("Bidding disabled");
        commerce.calculateStake(100e6);
    }
    
    function testConstants() public {
        assertEq(commerce.DEFAULT_DISPUTE_WINDOW(), 7 days);
        assertEq(commerce.DEFAULT_NONRESPONSIVE_SLASH_BP(), 100); // 1%
        assertEq(commerce.MIN_EXPIRY_DURATION(), 5 minutes);
        assertEq(commerce.MAX_EXPIRY_DURATION(), 365 days);
        assertEq(commerce.FEE_DENOMINATOR(), 10000);
        assertEq(commerce.MIN_ETH_PAYMENT(), 0.005 ether);
    }
    
    function testCreateJob_Success() public {
        vm.prank(client);
        uint256 jobId = commerce.createJob(provider, evaluator, block.timestamp + 7 days, "Test job", address(0), false);
        
        assertEq(jobId, 1);
        assertEq(commerce.getJob(jobId).client, client);
        assertEq(commerce.getJob(jobId).provider, provider);
        assertEq(commerce.getJob(jobId).evaluator, evaluator);
    }
    
    function testSetProvider_OnlyClient() public {
        vm.prank(client);
        uint256 jobId = commerce.createJob(provider, evaluator, block.timestamp + 7 days, "Test job", address(0), false);
        
        vm.prank(provider);
        vm.expectRevert("Not client");
        commerce.setProvider(jobId, makeAddr("other"));
    }
    
    function testSetProvider_ClientCannotBeProvider() public {
        vm.prank(client);
        uint256 jobId = commerce.createJob(provider, evaluator, block.timestamp + 7 days, "Test job", address(0), false);
        
        vm.prank(client);
        vm.expectRevert("Provider set");
        commerce.setProvider(jobId, client);
    }
}
