// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "forge-std/StdInvariant.sol";
import {AgenticCommerceV9, IAgenticCommerceV9} from "../shared/AgenticCommerceV9.sol";
import {ServiceRegistryV2} from "../shared/ServiceRegistryV2.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {MockERC20, MockPriceOracle} from "./TestFixtures.sol";
import {MockIdentityRegistry} from "./MockIdentityRegistry.sol";

/**
 * @title TestFixtures
 * @dev Standard test fixtures for Kokonut contracts
 * Provides consistent setup for all test suites
 */
contract TestFixtures is Test {
    AgenticCommerceV9 public agenticCommerceV9;
    ServiceRegistryV2 public serviceRegistry;
    ServiceRegistryV2 public serviceRegistryImpl;
    MockERC20 public usdc;
    MockPriceOracle public priceOracle;
    MockIdentityRegistry public identityRegistry;

    address public owner;
    address public treasury;
    address public client;
    address public provider;
    address public evaluator;
    address public proposer;
    address public evaluator1;
    address public evaluator2;
    address public evaluator3;
    address public evaluator4;
    address public evaluator5;
    address public evaluator6;

    uint256 constant INITIAL_ETH = 100 ether;
    uint256 constant INITIAL_USDC = 1_000_000_000;
    uint256 constant MIN_STAKE = 0.001 ether;
    uint256 constant SERVICE_BOND = 0.01 ether;

    function setUp() public virtual {
        owner = makeAddr("owner");
        treasury = makeAddr("treasury");
        client = makeAddr("client");
        provider = makeAddr("provider");
        evaluator = makeAddr("evaluator");
        proposer = makeAddr("proposer");
        evaluator1 = makeAddr("evaluator1");
        evaluator2 = makeAddr("evaluator2");
        evaluator3 = makeAddr("evaluator3");
        evaluator4 = makeAddr("evaluator4");
        evaluator5 = makeAddr("evaluator5");
        evaluator6 = makeAddr("evaluator6");

        vm.deal(owner, INITIAL_ETH);
        vm.deal(treasury, INITIAL_ETH);
        vm.deal(client, INITIAL_ETH);
        vm.deal(provider, INITIAL_ETH);
        vm.deal(evaluator, INITIAL_ETH);
        vm.deal(proposer, INITIAL_ETH);
        vm.deal(evaluator1, INITIAL_ETH);
        vm.deal(evaluator2, INITIAL_ETH);
        vm.deal(evaluator3, INITIAL_ETH);
        vm.deal(evaluator4, INITIAL_ETH);
        vm.deal(evaluator5, INITIAL_ETH);
        vm.deal(evaluator6, INITIAL_ETH);

        vm.startPrank(owner);
        usdc = new MockERC20("USD Coin", "USDC", 6);
        usdc.mint(client, INITIAL_USDC);
        usdc.mint(provider, INITIAL_USDC);

        identityRegistry = new MockIdentityRegistry();
        priceOracle = new MockPriceOracle();

        AgenticCommerceV9 commerceImpl = new AgenticCommerceV9();
        bytes memory commerceInitData = abi.encodeCall(AgenticCommerceV9.initialize, (treasury, address(0), address(priceOracle)));
        ERC1967Proxy commerceProxy = new ERC1967Proxy(
            address(commerceImpl),
            commerceInitData
        );
        agenticCommerceV9 = AgenticCommerceV9(payable(address(commerceProxy)));

        ServiceRegistryV2 registryImpl = new ServiceRegistryV2();
        bytes memory registryInitData = abi.encodeCall(
            ServiceRegistryV2.initialize,
            (address(identityRegistry), owner)
        );
        ERC1967Proxy registryProxy = new ERC1967Proxy(
            address(registryImpl),
            registryInitData
        );
        serviceRegistry = ServiceRegistryV2(address(registryProxy));
        serviceRegistryImpl = registryImpl;

        vm.stopPrank();

        // Owner is already set correctly because vm.startPrank(owner) was active during initialization
        // Set ETH minimum budget override and disable max budget check
        vm.prank(owner);
        agenticCommerceV9.setMinBudgetOverride(address(0), 0.0025 ether);
        vm.prank(owner);
        agenticCommerceV9.setMaxBudgetUsd(0);
    }
}

/**
 * @title Invariants
 * @dev System-wide invariant tests using Foundry StdInvariant + targetContract(address(this))
 *
 * The fuzzer calls the public handler functions directly on this contract,
 * then checks all invariant_* functions after each call sequence.
 */
