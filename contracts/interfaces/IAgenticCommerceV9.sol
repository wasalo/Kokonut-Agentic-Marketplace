// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IAgenticCommerceV9 {
    
    enum JobStatus {
        Open,
        Funded,
        Submitted,
        Completed,
        Rejected,
        Expired,
        PendingClientApproval
    }
    
    struct Job {
        uint256 id;
        address client;
        address provider;
        address evaluator;
        uint256 serviceId;
        IERC20 paymentToken;
        string description;
        uint256 budget;
        uint256 expiredAt;
        JobStatus status;
        address hook;
        bytes32 deliverable;
    }
    function createJob(
        address provider,
        uint256 budget,
        address paymentToken,
        uint256 serviceId,
        uint256 expiredAt,
        string calldata description,
        address evaluator,
        address hook,
        bool evaluatorFee,
        bool clientReview_,
        bool fundNow,
        uint256 fundAmount
    ) external payable returns (uint256 jobId);
    
    function createJobV7(
        address provider,
        address evaluator,
        uint256 expiredAt,
        string calldata description,
        address hook,
        bool evaluatorFee,
        bool clientReview_
    ) external returns (uint256 jobId);
    
    function setBudget(uint256 jobId, uint256 amount) external;
    function setPaymentToken(uint256 jobId, address paymentToken) external;
    function fund(uint256 jobId, uint256 expectedBudget) external payable;
    function submit(uint256 jobId, bytes32 deliverable) external;
    function approveByClient(uint256 jobId) external;
    function finalizeByEvaluator(uint256 jobId, bytes32 reason) external;

    // V6 Lifecycle Recovery Functions
    function reject(uint256 jobId, bytes32 reason) external;
    function claimRefund(uint256 jobId) external;
    function refundExpired(uint256 jobId) external;
    function completeAfterTimeout(uint256 jobId, bytes32 reason) external;
    function setDisputeWindow(uint256 jobId, uint256 window) external;
    function setNonResponsiveSlashBP(uint256 jobId, uint256 slashBP) external;

    // V9: Multi-token minimum budget
    function minBudgetUsd() external view returns (uint256);
    function maxBudgetUsd() external view returns (uint256);
    function minBudgetOverride(address token) external view returns (uint256);
    function isStablecoin(address token) external view returns (bool);
    function getMinBudget(address token, uint8 decimals) external view returns (uint256);
    function setMinBudgetUsd(uint256 newMin) external;
    function setMaxBudgetUsd(uint256 newMax) external;
    function setMinBudgetOverride(address token, uint256 minAmount) external;
    function setStablecoin(address token, bool isStable) external;

    // Admin
    function setAllowedToken(address token, bool allowed) external;
    function setPlatformTreasury(address _treasury) external;
    function setAdminRegistry(address _registry) external;
    function pause() external;
    function unpause() external;

    // Evaluator pool
    function registerAsEvaluator() external payable;
    function unregisterAsEvaluator() external;
    function cleanupStaleEvaluators() external returns (uint256 removedCount);
    function getEvaluatorPoolSize() external view returns (uint256);
    
    // Views (public state variables auto-generate getters)
    function jobCounter() external view returns (uint256);
    function clientJobCount(address client) external view returns (uint256);
    function evaluatorFeeEnabled(uint256 jobId) external view returns (bool);
    function requiresClientReview(uint256 jobId) external view returns (bool);
    function clientApproved(uint256 jobId) external view returns (bool);
    function allowedTokens(address token) external view returns (bool);
}