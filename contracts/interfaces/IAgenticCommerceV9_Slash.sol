// SPDX-License-Identifier: MIT
pragma solidity 0.8.22;

interface IAgenticCommerceV9_Slash {
    function slashByGovernance(address evaluator, string calldata reason) external;
}
