// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import {AdminRegistry, OwnableUpgradeable} from "../shared/AdminRegistry.sol";

contract AdminRegistryTest is Test {
    AdminRegistry public adminRegistry;
    address nonOwner = address(0x1234);

    function setUp() public {
        adminRegistry = new AdminRegistry();
        adminRegistry.initialize();
    }

    function test_SetHalfLifeDays_OnlyOwner() public {
        vm.prank(nonOwner);
        vm.expectRevert(
            abi.encodeWithSelector(
                OwnableUpgradeable.OwnableUnauthorizedAccount.selector,
                nonOwner
            )
        );
        adminRegistry.setHalfLifeDays(60);
    }

    function test_SetHalfLifeDays_Success() public {
        adminRegistry.setHalfLifeDays(60);
        assertEq(adminRegistry.getHalfLifeDays(), 60, "Half-life should be updated");
    }

    function test_SetHalfLifeDays_ZeroReverts() public {
        vm.expectRevert("Half-life must be positive");
        adminRegistry.setHalfLifeDays(0);
    }
}
