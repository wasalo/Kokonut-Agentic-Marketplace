// SPDX-License-Identifier: MIT
pragma solidity 0.8.22;

import "@openzeppelin/contracts/utils/introspection/IERC165.sol";

/**
 * @title IACPHook
 * @dev Interface for Agentic Commerce Protocol hooks (ERC-8183)
 * 
 * Hooks extend the core ACP protocol without modifying it.
 * They are called before and after core functions.
 */
interface IACPHook is IERC165 {
    /**
     * @dev Called before a core action executes
     * @param jobId The job ID
     * @param selector The function selector being called
     * @param data Encoded function parameters
     */
    function beforeAction(
        uint256 jobId, 
        bytes4 selector, 
        bytes calldata data
    ) external;
    
    /**
     * @dev Called after a core action executes
     * @param jobId The job ID
     * @param selector The function selector that was called
     * @param data Encoded function parameters
     */
    function afterAction(
        uint256 jobId, 
        bytes4 selector, 
        bytes calldata data
    ) external;
}
