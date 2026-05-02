// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test, console2} from "forge-std/Test.sol";
import {CommitReveal} from "../shared/CommitReveal.sol";
import {TransparentUpgradeableProxy} from "@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol";

contract CommitRevealTest is Test {
    CommitReveal public commitReveal;
    address public owner = address(this);
    address public serviceRegistry = address(0x1234);

    function setUp() public {
        CommitReveal impl = new CommitReveal();
        bytes memory initData = abi.encodeCall(CommitReveal.initialize, (serviceRegistry, owner));
        TransparentUpgradeableProxy proxy = new TransparentUpgradeableProxy(address(impl), owner, initData);
        commitReveal = CommitReveal(payable(address(proxy)));
    }

    function test_commit() public {
        bytes32 commitment = keccak256(abi.encode("test"));
        bytes32 commitmentHash = commitReveal.commit(commitment);

        assertTrue(commitmentHash != bytes32(0));
    }

    function test_commit_ZeroCommitment() public {
        vm.expectRevert(abi.encodeWithSelector(CommitReveal.CommitReveal_Zero_commitment.selector));
        commitReveal.commit(bytes32(0));
    }

    function test_getCommitment() public {
        bytes32 commitment = keccak256(abi.encode("test"));
        bytes32 commitmentHash = commitReveal.commit(commitment);

        CommitReveal.Commitment memory commitmentData = commitReveal.getCommitment(commitmentHash);
        assertTrue(commitmentData.commitmentHash != bytes32(0));
    }

    function test_getUserCommitments() public {
        bytes32 commitment1 = keccak256(abi.encode("test1"));
        bytes32 commitment2 = keccak256(abi.encode("test2"));
        
        commitReveal.commit(commitment1);
        commitReveal.commit(commitment2);

        bytes32[] memory userCommitments = commitReveal.getUserCommitments(address(this));
        assertEq(userCommitments.length, 2);
    }

    function test_isCommitmentValid() public {
        bytes32 commitment = keccak256(abi.encode("test"));
        bytes32 commitmentHash = commitReveal.commit(commitment);

        bool isValid = commitReveal.isCommitmentValid(commitmentHash);
        assertTrue(isValid);
    }

    function test_cancel() public {
        bytes32 commitment = keccak256(abi.encode("test"));
        bytes32 commitmentHash = commitReveal.commit(commitment);

        commitReveal.cancel(commitmentHash);

        bool isValid = commitReveal.isCommitmentValid(commitmentHash);
        assertFalse(isValid);
    }

    function test_updateServiceRegistry() public {
        address newRegistry = address(0x5678);
        commitReveal.updateServiceRegistry(newRegistry);
        
        // Function should not revert
        assertTrue(true);
    }

    function test_revealDelay() public {
        assertEq(commitReveal.REVEAL_DELAY_BLOCKS(), 12);
    }
}
