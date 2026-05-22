// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "forge-std/console.sol";
import {AgenticCommerceV9} from "../shared/AgenticCommerceV9.sol";
import {ServiceRegistryV2} from "../shared/ServiceRegistryV2.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {MockIdentityRegistry} from "./MockIdentityRegistry.sol";
import {MockPriceOracle} from "./TestFixtures.sol";

contract GasSnapshotTest is Test {
    AgenticCommerceV9 public agenticCommerce;
    ServiceRegistryV2 public serviceRegistry;
    MockIdentityRegistry public identityRegistry;
    MockPriceOracle public priceOracle;

    address owner = makeAddr("owner");
    address treasury = makeAddr("treasury");
    address client = makeAddr("client");
    address provider = makeAddr("provider");

    function setUp() public {
        vm.startPrank(owner);

        // Deploy AgenticCommerceV9
        priceOracle = new MockPriceOracle();
        AgenticCommerceV9 impl = new AgenticCommerceV9();
        bytes memory initData = abi.encodeWithSelector(AgenticCommerceV9.initialize.selector, treasury, address(0), address(priceOracle));
        ERC1967Proxy proxy = new ERC1967Proxy(address(impl), initData);
        agenticCommerce = AgenticCommerceV9(address(proxy));

        // Transfer ownership from test contract to owner
        agenticCommerce.transferOwnership(owner);
        agenticCommerce.acceptOwnership();

        // Set ETH minimum budget override and disable max budget check
        agenticCommerce.setMinBudgetOverride(address(0), 0.0025 ether);
        agenticCommerce.setMaxBudgetUsd(0);

        // Deploy ServiceRegistryV2 with mock identity registry
        identityRegistry = new MockIdentityRegistry();
        ServiceRegistryV2 impl2 = new ServiceRegistryV2();
        bytes memory initData2 = abi.encodeWithSelector(ServiceRegistryV2.initialize.selector, address(identityRegistry), owner);
        ERC1967Proxy proxy2 = new ERC1967Proxy(address(impl2), initData2);
        serviceRegistry = ServiceRegistryV2(address(proxy2));

        vm.stopPrank();

        // Fund test accounts
        vm.deal(client, 10 ether);
        vm.deal(provider, 1 ether);
    }

    function testGas_CreateJob() public {
        vm.prank(client);
        uint256 gasBefore = gasleft();
        agenticCommerce.createJob{value: 1 ether}(
            provider,
            1 ether,
            address(0),
            0,
            uint256(block.timestamp) + 7 days,
            "Test job",
            address(0),
            address(0),
            false,
            true,
            true,
            1 ether
        );
        uint256 gasUsed = gasBefore - gasleft();
        console.log("createJob gas used:", gasUsed);
        assertLt(gasUsed, 1_000_000, "createJob exceeds gas limit");
    }

    function testGas_CreateJobWithFund() public {
        vm.prank(client);
        uint256 gasBefore = gasleft();
        agenticCommerce.createJob{value: 1 ether}(
            provider,
            1 ether,
            address(0),
            0,
            uint256(block.timestamp) + 7 days,
            "Test job with funding",
            address(0),
            address(0),
            false,
            true,
            true,
            1 ether
        );
        uint256 gasUsed = gasBefore - gasleft();
        console.log("createJob with fund gas used:", gasUsed);
        assertLt(gasUsed, 1_200_000, "createJob with fund exceeds gas limit");
    }

    function testGas_SubmitJob() public {
        vm.prank(client);
        uint256 jobId = agenticCommerce.createJob{value: 1 ether}(
            provider,
            1 ether,
            address(0),
            0,
            uint256(block.timestamp) + 7 days,
            "Test job",
            address(0),
            address(0),
            false,
            true,
            true,
            1 ether
        );

        vm.prank(provider);
        uint256 gasBefore = gasleft();
        agenticCommerce.submit(jobId, keccak256("deliverable"));
        uint256 gasUsed = gasBefore - gasleft();
        console.log("submitJob gas used:", gasUsed);
        assertLt(gasUsed, 200_000, "submitJob exceeds gas limit");
    }

    function testGas_ApproveByClient() public {
        vm.prank(client);
        uint256 jobId = agenticCommerce.createJob{value: 1 ether}(
            provider,
            1 ether,
            address(0),
            0,
            uint256(block.timestamp) + 7 days,
            "Test job",
            address(0),
            address(0),
            false,
            true,
            true,
            1 ether
        );

        vm.prank(provider);
        agenticCommerce.submit(jobId, keccak256("deliverable"));

        vm.prank(client);
        uint256 gasBefore = gasleft();
        agenticCommerce.approveByClient(jobId);
        uint256 gasUsed = gasBefore - gasleft();
        console.log("approveByClient gas used:", gasUsed);
        assertLt(gasUsed, 200_000, "approveByClient exceeds gas limit");
    }

    function testGas_RegisterAsEvaluator() public {
        vm.deal(address(this), 0.01 ether);
        uint256 gasBefore = gasleft();
        agenticCommerce.registerAsEvaluator{value: 0.01 ether}();
        uint256 gasUsed = gasBefore - gasleft();
        console.log("registerAsEvaluator gas used:", gasUsed);
        assertLt(gasUsed, 150_000, "registerAsEvaluator exceeds gas limit");
    }
}
