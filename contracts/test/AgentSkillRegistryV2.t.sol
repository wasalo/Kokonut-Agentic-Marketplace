// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {AgentSkillRegistryV2} from "../shared/AgentSkillRegistryV2.sol";
import {MockERC721} from "./TestFixtures.sol";

contract AgentSkillRegistryV2Test is Test {
    AgentSkillRegistryV2 public registry;
    MockERC721 public identity;

    address public agentOwner = makeAddr("agentOwner");

    function setUp() public {
        identity = new MockERC721("Agents", "AGENT");
        identity.mint(agentOwner, 1);

        AgentSkillRegistryV2 implementation = new AgentSkillRegistryV2();
        bytes memory initData = abi.encodeCall(AgentSkillRegistryV2.initialize, (address(identity)));
        ERC1967Proxy proxy = new ERC1967Proxy(address(implementation), initData);
        registry = AgentSkillRegistryV2(address(proxy));
    }

    function testFindSkillsByDomainReturnsIndexedSkill() public {
        string[] memory domains = new string[](2);
        domains[0] = "data-analysis";
        domains[1] = "web3";

        vm.prank(agentOwner);
        uint256 skillId = registry.registerSkill(
            1,
            "Data Agent",
            "1.0.0",
            "Analyzes datasets",
            "https://agent.example",
            domains
        );

        uint256[] memory results = registry.findSkillsByDomain("data-analysis");

        assertEq(results.length, 1);
        assertEq(results[0], skillId);
    }

    function testFindSkillsByDomainTracksUpdatesAndDeactivation() public {
        string[] memory firstDomains = new string[](1);
        firstDomains[0] = "data-analysis";

        vm.prank(agentOwner);
        uint256 skillId = registry.registerSkill(
            1,
            "Data Agent",
            "1.0.0",
            "Analyzes datasets",
            "https://agent.example",
            firstDomains
        );

        string[] memory secondDomains = new string[](1);
        secondDomains[0] = "legal";

        vm.prank(agentOwner);
        registry.updateSkill(
            skillId,
            "Legal Agent",
            "1.1.0",
            "Reviews contracts",
            "https://legal.example",
            secondDomains
        );

        assertEq(registry.findSkillsByDomain("data-analysis").length, 0);

        uint256[] memory updatedResults = registry.findSkillsByDomain("legal");
        assertEq(updatedResults.length, 1);
        assertEq(updatedResults[0], skillId);

        vm.prank(agentOwner);
        registry.deactivateSkill(skillId);

        assertEq(registry.findSkillsByDomain("legal").length, 0);
    }
}
