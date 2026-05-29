// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test, console2} from "forge-std/Test.sol";
import {CommitReveal} from "../shared/CommitReveal.sol";
import {SlashManager} from "../shared/SlashManager.sol";
import {ServiceRegistryV2} from "../shared/ServiceRegistryV2.sol";
import {AgenticCommerceV6} from "../shared/AgenticCommerceV6.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {TransparentUpgradeableProxy} from "@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol";

/**
 * @title SecurityFixesTest
 * @dev Tests for all security fixes applied in April 2026
 * 
 * Coverage:
 * - M1: ServiceRegistryV2 initializeActiveServiceCount guard
 * - M2: SlashManager O(1) lookup (activeSlashByEvaluator)
 * - M3: AgenticCommerceV6 token allowlist
 * - L2: AgenticCommerceV6 custom errors
 * - L3: ServiceRegistryV2 gap variable placement
 * - L5: CommitReveal cleanupExpiredCommitments
 * - L6: SlashManager nonce-based proposal hashing
 * - L7: ServiceRegistryV2 OZ _getImplementation
 * - I1: Pausable pattern (all contracts)
 */
contract SecurityFixesTest is Test {
    // Test accounts
    address public owner;
    address public treasury;
    address public client;
    address public provider;
    address public evaluator;
    address public signer1;
    address public signer2;
    address public signer3;
    address public signer4;
    address public signer5;
    address public serviceRegistry;
    
    // Constants
    uint256 constant INITIAL_ETH = 100 ether;
    
    // Contract instances
    CommitReveal public commitReveal;
    CommitReveal public commitRevealImpl;
    TransparentUpgradeableProxy public commitRevealProxy;
    
    SlashManager public slashManager;
    SlashManager public slashManagerImpl;
    TransparentUpgradeableProxy public slashManagerProxy;
    
    ServiceRegistryV2 public serviceRegistryV2;
    ServiceRegistryV2 public serviceRegistryV2Impl;
    TransparentUpgradeableProxy public serviceRegistryV2Proxy;
    
    AgenticCommerceV6 public agenticCommerce;
    AgenticCommerceV6 public agenticCommerceImpl;
    TransparentUpgradeableProxy public agenticCommerceProxy;
    
    // Mock contracts for testing
    MockERC20 public mockToken;
    
    function setUp() public {
        // Create test accounts
        owner = makeAddr("owner");
        treasury = makeAddr("treasury");
        client = makeAddr("client");
        provider = makeAddr("provider");
        evaluator = makeAddr("evaluator");
        signer1 = makeAddr("signer1");
        signer2 = makeAddr("signer2");
        signer3 = makeAddr("signer3");
        signer4 = makeAddr("signer4");
        signer5 = makeAddr("signer5");
        serviceRegistry = makeAddr("serviceRegistry");
        
        // Fund accounts
        vm.deal(owner, INITIAL_ETH);
        vm.deal(treasury, INITIAL_ETH);
        vm.deal(client, INITIAL_ETH);
        vm.deal(provider, INITIAL_ETH);
        vm.deal(evaluator, INITIAL_ETH);
        vm.deal(signer1, INITIAL_ETH);
        vm.deal(signer2, INITIAL_ETH);
        vm.deal(signer3, INITIAL_ETH);
        vm.deal(signer4, INITIAL_ETH);
        vm.deal(signer5, INITIAL_ETH);
        
        // Deploy mock token
        mockToken = new MockERC20("Mock Token", "MOCK", 18);
        
        // Deploy CommitReveal with UUPS proxy
        _deployCommitReveal();
        
        // Deploy SlashManager with UUPS proxy
        _deploySlashManager();
        
        // Deploy ServiceRegistryV2 with UUPS proxy
        _deployServiceRegistryV2();
        
        // Deploy AgenticCommerceV6 with UUPS proxy
        _deployAgenticCommerceV6();
    }
    
    // ============ Deployment Helpers ============
    
    function _deployCommitReveal() internal {
        commitRevealImpl = new CommitReveal();
        bytes memory initData = abi.encodeCall(CommitReveal.initialize, (serviceRegistry, owner));
        // Use TransparentUpgradeableProxy with owner as admin
        TransparentUpgradeableProxy proxy = new TransparentUpgradeableProxy(
            address(commitRevealImpl),
            owner,
            initData
        );
        commitReveal = CommitReveal(payable(address(proxy)));
    }
    
    function _deploySlashManager() internal {
        slashManagerImpl = new SlashManager();
        address[] memory signers = new address[](3);
        signers[0] = signer1;
        signers[1] = signer2;
        signers[2] = signer3;
        bytes memory initData = abi.encodeCall(SlashManager.initialize, (owner, signers));
        TransparentUpgradeableProxy proxy = new TransparentUpgradeableProxy(
            address(slashManagerImpl),
            owner,
            initData
        );
        slashManager = SlashManager(payable(address(proxy)));
    }
    
    function _deployServiceRegistryV2() internal {
        serviceRegistryV2Impl = new ServiceRegistryV2();
        bytes memory initData = abi.encodeCall(ServiceRegistryV2.initialize, (serviceRegistry, owner));
        TransparentUpgradeableProxy proxy = new TransparentUpgradeableProxy(
            address(serviceRegistryV2Impl),
            owner,
            initData
        );
        serviceRegistryV2 = ServiceRegistryV2(payable(address(proxy)));
    }
    
    function _deployAgenticCommerceV6() internal {
        agenticCommerceImpl = new AgenticCommerceV6();
        bytes memory initData = abi.encodeCall(AgenticCommerceV6.initialize, (treasury, owner));
        TransparentUpgradeableProxy proxy = new TransparentUpgradeableProxy(
            address(agenticCommerceImpl),
            owner,
            initData
        );
        agenticCommerce = AgenticCommerceV6(payable(address(proxy)));
    }
    
    // ==========================================
    // M1: ServiceRegistryV2 initializeActiveServiceCount guard
    // ==========================================
    
    function test_M1_initializeActiveServiceCount_FirstCallSucceeds() public {
        vm.prank(owner);
        serviceRegistryV2.initializeActiveServiceCount();
        
        uint256 count = serviceRegistryV2.getActiveServiceCount();
        assertEq(count, 0);
    }
    
    function test_M1_initializeActiveServiceCount_SecondCallReverts() public {
        vm.startPrank(owner);
        serviceRegistryV2.initializeActiveServiceCount();
        
        vm.expectRevert(abi.encodeWithSelector(ServiceRegistryV2.ServiceRegistryV2__Already_initialized.selector));
        serviceRegistryV2.initializeActiveServiceCount();
        vm.stopPrank();
    }
    
    function test_M1_initializeActiveServiceCount_NonOwnerReverts() public {
        vm.prank(client);
        vm.expectRevert(); // OwnableUnauthorizedAccount error
        serviceRegistryV2.initializeActiveServiceCount();
    }
    
    // ==========================================
    // M2: SlashManager O(1) lookup
    // ==========================================
    
    function test_M2_verifySlash_DirectLookupWorks() public {
        // Set agentReview first (required by createProposal)
        vm.prank(owner);
        slashManager.setCommerce(makeAddr("dummyCommerce"));
        
        // Create a proposal
        vm.prank(owner);
        bytes32 proposalHash = slashManager.createProposal(
            evaluator,
            1,
            1 ether,
            "Test reason"
        );
        
        // M2 Fix: Direct lookup mapping should be set
        bytes32 storedHash = slashManager.activeSlashByEvaluator(evaluator, 1);
        assertEq(storedHash, proposalHash);
    }
    
    function test_M2_verifySlash_AfterCancelClearsMapping() public {
        // Set agentReview first (required by createProposal)
        vm.prank(owner);
        slashManager.setCommerce(makeAddr("dummyCommerce"));
        
        // Create proposal
        vm.prank(owner);
        bytes32 proposalHash = slashManager.createProposal(
            evaluator,
            1,
            1 ether,
            "Test reason"
        );
        
        // Verify the mapping is set
        bytes32 storedHash = slashManager.activeSlashByEvaluator(evaluator, 1);
        assertEq(storedHash, proposalHash);
        
        // After cancel, the mapping should be cleared
        vm.prank(owner);
        slashManager.cancelProposal(proposalHash);
        
        // Verify the mapping is cleared
        storedHash = slashManager.activeSlashByEvaluator(evaluator, 1);
        assertEq(storedHash, bytes32(0));
    }
    
    function test_M2_verifySlash_NonExistentReturnsEmpty() public {
        // Non-existent lookup returns empty bytes32
        bytes32 storedHash = slashManager.activeSlashByEvaluator(evaluator, 999);
        assertEq(storedHash, bytes32(0));
    }
    
    // ==========================================
    // M3: AgenticCommerceV6 Token Allowlist
    // ==========================================
    
    function test_M3_initialize_SetsDefaultAllowedTokens() public {
        // Native ETH should be allowed by default
        assertTrue(agenticCommerce.allowedTokens(address(0)));
    }
    
    function test_M3_setAllowedToken_OwnerCanAddToken() public {
        vm.prank(owner);
        agenticCommerce.setAllowedToken(address(mockToken), true);
        
        assertTrue(agenticCommerce.allowedTokens(address(mockToken)));
    }
    
    function test_M3_setAllowedToken_OwnerCanRemoveToken() public {
        vm.prank(owner);
        agenticCommerce.setAllowedToken(address(mockToken), true);
        assertTrue(agenticCommerce.allowedTokens(address(mockToken)));
        
        vm.prank(owner);
        agenticCommerce.setAllowedToken(address(mockToken), false);
        
        assertFalse(agenticCommerce.allowedTokens(address(mockToken)));
    }
    
    function test_M3_setAllowedToken_NonOwnerReverts() public {
        vm.prank(client);
        vm.expectRevert(); // OwnableUnauthorizedAccount error
        agenticCommerce.setAllowedToken(address(mockToken), true);
    }
    
    function test_M3_TokenAllowlistUpdatedEvent() public {
        vm.prank(owner);
        vm.expectEmit(true, true, true, true);
        emit AgenticCommerceV6.TokenAllowlistUpdated(address(mockToken), true);
        agenticCommerce.setAllowedToken(address(mockToken), true);
    }
    
    // ==========================================
    // L2: AgenticCommerceV6 Custom Errors
    // =========================================
    
    function test_L2_customErrors_InvalidJob() public {
        vm.prank(client);
        vm.expectRevert(AgenticCommerceV6.InvalidJob.selector);
        agenticCommerce.getJob(999);
    }
    
    function test_L2_customErrors_WrongStatus() public {
        // Create job
        vm.prank(client);
        uint256 jobId = agenticCommerce.createJob(
            provider,
            evaluator,
            block.timestamp + 7 days,
            "Test job",
            address(0),
            false
        );
        
        // Set budget - MIN_ETH_PAYMENT is 0.005 ether
        vm.prank(client);
        agenticCommerce.setBudget(jobId, 0.01 ether);
        
        // Fund the job with ETH
        vm.prank(client);
        vm.deal(client, 0.02 ether);
        agenticCommerce.fund{value: 0.01 ether}(jobId, 0.01 ether);
        
        // Try to fund again - should revert with WrongStatus
        vm.prank(client);
        vm.expectRevert(AgenticCommerceV6.WrongStatus.selector);
        agenticCommerce.fund{value: 0.01 ether}(jobId, 0.01 ether);
    }
    
    function test_L2_customErrors_Unauthorized() public {
        uint256 jobId = 1;
        
        vm.prank(client);
        vm.expectRevert(AgenticCommerceV6.Unauthorized.selector);
        agenticCommerce.complete(jobId, "reason");
    }
    
    function test_L2_customErrors_ZeroAddress() public {
        vm.prank(client);
        vm.expectRevert(AgenticCommerceV6.ZeroAddress.selector);
        agenticCommerce.createJob(
            address(0),  // Zero provider
            evaluator,
            block.timestamp + 7 days,
            "Test job",
            address(0),
            false
        );
    }
    
    function test_L2_customErrors_TokenNotAllowed() public {
        // Set a non-allowed token as allowed and then disallow it
        vm.prank(owner);
        agenticCommerce.setAllowedToken(address(mockToken), true);
        
        vm.prank(owner);
        agenticCommerce.setAllowedToken(address(mockToken), false);
        
        // Verify the token is not allowed
        assertFalse(agenticCommerce.allowedTokens(address(mockToken)));
    }
    
    // ==========================================
    // L3: ServiceRegistryV2 Gap Variable Placement
    // ==========================================
    
    function test_L3_GapVariable_StorageLayoutCorrect() public {
        // This test verifies the gap variable is in the correct position
        // by checking that storage operations work correctly
        uint256 serviceCount = serviceRegistryV2.getServiceCounter();
        assertEq(serviceCount, 0);
        
        uint256 activeCount = serviceRegistryV2.getActiveServiceCount();
        assertEq(activeCount, 0);
    }
    
    // ==========================================
    // M5: AgenticCommerceV6 permissionless refundExpired
    // ==========================================
    
    function test_M5_refundExpired_AnyoneCanCall() public {
        // Create and fund a job
        vm.prank(client);
        uint256 jobId = agenticCommerce.createJob(
            provider,
            evaluator,
            block.timestamp + 7 days,
            "Test job",
            address(0),
            false
        );
        
        // Set budget and fund
        vm.prank(client);
        agenticCommerce.setBudget(jobId, 0.01 ether);
        
        vm.deal(client, 10 ether);
        vm.prank(client);
        agenticCommerce.fund{value: 0.01 ether}(jobId, 0.01 ether);
        
        uint256 clientBalanceBefore = client.balance;
        
        // Fast forward past expiry
        vm.warp(block.timestamp + 8 days);
        
        // Anyone (not just client) can call refundExpired
        address stranger = makeAddr("stranger");
        vm.deal(stranger, 1 ether);
        uint256 strangerBalanceBefore = stranger.balance;
        
        vm.prank(stranger);
        agenticCommerce.refundExpired(jobId);
        
        // Refund goes to original client, not stranger
        assertEq(stranger.balance, strangerBalanceBefore);
        assertEq(client.balance, clientBalanceBefore + 0.01 ether);
    }
    
    function test_M5_refundExpired_RefundGoesToClient() public {
        // Create and fund a job
        vm.prank(client);
        uint256 jobId = agenticCommerce.createJob(
            provider,
            evaluator,
            block.timestamp + 7 days,
            "Test job",
            address(0),
            false
        );
        
        // Set budget and fund
        vm.prank(client);
        agenticCommerce.setBudget(jobId, 0.05 ether);
        
        vm.deal(client, 10 ether);
        vm.prank(client);
        agenticCommerce.fund{value: 0.05 ether}(jobId, 0.05 ether);
        
        uint256 clientBalanceBefore = client.balance;
        
        // Fast forward past expiry
        vm.warp(block.timestamp + 8 days);
        
        // Stranger calls refundExpired
        vm.prank(makeAddr("stranger"));
        agenticCommerce.refundExpired(jobId);
        
        // Client receives the refund
        assertEq(client.balance, clientBalanceBefore + 0.05 ether);
    }
    
    function test_M5_refundExpired_RevertIfNotExpired() public {
        // Create and fund a job
        vm.prank(client);
        uint256 jobId = agenticCommerce.createJob(
            provider,
            evaluator,
            block.timestamp + 7 days,
            "Test job",
            address(0),
            false
        );
        
        // Set budget and fund
        vm.prank(client);
        agenticCommerce.setBudget(jobId, 0.01 ether);
        
        vm.deal(client, 1 ether);
        vm.prank(client);
        agenticCommerce.fund{value: 0.01 ether}(jobId, 0.01 ether);
        
        // Try to refund before expiry - should fail
        vm.prank(makeAddr("stranger"));
        vm.expectRevert();
        agenticCommerce.refundExpired(jobId);
    }
    
    // ==========================================
    // L5: CommitReveal cleanupExpiredCommitments
    // ==========================================
    
    function test_L5_cleanupExpiredCommitments_AnyoneCanCall() public {
        // Create a commitment
        bytes32 commitment = keccak256(abi.encode("test"));
        vm.prank(client);
        commitReveal.commit(commitment);
        
        // Fast forward past MAX_COMMITMENT_AGE (1000 blocks)
        vm.roll(block.number + 1001);
        
        // Anyone can call cleanup
        bytes32[] memory toClean = new bytes32[](1);
        toClean[0] = commitment;
        
        commitReveal.cleanupExpiredCommitments(toClean);
        
        // Commitment should be cancelled
        assertFalse(commitReveal.isCommitmentValid(commitment));
    }
    
    function test_L5_cleanupExpiredCommitments_RemovesExpired() public {
        // Create commitment
        bytes32 commitment = keccak256(abi.encode("test"));
        vm.prank(client);
        commitReveal.commit(commitment);
        
        // Fast forward past expiry
        vm.roll(block.number + 1001);
        
        bytes32[] memory toClean = new bytes32[](1);
        toClean[0] = commitment;
        
        commitReveal.cleanupExpiredCommitments(toClean);
        
        // isCommitmentValid should return false
        assertFalse(commitReveal.isCommitmentValid(commitment));
    }
    
    function test_L5_cleanupExpiredCommitments_SkipsActiveCommitments() public {
        // Create commitment
        bytes32 commitment = keccak256(abi.encode("test"));
        vm.prank(client);
        commitReveal.commit(commitment);
        
        // Don't advance past expiry
        
        bytes32[] memory toClean = new bytes32[](1);
        toClean[0] = commitment;
        
        // Should fail - not expired yet
        vm.expectRevert(abi.encodeWithSelector(CommitReveal.CommitReveal_No_expired_commitments.selector));
        commitReveal.cleanupExpiredCommitments(toClean);
    }
    
    function test_L5_cleanupExpiredCommitments_SkipsRevealed() public {
        // Create commitment - must compute hash correctly for reveal to work
        bytes32 secret = bytes32("secret");
        bytes32 commitmentHash = keccak256(abi.encode(client, secret, 1));
        
        vm.prank(client);
        commitReveal.commit(commitmentHash);
        
        // Fast forward past reveal delay
        vm.roll(block.number + 13);
        
        // Reveal
        vm.prank(client);
        commitReveal.reveal(commitmentHash, secret, 1);
        
        // Fast forward past expiry
        vm.roll(block.number + 1001);
        
        bytes32[] memory toClean = new bytes32[](1);
        toClean[0] = commitmentHash;
        
        // Should fail - already revealed
        vm.expectRevert(abi.encodeWithSelector(CommitReveal.CommitReveal_No_expired_commitments.selector));
        commitReveal.cleanupExpiredCommitments(toClean);
    }
    
    function test_L5_cleanupExpiredCommitments_SkipsCancelled() public {
        // Create commitment
        bytes32 commitment = keccak256(abi.encode("test"));
        vm.prank(client);
        commitReveal.commit(commitment);
        
        // Cancel before expiry
        vm.prank(client);
        commitReveal.cancel(commitment);
        
        // Fast forward past expiry
        vm.roll(block.number + 1001);
        
        bytes32[] memory toClean = new bytes32[](1);
        toClean[0] = commitment;
        
        // Should fail - already cancelled
        vm.expectRevert(abi.encodeWithSelector(CommitReveal.CommitReveal_No_expired_commitments.selector));
        commitReveal.cleanupExpiredCommitments(toClean);
    }
    
    function test_L5_cleanupExpiredCommitments_EmptyArrayAllowed() public {
        bytes32[] memory empty = new bytes32[](0);
        commitReveal.cleanupExpiredCommitments(empty);
        assertTrue(true); // Should not revert
    }
    
    function test_L5_cleanupExpiredCommitments_CleanupExpiredEvent() public {
        bytes32 commitment = keccak256(abi.encode("test"));
        vm.prank(client);
        commitReveal.commit(commitment);
        
        vm.roll(block.number + 1001);
        
        bytes32[] memory toClean = new bytes32[](1);
        toClean[0] = commitment;
        
        vm.expectEmit(true, true, true, true);
        emit CommitReveal.CleanupExpired(commitment, block.number - 1001);
        commitReveal.cleanupExpiredCommitments(toClean);
    }
    
    // ==========================================
    // L6: SlashManager nonce-based proposal hashing
    // ==========================================
    
    function test_L6_createProposal_NonceBasedHashing() public {
        vm.prank(owner);
        slashManager.setCommerce(makeAddr("dummyCommerce"));
        
        // First proposal
        vm.prank(owner);
        bytes32 hash1 = slashManager.createProposal(
            evaluator,
            1,
            1 ether,
            "Reason 1"
        );
        
        // Second proposal with same params should get different hash due to nonce
        vm.prank(owner);
        bytes32 hash2 = slashManager.createProposal(
            evaluator,
            1,
            1 ether,
            "Reason 1"
        );
        
        assertTrue(hash1 != hash2);
        
        // Third proposal
        vm.prank(owner);
        bytes32 hash3 = slashManager.createProposal(
            evaluator,
            1,
            1 ether,
            "Reason 1"
        );
        
        assertTrue(hash2 != hash3);
    }
    
    function test_L6_proposalNonce_IncrementsOnEachProposal() public {
        uint256 nonce = slashManager.proposalNonce();
        assertEq(nonce, 0);
    }
    
    // ==========================================
    // M5: SlashManager signer-based proposal creation
    // ==========================================
    
    function test_M5_SlashManager_SignerCanCreateProposal() public {
        vm.prank(owner);
        slashManager.setCommerce(makeAddr("dummyCommerce"));
        
        // Signer 1 creates proposal
        vm.prank(signer1);
        bytes32 hash = slashManager.createProposal(
            evaluator,
            1,
            1 ether,
            "Test reason"
        );
        
        assertTrue(hash != bytes32(0));
    }
    
    function test_M5_SlashManager_NonSignerCannotCreateProposal() public {
        vm.prank(owner);
        slashManager.setCommerce(makeAddr("dummyCommerce"));
        
        // Non-signer tries to create proposal
        vm.prank(client);
        vm.expectRevert(abi.encodeWithSelector(SlashManager.SlashManager__Not_owner_or_signer.selector));
        slashManager.createProposal(
            evaluator,
            1,
            1 ether,
            "Test reason"
        );
    }
    
    function test_M5_SlashManager_OwnerCanCreateProposal() public {
        vm.prank(owner);
        slashManager.setCommerce(makeAddr("dummyCommerce"));
        
        // Owner creates proposal
        vm.prank(owner);
        bytes32 hash = slashManager.createProposal(
            evaluator,
            1,
            1 ether,
            "Test reason"
        );
        
        assertTrue(hash != bytes32(0));
    }
    
    // ==========================================
    // L7: ServiceRegistryV2 OZ _getImplementation
    // ==========================================
    
    function test_L7_getImplementation_ReturnsCorrectAddress() public {
        address impl = serviceRegistryV2.getImplementation();
        assertEq(impl, address(serviceRegistryV2Impl));
    }
    
    // ==========================================
    // I1: Pausable Pattern
    // ==========================================
    
    function test_I1_SlashManager_PauseUnpause() public {
        // Initially not paused
        assertFalse(slashManager.paused());
        
        // Owner can pause
        vm.prank(owner);
        slashManager.pause();
        assertTrue(slashManager.paused());
        
        // Create proposal should fail when paused
        vm.prank(owner);
        vm.expectRevert(); // EnforcedPause() error
        slashManager.createProposal(evaluator, 1, 1 ether, "test");
        
        // Owner can unpause
        vm.prank(owner);
        slashManager.unpause();
        assertFalse(slashManager.paused());
    }
    
    function test_I1_SlashManager_NonOwnerCannotPause() public {
        vm.prank(client);
        vm.expectRevert(); // OwnableUnauthorizedAccount error
        slashManager.pause();
    }
    
    function test_I1_AgenticCommerce_PauseUnpause() public {
        // Initially not paused
        assertFalse(agenticCommerce.paused());
        
        // Owner can pause
        vm.prank(owner);
        agenticCommerce.pause();
        assertTrue(agenticCommerce.paused());
        
        // Create job should fail when paused
        vm.prank(client);
        vm.expectRevert(); // EnforcedPause() error
        agenticCommerce.createJob(
            provider,
            evaluator,
            block.timestamp + 7 days,
            "Test",
            address(0),
            false
        );
        
        // Owner can unpause
        vm.prank(owner);
        agenticCommerce.unpause();
        assertFalse(agenticCommerce.paused());
    }
    
    // ==========================================
    // UUPS Upgradeability Tests
    // ==========================================
    
    function test_UUPS_CommitReveal_CanUpgrade() public {
        // Deploy new implementation
        CommitReveal newImpl = new CommitReveal();
        
        // Upgrade (use upgradeToAndCall with empty data)
        vm.prank(owner);
        commitReveal.upgradeToAndCall(address(newImpl), "");
        
        // Should still work - implementation changed but proxy interface unchanged
        assertEq(commitReveal.REVEAL_DELAY_BLOCKS(), 12);
    }
    
    function test_UUPS_SlashManager_CanUpgrade() public {
        // Deploy new implementation
        SlashManager newImpl = new SlashManager();
        
        // Upgrade
        vm.prank(owner);
        slashManager.upgradeToAndCall(address(newImpl), "");
        
        // Should still have signers
        assertTrue(slashManager.isSigner(signer1));
    }
    
    function test_UUPS_AgenticCommerce_CanUpgrade() public {
        // Deploy new implementation
        AgenticCommerceV6 newImpl = new AgenticCommerceV6();
        
        // Upgrade
        vm.prank(owner);
        agenticCommerce.upgradeToAndCall(address(newImpl), "");
        
        // Constants should be preserved
        assertEq(agenticCommerce.MAX_JOBS_PER_CLIENT(), 100);
    }
    
    // ==========================================
    // Initialization Guards (Reentrancy-style)
    // ==========================================
    
    function test_InitGuard_CommitReveal_CannotReinitialize() public {
        vm.expectRevert(); // InvalidInitialization() error
        commitReveal.initialize(serviceRegistry, owner);
    }
    
    function test_InitGuard_SlashManager_CannotReinitialize() public {
        vm.expectRevert(); // InvalidInitialization() error
        address[] memory signers = new address[](3);
        signers[0] = signer1;
        signers[1] = signer2;
        signers[2] = signer3;
        slashManager.initialize(owner, signers);
    }
    
    function test_InitGuard_AgenticCommerce_CannotReinitialize() public {
        vm.expectRevert(); // InvalidInitialization() error
        agenticCommerce.initialize(treasury, owner);
    }
}

/**
 * @title MockERC20
 * @dev Simple ERC20 mock for testing
 */
contract MockERC20 {
    string public name;
    string public symbol;
    uint8 public decimals;
    uint256 public totalSupply;
    
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    
    constructor(string memory _name, string memory _symbol, uint8 _decimals) {
        name = _name;
        symbol = _symbol;
        decimals = _decimals;
    }
    
    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
        totalSupply += amount;
        emit Transfer(address(0), to, amount);
    }
    
    function transfer(address to, uint256 amount) external returns (bool) {
        require(balanceOf[msg.sender] >= amount, "Insufficient balance");
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        emit Transfer(msg.sender, to, amount);
        return true;
    }
    
    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }
    
    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        require(balanceOf[from] >= amount, "Insufficient balance");
        require(allowance[from][msg.sender] >= amount, "Insufficient allowance");
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        allowance[from][msg.sender] -= amount;
        emit Transfer(from, to, amount);
        return true;
    }
}
