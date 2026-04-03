// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol";

/**
 * @title AgenticCommerceProxy
 * @dev Transparent Upgradeable Proxy for AgenticCommerceV5
 * 
 * This proxy allows:
 * - Upgradeable implementation via UUPS
 * - Separate admin for proxy admin operations
 * - Gas-efficient upgrades (UUPS)
 */
contract AgenticCommerceProxy is TransparentUpgradeableProxy {
    /**
     * @dev Constructor
     * @param _implementation The implementation address
     * @param _admin The proxy admin address
     * @param _initData The initialization data
     */
    constructor(
        address _implementation,
        address _admin,
        bytes memory _initData
    ) TransparentUpgradeableProxy(_implementation, _admin, _initData) {}
}
