// SPDX-License-Identifier: MIT
pragma solidity 0.8.22;

interface IAgenticCommerceV9_Slash {
    function evaluatorStakes(address evaluator) external view returns (uint256);
    function slashByGovernance(address evaluator, uint256 slashAmount, string calldata reason) external;
}