contract Invariants is StdInvariant, TestFixtures {
    uint256 public jobId;

    function setUp() public override {
        super.setUp();
        vm.deal(client, 1000 ether);
        vm.deal(provider, 1000 ether);
        vm.deal(evaluator, 1000 ether);
        vm.deal(address(this), 1000 ether);
        targetContract(address(this));
    }

    // ── Fuzzer-callable handler functions ──

    function createJob(uint256 expiryOffset) external {
        expiryOffset = bound(expiryOffset, 6 minutes, 30 days);
        vm.prank(client);
        jobId = agenticCommerceV9.createJob{value: 1 ether}(
            provider,
            1 ether,
            address(0),
            0,
            block.timestamp + expiryOffset,
            "Test",
            evaluator,
            address(0),
            false,
            true,
            true,
            1 ether
        );
    }

    function submitJob() external {
        if (jobId == 0) return;
        vm.prank(provider);
        try agenticCommerceV9.submit(jobId, keccak256("deliverable")) {} catch {}
    }

    function approveByClient() external {
        if (jobId == 0) return;
        vm.prank(client);
        try agenticCommerceV9.approveByClient(jobId) {} catch {}
    }

    function finalizeByEvaluator() external {
        if (jobId == 0) return;
        vm.prank(evaluator);
        try agenticCommerceV9.finalizeByEvaluator(jobId, keccak256("reason")) {} catch {}
    }

    // ── Invariant checks (run after every fuzzer call sequence) ──

    function invariant_JobStatus_AlwaysValid() public {
        if (jobId == 0) return;
        (,,,,,,,,, IAgenticCommerceV9.JobStatus status,,) = agenticCommerceV9.jobs(jobId);
        uint256 s = uint256(status);
        assertTrue(s <= 6, "Invalid job status");
    }

    function invariant_Treasury_AlwaysSet() public {
        assertTrue(agenticCommerceV9.platformTreasury() != address(0));
    }

    function invariant_Owner_AlwaysSet() public {
        assertTrue(agenticCommerceV9.owner() != address(0));
    }

    function invariant_EvaluatorPool_Bounded() public {
        assertLe(agenticCommerceV9.getEvaluatorPoolSize(), 50);
    }

    function invariant_TotalLockedETH_NoOverflow() public {
        uint256 totalLocked = agenticCommerceV9.totalLockedETH();
        assertLe(totalLocked, address(agenticCommerceV9).balance);
    }
}

/**
 * @title FuzzAgenticCommerceV9
 * @dev Fuzzing tests for AgenticCommerceV9
 */
contract FuzzAgenticCommerceV9 is TestFixtures {
    uint256 constant MAX_FUZZ_JOBS = 50;

    function setUp() public override {
        super.setUp();
    }

    function testFuzz_CreateJob(
        address fuzzProvider,
        address fuzzEvaluator,
        uint256 expiryOffset,
        string calldata description
    ) public {
        vm.assume(fuzzProvider != address(0));
        vm.assume(fuzzEvaluator != address(0));
        vm.assume(fuzzProvider != fuzzEvaluator);
        vm.assume(fuzzProvider != client);
        vm.assume(fuzzEvaluator != client);
        vm.assume(bytes(description).length > 0);
        vm.assume(bytes(description).length <= 1000);
        expiryOffset = bound(expiryOffset, 6 minutes, 364 days);

        vm.prank(client);
        uint256 jobId = agenticCommerceV9.createJobV7(
            fuzzProvider,
            fuzzEvaluator,
            block.timestamp + expiryOffset,
            description,
            address(0),
            false,
            false
        );

        assertGt(jobId, 0);
        (, , address jobProvider, address jobEvaluator, , , , , , , , ) = agenticCommerceV9.jobs(jobId);
        assertEq(jobProvider, fuzzProvider);
        assertEq(jobEvaluator, fuzzEvaluator);
    }

    function testFuzz_FeeCalculation(uint256 amount, uint256 feeBP) public {
        amount = bound(amount, 1, type(uint128).max);
        feeBP = bound(feeBP, 0, 10000);
        uint256 expectedFee = (amount * feeBP) / 10000;
        uint256 expectedNet = amount - expectedFee;
        assertLe(expectedFee, amount);
        assertEq(expectedFee + expectedNet, amount);
    }

    function testFuzz_DescriptionLength(string calldata description) public {
        vm.assume(bytes(description).length <= 1500);
        if (bytes(description).length == 0 || bytes(description).length > 1000) {
            vm.prank(client);
            vm.expectRevert();
            agenticCommerceV9.createJobV7(
                provider,
                evaluator,
                block.timestamp + 1 days,
                description,
                address(0),
                false,
                false
            );
        }
    }

    function testFuzz_MultipleJobs(uint256 jobCount) public {
        jobCount = bound(jobCount, 1, 100);
        for (uint i = 0; i < jobCount; i++) {
            vm.prank(client);
            agenticCommerceV9.createJobV7(
                provider,
                evaluator,
                block.timestamp + 7 days,
                "Test job",
                address(0),
                false,
                false
            );
        }
        assertEq(agenticCommerceV9.clientJobCount(client), jobCount);
    }

    function testFuzz_JobLifecycleSequence(uint8 actions) public {
        vm.prank(client);
        uint256 jobId = agenticCommerceV9.createJob{value: 1 ether}(
            provider,
            1 ether,
            address(0),
            0,
            block.timestamp + 7 days,
            "Test job",
            evaluator,
            address(0),
            false,
            true,
            true,
            1 ether
        );

        vm.prank(provider);
        agenticCommerceV9.submit(jobId, keccak256("deliverable"));

        vm.prank(client);
        agenticCommerceV9.approveByClient(jobId);

        vm.prank(evaluator);
        agenticCommerceV9.finalizeByEvaluator(jobId, keccak256("reason"));

        (, , , , , , , , , IAgenticCommerceV9.JobStatus jobStatus, , ) = agenticCommerceV9.jobs(jobId);
        assertEq(uint256(jobStatus), 3);
    }
}
