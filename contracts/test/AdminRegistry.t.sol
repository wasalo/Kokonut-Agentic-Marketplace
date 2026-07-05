// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import {AdminRegistry} from "../shared/AdminRegistry.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

contract AdminRegistryTest is Test {
    AdminRegistry public adminRegistry;
    address nonOwner = address(0x1234);

    function setUp() public {
        AdminRegistry impl = new AdminRegistry();
        ERC1967Proxy proxy = new ERC1967Proxy(
            address(impl),
            abi.encodeWithSelector(AdminRegistry.initialize.selector)
        );
        adminRegistry = AdminRegistry(address(proxy));
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
        vm.expectRevert(AdminRegistry.HalfLifeMustBePositive.selector);
        adminRegistry.setHalfLifeDays(0);
    }
}
