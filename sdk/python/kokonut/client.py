"""
Kokonut Agent SDK - Main Client
Type-safe client for interacting with the Kokonut Agent Economy Stack
"""

import asyncio
import base64
import json
import time
from typing import Any, Callable, Dict, List, Optional, Set, TypeVar, Union

from web3 import Web3
from web3.contract import Contract
from web3.exceptions import ContractLogicError

from .types import (
    Address,
    Agent,
    AgentMetadata,
    AgentRegistrationParams,
    AgentRegisteredEvent,
    ContractAddresses,
    DecisionAttestedEvent,
    Evaluation,
    EvaluationParams,
    EvaluationSubmittedEvent,
    FeedbackParams,
    Job,
    JobCreatedEvent,
    JobFundedEvent,
    JobParams,
    JobStatus,
    JobSubmittedEvent,
    NETWORKS,
    NetworkError,
    NetworkName,
    Proposal,
    ProposalCreatedEvent,
    ProposalParams,
    ProposalStatus,
    ReputationData,
    SDKConfig,
    SDKEventHandler,
    SDKEventMap,
    SDKEventName,
    Service,
    ServiceCreatedEvent,
    ServiceParams,
    TransactionResult,
)


# ============================================================================
# ABIs (Minimal for SDK operations)
# ============================================================================

IDENTITY_REGISTRY_ABI = [
    {
        "inputs": [{"internalType": "string", "name": "agentURI", "type": "string"}],
        "name": "register",
        "outputs": [{"internalType": "uint256", "name": "agentId", "type": "uint256"}],
        "stateMutability": "nonpayable",
        "type": "function",
    },
    {
        "inputs": [{"internalType": "uint256", "name": "agentId", "type": "uint256"}],
        "name": "getAgent",
        "outputs": [
            {"internalType": "address", "name": "owner", "type": "address"},
            {"internalType": "string", "name": "agentURI", "type": "string"},
            {"internalType": "address", "name": "agentWallet", "type": "address"},
            {"internalType": "bool", "name": "isActive", "type": "bool"},
        ],
        "stateMutability": "view",
        "type": "function",
    },
    {
        "inputs": [
            {"internalType": "address", "name": "agentAddress", "type": "address"}
        ],
        "name": "isAgent",
        "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
        "stateMutability": "view",
        "type": "function",
    },
    {
        "inputs": [],
        "name": "getCurrentAgentId",
        "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function",
    },
    {
        "anonymous": False,
        "inputs": [
            {
                "indexed": True,
                "internalType": "uint256",
                "name": "agentId",
                "type": "uint256",
            },
            {
                "indexed": False,
                "internalType": "string",
                "name": "agentURI",
                "type": "string",
            },
            {
                "indexed": True,
                "internalType": "address",
                "name": "owner",
                "type": "address",
            },
        ],
        "name": "Registered",
        "type": "event",
    },
]

LEGACY_REPUTATION_ABI = [
    {
        "inputs": [
            {"internalType": "address", "name": "agent", "type": "address"},
            {"internalType": "uint256", "name": "taskId", "type": "uint256"},
            {"internalType": "int256", "name": "rating", "type": "int256"},
            {"internalType": "string", "name": "metadataURI", "type": "string"},
        ],
        "name": "submitFeedback",
        "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
        "stateMutability": "nonpayable",
        "type": "function",
    },
    {
        "inputs": [{"internalType": "address", "name": "agent", "type": "address"}],
        "name": "getAgentReputation",
        "outputs": [
            {"internalType": "int256", "name": "average", "type": "int256"},
            {"internalType": "uint256", "name": "total", "type": "uint256"},
            {"internalType": "uint256", "name": "providers", "type": "uint256"},
        ],
        "stateMutability": "view",
        "type": "function",
    },
]

SERVICE_REGISTRY_ABI = [
    {
        "inputs": [
            {"internalType": "uint256", "name": "agentId", "type": "uint256"},
            {"internalType": "string", "name": "name", "type": "string"},
            {"internalType": "string", "name": "description", "type": "string"},
            {"internalType": "string", "name": "metadataURI", "type": "string"},
            {"internalType": "uint256", "name": "price", "type": "uint256"},
            {"internalType": "address", "name": "paymentToken", "type": "address"},
        ],
        "name": "createService",
        "outputs": [
            {"internalType": "uint256", "name": "serviceId", "type": "uint256"}
        ],
        "stateMutability": "nonpayable",
        "type": "function",
    },
    {
        "inputs": [
            {"internalType": "uint256", "name": "serviceId", "type": "uint256"},
            {"internalType": "string", "name": "name", "type": "string"},
            {"internalType": "string", "name": "description", "type": "string"},
            {"internalType": "string", "name": "metadataURI", "type": "string"},
            {"internalType": "uint256", "name": "price", "type": "uint256"},
        ],
        "name": "updateService",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function",
    },
    {
        "inputs": [{"internalType": "uint256", "name": "serviceId", "type": "uint256"}],
        "name": "deactivateService",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function",
    },
    {
        "inputs": [{"internalType": "uint256", "name": "serviceId", "type": "uint256"}],
        "name": "getService",
        "outputs": [
            {
                "components": [
                    {"internalType": "uint256", "name": "id", "type": "uint256"},
                    {"internalType": "address", "name": "provider", "type": "address"},
                    {"internalType": "string", "name": "name", "type": "string"},
                    {"internalType": "string", "name": "description", "type": "string"},
                    {"internalType": "string", "name": "metadataURI", "type": "string"},
                    {"internalType": "uint256", "name": "price", "type": "uint256"},
                    {
                        "internalType": "address",
                        "name": "paymentToken",
                        "type": "address",
                    },
                    {"internalType": "bool", "name": "isActive", "type": "bool"},
                    {"internalType": "uint256", "name": "createdAt", "type": "uint256"},
                ],
                "internalType": "struct ServiceRegistry.Service",
                "name": "",
                "type": "tuple",
            }
        ],
        "stateMutability": "view",
        "type": "function",
    },
    {
        "inputs": [
            {"internalType": "uint256", "name": "start", "type": "uint256"},
            {"internalType": "uint256", "name": "count", "type": "uint256"},
        ],
        "name": "getServices",
        "outputs": [{"internalType": "uint256[]", "name": "", "type": "uint256[]"}],
        "stateMutability": "view",
        "type": "function",
    },
    {
        "inputs": [],
        "name": "getActiveServiceCount",
        "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function",
    },
    {
        "inputs": [{"internalType": "address", "name": "provider", "type": "address"}],
        "name": "getProviderServices",
        "outputs": [{"internalType": "uint256[]", "name": "", "type": "uint256[]"}],
        "stateMutability": "view",
        "type": "function",
    },
    {
        "anonymous": False,
        "inputs": [
            {
                "indexed": True,
                "internalType": "uint256",
                "name": "serviceId",
                "type": "uint256",
            },
            {
                "indexed": True,
                "internalType": "address",
                "name": "provider",
                "type": "address",
            },
            {
                "indexed": False,
                "internalType": "string",
                "name": "name",
                "type": "string",
            },
            {"internalType": "uint256", "name": "price", "type": "uint256"},
        ],
        "name": "ServiceCreated",
        "type": "event",
    },
]

AGENTIC_COMMERCE_ABI = [
    {
        "inputs": [
            {"internalType": "address", "name": "provider", "type": "address"},
            {"internalType": "address", "name": "evaluator", "type": "address"},
            {"internalType": "uint256", "name": "expiredAt", "type": "uint256"},
            {"internalType": "string", "name": "description", "type": "string"},
            {"internalType": "address", "name": "hook", "type": "address"},
        ],
        "name": "createJob",
        "outputs": [{"internalType": "uint256", "name": "jobId", "type": "uint256"}],
        "stateMutability": "nonpayable",
        "type": "function",
    },
    {
        "inputs": [{"internalType": "uint256", "name": "jobId", "type": "uint256"}],
        "name": "fund",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function",
    },
    {
        "inputs": [{"internalType": "uint256", "name": "jobId", "type": "uint256"}],
        "name": "submit",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function",
    },
    {
        "inputs": [{"internalType": "uint256", "name": "jobId", "type": "uint256"}],
        "name": "complete",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function",
    },
    {
        "inputs": [
            {"internalType": "uint256", "name": "jobId", "type": "uint256"},
            {"internalType": "string", "name": "reason", "type": "string"},
        ],
        "name": "reject",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function",
    },
    {
        "inputs": [{"internalType": "uint256", "name": "jobId", "type": "uint256"}],
        "name": "completeAfterTimeout",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function",
    },
    {
        "inputs": [{"internalType": "uint256", "name": "jobId", "type": "uint256"}],
        "name": "claimRefund",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function",
    },
    {
        "inputs": [{"internalType": "uint256", "name": "jobId", "type": "uint256"}],
        "name": "getJob",
        "outputs": [
            {
                "components": [
                    {"internalType": "uint256", "name": "id", "type": "uint256"},
                    {"internalType": "address", "name": "client", "type": "address"},
                    {"internalType": "address", "name": "provider", "type": "address"},
                    {"internalType": "address", "name": "evaluator", "type": "address"},
                    {"internalType": "string", "name": "description", "type": "string"},
                    {"internalType": "uint256", "name": "budget", "type": "uint256"},
                    {"internalType": "uint256", "name": "expiredAt", "type": "uint256"},
                    {"internalType": "uint8", "name": "status", "type": "uint8"},
                    {"internalType": "address", "name": "hook", "type": "address"},
                    {
                        "internalType": "bytes32",
                        "name": "deliverable",
                        "type": "bytes32",
                    },
                ],
                "internalType": "struct AgenticCommerce.Job",
                "name": "",
                "type": "tuple",
            }
        ],
        "stateMutability": "view",
        "type": "function",
    },
    {
        "inputs": [],
        "name": "getCurrentJobId",
        "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function",
    },
    {
        "inputs": [{"internalType": "address", "name": "client", "type": "address"}],
        "name": "getClientJobs",
        "outputs": [{"internalType": "uint256[]", "name": "", "type": "uint256[]"}],
        "stateMutability": "view",
        "type": "function",
    },
    {
        "anonymous": False,
        "inputs": [
            {
                "indexed": True,
                "internalType": "uint256",
                "name": "jobId",
                "type": "uint256",
            },
            {
                "indexed": True,
                "internalType": "address",
                "name": "client",
                "type": "address",
            },
            {
                "indexed": True,
                "internalType": "address",
                "name": "provider",
                "type": "address",
            },
        ],
        "name": "JobCreated",
        "type": "event",
    },
    {
        "anonymous": False,
        "inputs": [
            {
                "indexed": True,
                "internalType": "uint256",
                "name": "jobId",
                "type": "uint256",
            },
            {
                "indexed": False,
                "internalType": "uint256",
                "name": "amount",
                "type": "uint256",
            },
        ],
        "name": "JobFunded",
        "type": "event",
    },
    {
        "anonymous": False,
        "inputs": [
            {
                "indexed": True,
                "internalType": "uint256",
                "name": "jobId",
                "type": "uint256",
            },
        ],
        "name": "JobSubmitted",
        "type": "event",
    },
    {
        "anonymous": False,
        "inputs": [
            {
                "indexed": True,
                "internalType": "uint256",
                "name": "jobId",
                "type": "uint256",
            },
            {
                "indexed": False,
                "internalType": "uint256",
                "name": "payment",
                "type": "uint256",
            },
        ],
        "name": "JobCompleted",
        "type": "event",
    },
]

AGENT_REVIEW_ABI = [
    {
        "inputs": [
            {"internalType": "string", "name": "title", "type": "string"},
            {"internalType": "string", "name": "description", "type": "string"},
            {"internalType": "string", "name": "criteriaURI", "type": "string"},
            {"internalType": "uint256", "name": "reward", "type": "uint256"},
            {"internalType": "uint256", "name": "decisionDeadline", "type": "uint256"},
        ],
        "name": "createProposal",
        "outputs": [
            {"internalType": "uint256", "name": "proposalId", "type": "uint256"}
        ],
        "stateMutability": "payable",
        "type": "function",
    },
    {
        "inputs": [
            {"internalType": "uint256", "name": "proposalId", "type": "uint256"},
            {"internalType": "int256", "name": "confidenceScore", "type": "int256"},
            {"internalType": "string", "name": "reasoningURI", "type": "string"},
        ],
        "name": "submitEvaluation",
        "outputs": [],
        "stateMutability": "payable",
        "type": "function",
    },
    {
        "inputs": [
            {"internalType": "uint256", "name": "proposalId", "type": "uint256"},
            {"internalType": "address", "name": "winningEvaluator", "type": "address"},
        ],
        "name": "attestDecision",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function",
    },
    {
        "inputs": [
            {"internalType": "uint256", "name": "proposalId", "type": "uint256"}
        ],
        "name": "claimReward",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function",
    },
    {
        "inputs": [
            {"internalType": "uint256", "name": "proposalId", "type": "uint256"}
        ],
        "name": "releaseStake",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function",
    },
    {
        "inputs": [
            {"internalType": "address", "name": "evaluator", "type": "address"},
            {"internalType": "uint256", "name": "proposalId", "type": "uint256"},
            {"internalType": "string", "name": "reason", "type": "string"},
        ],
        "name": "slashEvaluator",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function",
    },
    {
        "inputs": [
            {"internalType": "address", "name": "slashManager_", "type": "address"},
        ],
        "name": "setSlashManager",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function",
    },
    {
        "inputs": [
            {"internalType": "address payable", "name": "to", "type": "address"},
            {"internalType": "uint256", "name": "amount", "type": "uint256"},
        ],
        "name": "withdrawETH",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function",
    },
    {
        "inputs": [],
        "name": "getTotalLockedETH",
        "outputs": [
            {"internalType": "uint256", "name": "totalLocked", "type": "uint256"}
        ],
        "stateMutability": "view",
        "type": "function",
    },
    {
        "inputs": [
            {"internalType": "uint256", "name": "proposalId", "type": "uint256"}
        ],
        "name": "getProposal",
        "outputs": [
            {
                "components": [
                    {"internalType": "uint256", "name": "id", "type": "uint256"},
                    {"internalType": "address", "name": "proposer", "type": "address"},
                    {"internalType": "string", "name": "title", "type": "string"},
                    {"internalType": "string", "name": "description", "type": "string"},
                    {"internalType": "string", "name": "criteriaURI", "type": "string"},
                    {"internalType": "uint256", "name": "reward", "type": "uint256"},
                    {"internalType": "uint8", "name": "status", "type": "uint8"},
                    {"internalType": "uint256", "name": "createdAt", "type": "uint256"},
                    {
                        "internalType": "uint256",
                        "name": "decisionDeadline",
                        "type": "uint256",
                    },
                    {
                        "internalType": "address",
                        "name": "winningEvaluator",
                        "type": "address",
                    },
                ],
                "internalType": "struct AgentReviewV5.Proposal",
                "name": "",
                "type": "tuple",
            }
        ],
        "stateMutability": "view",
        "type": "function",
    },
    {
        "inputs": [],
        "name": "_proposalCounter",
        "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function",
    },
    {
        "inputs": [
            {"internalType": "uint256", "name": "proposalId", "type": "uint256"},
            {"internalType": "address", "name": "evaluator", "type": "address"},
        ],
        "name": "getEvaluation",
        "outputs": [
            {
                "components": [
                    {
                        "internalType": "uint256",
                        "name": "proposalId",
                        "type": "uint256",
                    },
                    {"internalType": "address", "name": "evaluator", "type": "address"},
                    {
                        "internalType": "int256",
                        "name": "confidenceScore",
                        "type": "int256",
                    },
                    {
                        "internalType": "string",
                        "name": "reasoningURI",
                        "type": "string",
                    },
                    {
                        "internalType": "uint256",
                        "name": "stakeAmount",
                        "type": "uint256",
                    },
                    {"internalType": "bool", "name": "isFinal", "type": "bool"},
                    {"internalType": "bool", "name": "rewardClaimed", "type": "bool"},
                    {"internalType": "bool", "name": "stakeReleased", "type": "bool"},
                    {
                        "internalType": "uint256",
                        "name": "submittedAt",
                        "type": "uint256",
                    },
                    {
                        "internalType": "uint256",
                        "name": "rewardAmount",
                        "type": "uint256",
                    },
                ],
                "internalType": "struct AgentReviewV5.Evaluation",
                "name": "",
                "type": "tuple",
            }
        ],
        "stateMutability": "view",
        "type": "function",
    },
    {
        "inputs": [
            {"internalType": "uint256", "name": "proposalId", "type": "uint256"}
        ],
        "name": "getProposalEvaluators",
        "outputs": [{"internalType": "address[]", "name": "", "type": "address[]"}],
        "stateMutability": "view",
        "type": "function",
    },
    {
        "anonymous": False,
        "inputs": [
            {
                "indexed": True,
                "internalType": "uint256",
                "name": "proposalId",
                "type": "uint256",
            },
            {
                "indexed": True,
                "internalType": "address",
                "name": "proposer",
                "type": "address",
            },
            {
                "indexed": False,
                "internalType": "string",
                "name": "title",
                "type": "string",
            },
            {
                "indexed": False,
                "internalType": "uint256",
                "name": "reward",
                "type": "uint256",
            },
        ],
        "name": "ProposalCreated",
        "type": "event",
    },
    {
        "anonymous": False,
        "inputs": [
            {
                "indexed": True,
                "internalType": "uint256",
                "name": "proposalId",
                "type": "uint256",
            },
            {
                "indexed": True,
                "internalType": "address",
                "name": "evaluator",
                "type": "address",
            },
            {
                "indexed": False,
                "internalType": "int256",
                "name": "confidenceScore",
                "type": "int256",
            },
            {
                "indexed": False,
                "internalType": "uint256",
                "name": "stakeAmount",
                "type": "uint256",
            },
        ],
        "name": "EvaluationSubmitted",
        "type": "event",
    },
    {
        "anonymous": False,
        "inputs": [
            {
                "indexed": True,
                "internalType": "uint256",
                "name": "proposalId",
                "type": "uint256",
            },
            {
                "indexed": True,
                "internalType": "address",
                "name": "evaluator",
                "type": "address",
            },
            {
                "indexed": False,
                "internalType": "uint256",
                "name": "amount",
                "type": "uint256",
            },
        ],
        "name": "RewardClaimed",
        "type": "event",
    },
    {
        "anonymous": False,
        "inputs": [
            {
                "indexed": True,
                "internalType": "uint256",
                "name": "proposalId",
                "type": "uint256",
            },
            {
                "indexed": True,
                "internalType": "address",
                "name": "evaluator",
                "type": "address",
            },
            {
                "indexed": False,
                "internalType": "uint256",
                "name": "amount",
                "type": "uint256",
            },
        ],
        "name": "StakeReleased",
        "type": "event",
    },
    {
        "anonymous": False,
        "inputs": [
            {
                "indexed": True,
                "internalType": "address",
                "name": "slashManager",
                "type": "address",
            },
        ],
        "name": "SlashManagerSet",
        "type": "event",
    },
    {
        "anonymous": False,
        "inputs": [
            {
                "indexed": True,
                "internalType": "address payable",
                "name": "to",
                "type": "address",
            },
            {
                "indexed": False,
                "internalType": "uint256",
                "name": "amount",
                "type": "uint256",
            },
        ],
        "name": "ETHWithdrawn",
        "type": "event",
    },
]

USDC_ABI = [
    {
        "inputs": [
            {"internalType": "address", "name": "spender", "type": "address"},
            {"internalType": "uint256", "name": "amount", "type": "uint256"},
        ],
        "name": "approve",
        "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
        "stateMutability": "nonpayable",
        "type": "function",
    },
    {
        "inputs": [{"internalType": "address", "name": "account", "type": "address"}],
        "name": "balanceOf",
        "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function",
    },
    {
        "inputs": [
            {"internalType": "address", "name": "owner", "type": "address"},
            {"internalType": "address", "name": "spender", "type": "address"},
        ],
        "name": "allowance",
        "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function",
    },
]


# ============================================================================
# KokonutClient
# ============================================================================


class KokonutClient:
    """
    Main client for interacting with the Kokonut Agent Economy Stack.

    Example:
        >>> from kokonut import KokonutClient
        >>> client = KokonutClient(
        ...     wallet="0xYourPrivateKey",
        ...     network="sepolia"
        ... )
        >>> is_registered = await client.identity.is_registered()
        >>> print(f"Agent registered: {is_registered}")
    """

    def __init__(self, config: SDKConfig):
        self.network: NetworkName = config.get("network", "sepolia")
        network_config = NETWORKS[self.network]
        self.contracts: ContractAddresses = {
            **network_config["contracts"],
            **(config.get("contracts") or {}),
        }

        rpc_url = config.get("rpc_url") or network_config["rpc_url"]
        self.w3 = Web3(Web3.HTTPProvider(rpc_url))

        if not self.w3.is_connected():
            raise NetworkError(f"Failed to connect to {rpc_url}")

        wallet = config.get("wallet")
        if isinstance(wallet, str):
            self.account = self.w3.eth.account.from_key(wallet)
        else:
            raise ValueError("wallet must be a private key string")

        self.identity = IdentityModule(self.w3, self.account, self.contracts)
        self.reputation = ReputationModule(self.w3, self.account, self.contracts)
        self.services = ServicesModule(self.w3, self.account, self.contracts)
        self.commerce = CommerceModule(self.w3, self.account, self.contracts)
        self.review = ReviewModule(self.w3, self.account, self.contracts)

        self._event_handlers: Dict[SDKEventName, Set[SDKEventHandler]] = {}
        self._setup_event_listeners()

    def _setup_event_listeners(self):
        self.identity.on("AgentRegistered", lambda e: self._emit("AgentRegistered", e))
        self.services.on("ServiceCreated", lambda e: self._emit("ServiceCreated", e))
        self.commerce.on("JobCreated", lambda e: self._emit("JobCreated", e))
        self.commerce.on("JobFunded", lambda e: self._emit("JobFunded", e))
        self.commerce.on("JobSubmitted", lambda e: self._emit("JobSubmitted", e))
        self.commerce.on("PaymentReleased", lambda e: self._emit("PaymentReleased", e))
        self.review.on("ProposalCreated", lambda e: self._emit("ProposalCreated", e))
        self.review.on(
            "EvaluationSubmitted", lambda e: self._emit("EvaluationSubmitted", e)
        )
        self.review.on("DecisionAttested", lambda e: self._emit("DecisionAttested", e))

    def on(self, event: SDKEventName, handler: SDKEventHandler) -> None:
        if event not in self._event_handlers:
            self._event_handlers[event] = set()
        self._event_handlers[event].add(handler)

    def off(self, event: SDKEventName, handler: SDKEventHandler) -> None:
        self._event_handlers.get(event, set()).discard(handler)

    def _emit(self, event: SDKEventName, data: SDKEventMap) -> None:
        for handler in self._event_handlers.get(event, set()):
            handler(data)

    @property
    def address(self) -> Address:
        return self.account.address

    @property
    def network_name(self) -> str:
        return self.network

    @property
    def explorer_url(self) -> str:
        return NETWORKS[self.network]["explorer_url"]

    async def get_balance(self) -> int:
        return self.w3.eth.get_balance(self.account.address)

    async def get_usdc_balance(self) -> int:
        usdc = self.w3.eth.contract(
            address=self.contracts["usdc"],
            abi=USDC_ABI,
        )
        return usdc.functions.balanceOf(self.account.address).call()


# ============================================================================
# Identity Module
# ============================================================================


class IdentityModule:
    def __init__(self, w3: Web3, account: Any, contracts: ContractAddresses):
        self.w3 = w3
        self.account = account
        self.contracts = contracts

    @property
    def contract(self) -> Contract:
        return self.w3.eth.contract(
            address=self.contracts["erc8004_registry"],
            abi=IDENTITY_REGISTRY_ABI,
        )

    def _encode_metadata(self, data: AgentMetadata) -> str:
        json_str = json.dumps(data.to_dict())
        base64_str = base64.b64encode(json_str.encode()).decode()
        return f"data:application/json;base64,{base64_str}"

    def _decode_metadata(self, uri: str) -> Optional[AgentMetadata]:
        try:
            if uri.startswith("data:"):
                parts = uri.split(",")
                if len(parts) == 2 and "base64" in parts[0]:
                    decoded = base64.b64decode(parts[1]).decode()
                    return AgentMetadata.from_dict(json.loads(decoded))
            return None
        except Exception:
            return None

    async def register(self, params: AgentRegistrationParams) -> TransactionResult:
        metadata = AgentMetadata(
            name=params.name,
            description=params.description,
            capabilities=params.capabilities,
            endpoints=params.endpoints,
            social=params.social,
        )
        metadata_uri = self._encode_metadata(metadata)

        tx = self.contract.functions.register(metadata_uri).build_transaction(
            {
                "from": self.account.address,
                "gas": 200000,
                "gasPrice": self.w3.eth.gas_price,
            }
        )
        signed = self.account.sign_transaction(tx)
        hash_ = self.w3.eth.send_raw_transaction(signed.rawTransaction)
        return TransactionResult(hash=hash_.hex(), provider=self.w3)

    async def get_agent(self, agent_id: Union[int, str]) -> Agent:
        agent = self.contract.functions.getAgent(agent_id).call()
        return Agent(
            id=agent_id,
            owner=agent[0],
            agent_uri=agent[1],
            agent_wallet=agent[2],
            is_active=agent[3],
        )

    async def is_agent(self, address: Address) -> bool:
        return self.contract.functions.isAgent(address).call()

    async def get_agent_count(self) -> int:
        return self.contract.functions.getCurrentAgentId().call()

    async def is_registered(self) -> bool:
        return await self.is_agent(self.account.address)

    def on(self, event: str, handler: SDKEventHandler) -> None:
        pass  # Polling mode - use listen_for_events() instead

    async def listen_for_events(
        self,
        event: str,
        handler: SDKEventHandler,
        poll_interval: float = 5.0,
        from_block: Optional[int] = None,
    ) -> None:
        """
        Poll for events instead of using event subscriptions.

        Args:
            event: Event name to listen for ('AgentRegistered')
            handler: Callback function to handle events
            poll_interval: Seconds between polls (default 5)
            from_block: Starting block number (default: current block)
        """
        if from_block is None:
            from_block = self.w3.eth.block_number

        seen_events: Set[str] = set()

        while True:
            try:
                if event == "AgentRegistered":
                    logs = self.contract.events.Registered().get_logs(
                        fromBlock=from_block
                    )
                    for log in logs:
                        event_key = f"{log.transactionHash.hex()}-{log.logIndex}"
                        if event_key not in seen_events:
                            seen_events.add(event_key)
                            handler(
                                AgentRegisteredEvent(
                                    agent_id=log.args.agentId, owner=log.args.owner
                                )
                            )
            except Exception:
                pass

            import asyncio

            await asyncio.sleep(poll_interval)


# ============================================================================
# Reputation Module
# ============================================================================


class ReputationModule:
    def __init__(self, w3: Web3, account: Any, contracts: ContractAddresses):
        self.w3 = w3
        self.account = account
        self.contracts = contracts

    @property
    def contract(self) -> Contract:
        return self.w3.eth.contract(
            address=self.contracts["erc8004_reputation"],
            abi=LEGACY_REPUTATION_ABI,
        )

    async def submit_feedback(self, params: FeedbackParams) -> TransactionResult:
        tx = self.contract.functions.submitFeedback(
            params.agent,
            params.task_id or 0,
            params.rating,
            params.comment or "",
        ).build_transaction(
            {
                "from": self.account.address,
                "gas": 100000,
                "gasPrice": self.w3.eth.gas_price,
            }
        )
        signed = self.account.sign_transaction(tx)
        hash_ = self.w3.eth.send_raw_transaction(signed.rawTransaction)
        return TransactionResult(hash=hash_.hex(), provider=self.w3)

    async def get_reputation(self, agent: Address) -> ReputationData:
        avg, total, providers = self.contract.functions.getAgentReputation(agent).call()
        avg_float = float(avg) if avg else 0.0
        return ReputationData(
            average_rating=avg_float,
            total_feedbacks=int(total),
            providers=int(providers),
            score=avg_float / 10,
        )


# ============================================================================
# Services Module
# ============================================================================


class ServicesModule:
    def __init__(self, w3: Web3, account: Any, contracts: ContractAddresses):
        self.w3 = w3
        self.account = account
        self.contracts = contracts

    @property
    def contract(self) -> Contract:
        return self.w3.eth.contract(
            address=self.contracts["service_registry"],
            abi=SERVICE_REGISTRY_ABI,
        )

    async def create(self, params: ServiceParams) -> TransactionResult:
        tx = self.contract.functions.createService(
            params.agent_id,
            params.name,
            params.description,
            params.metadata_uri or "",
            params.price,
            params.payment_token or self.contracts["usdc"],
        ).build_transaction(
            {
                "from": self.account.address,
                "gas": 150000,
                "gasPrice": self.w3.eth.gas_price,
            }
        )
        signed = self.account.sign_transaction(tx)
        hash_ = self.w3.eth.send_raw_transaction(signed.rawTransaction)
        return TransactionResult(hash=hash_.hex(), provider=self.w3)

    async def get_service(self, service_id: Union[int, str]) -> Service:
        service = self.contract.functions.getService(service_id).call()
        return Service(
            id=service[0],
            provider=service[1],
            agent_id=service[2],
            name=service[3],
            description=service[4],
            metadata_uri=service[5],
            price=service[6],
            payment_token=service[7],
            is_active=service[8],
            created_at=service[9],
        )

    async def _get_service_safe(self, service_id: int) -> Optional[Service]:
        """Safely fetch a single service, returning None on error."""
        try:
            return await self.get_service(service_id)
        except Exception:
            return None

    async def list(self, page: int = 0, page_size: int = 20) -> List[Service]:
        start = page * page_size
        service_ids = self.contract.functions.getServices(start, page_size).call()
        # Use asyncio.gather for parallel fetching (batch RPC calls)
        results = await asyncio.gather(
            *[self._get_service_safe(sid) for sid in service_ids],
            return_exceptions=True,
        )
        return [r for r in results if isinstance(r, Service)]

    async def get_active_count(self) -> int:
        return self.contract.functions.getActiveServiceCount().call()

    async def get_provider_services(self, provider: Address) -> List[Service]:
        service_ids = self.contract.functions.getProviderServices(provider).call()
        # Use asyncio.gather for parallel fetching
        results = await asyncio.gather(
            *[self._get_service_safe(sid) for sid in service_ids],
            return_exceptions=True,
        )
        return [r for r in results if isinstance(r, Service)]

    async def get_services_by_agent(self, agent_id: int) -> List[Service]:
        service_ids = self.contract.functions.getServicesByAgent(agent_id).call()
        # Use asyncio.gather for parallel fetching
        results = await asyncio.gather(
            *[self._get_service_safe(sid) for sid in service_ids],
            return_exceptions=True,
        )
        return [r for r in results if isinstance(r, Service)]

    async def update_service(
        self,
        service_id: int,
        name: str,
        description: str,
        metadata_uri: str,
        price: int,
    ) -> TransactionResult:
        tx = self.contract.functions.updateService(
            service_id, name, description, metadata_uri, price
        ).build_transaction(
            {
                "from": self.account.address,
                "gas": 100000,
                "gasPrice": self.w3.eth.gas_price,
            }
        )
        signed = self.account.sign_transaction(tx)
        hash_ = self.w3.eth.send_raw_transaction(signed.rawTransaction)
        return TransactionResult(hash=hash_.hex(), provider=self.w3)

    async def deactivate_service(self, service_id: int) -> TransactionResult:
        tx = self.contract.functions.deactivateService(service_id).build_transaction(
            {
                "from": self.account.address,
                "gas": 50000,
                "gasPrice": self.w3.eth.gas_price,
            }
        )
        signed = self.account.sign_transaction(tx)
        hash_ = self.w3.eth.send_raw_transaction(signed.rawTransaction)
        return TransactionResult(hash=hash_.hex(), provider=self.w3)

    def on(self, event: str, handler: SDKEventHandler) -> None:
        pass  # Polling mode - use listen_for_events() instead

    async def listen_for_events(
        self,
        event: str,
        handler: SDKEventHandler,
        poll_interval: float = 5.0,
        from_block: Optional[int] = None,
    ) -> None:
        if from_block is None:
            from_block = self.w3.eth.block_number

        seen_events: Set[str] = set()

        while True:
            try:
                if event == "ServiceCreated":
                    logs = self.contract.events.ServiceCreated().get_logs(
                        fromBlock=from_block
                    )
                    for log in logs:
                        event_key = f"{log.transactionHash.hex()}-{log.logIndex}"
                        if event_key not in seen_events:
                            seen_events.add(event_key)
                            handler(
                                ServiceCreatedEvent(
                                    service_id=log.args.serviceId,
                                    provider=log.args.provider,
                                )
                            )
            except Exception:
                pass

            import asyncio

            await asyncio.sleep(poll_interval)


# ============================================================================
# Commerce Module
# ============================================================================


class CommerceModule:
    def __init__(self, w3: Web3, account: Any, contracts: ContractAddresses):
        self.w3 = w3
        self.account = account
        self.contracts = contracts

    @property
    def contract(self) -> Contract:
        return self.w3.eth.contract(
            address=self.contracts["agentic_commerce"],
            abi=AGENTIC_COMMERCE_ABI,
        )

    @property
    def usdc(self) -> Contract:
        return self.w3.eth.contract(
            address=self.contracts["usdc"],
            abi=USDC_ABI,
        )

    async def create_job(self, params: JobParams) -> TransactionResult:
        expired_at = params.expired_at or int(time.time()) + 7 * 24 * 60 * 60
        evaluator = params.evaluator or params.provider
        hook = params.hook or "0x0000000000000000000000000000000000000000"

        tx = self.contract.functions.createJob(
            params.provider,
            evaluator,
            expired_at,
            params.description,
            hook,
        ).build_transaction(
            {
                "from": self.account.address,
                "gas": 200000,
                "gasPrice": self.w3.eth.gas_price,
            }
        )
        signed = self.account.sign_transaction(tx)
        hash_ = self.w3.eth.send_raw_transaction(signed.rawTransaction)
        return TransactionResult(hash=hash_.hex(), provider=self.w3)

    async def fund_job(self, job_id: Union[int, str], amount: int) -> TransactionResult:
        allowance = self.usdc.functions.allowance(
            self.account.address,
            self.contracts["agentic_commerce"],
        ).call()

        if allowance < amount:
            approve_tx = self.usdc.functions.approve(
                self.contracts["agentic_commerce"],
                2**256 - 1,
            ).build_transaction(
                {
                    "from": self.account.address,
                    "gas": 100000,
                    "gasPrice": self.w3.eth.gas_price,
                }
            )
            signed = self.account.sign_transaction(approve_tx)
            self.w3.eth.send_raw_transaction(signed.rawTransaction)

        tx = self.contract.functions.fund(job_id).build_transaction(
            {
                "from": self.account.address,
                "gas": 150000,
                "gasPrice": self.w3.eth.gas_price,
            }
        )
        signed = self.account.sign_transaction(tx)
        hash_ = self.w3.eth.send_raw_transaction(signed.rawTransaction)
        return TransactionResult(hash=hash_.hex(), provider=self.w3)

    async def submit_job(self, job_id: Union[int, str]) -> TransactionResult:
        tx = self.contract.functions.submit(job_id).build_transaction(
            {
                "from": self.account.address,
                "gas": 100000,
                "gasPrice": self.w3.eth.gas_price,
            }
        )
        signed = self.account.sign_transaction(tx)
        hash_ = self.w3.eth.send_raw_transaction(signed.rawTransaction)
        return TransactionResult(hash=hash_.hex(), provider=self.w3)

    async def complete_job(self, job_id: Union[int, str]) -> TransactionResult:
        tx = self.contract.functions.complete(job_id).build_transaction(
            {
                "from": self.account.address,
                "gas": 100000,
                "gasPrice": self.w3.eth.gas_price,
            }
        )
        signed = self.account.sign_transaction(tx)
        hash_ = self.w3.eth.send_raw_transaction(signed.rawTransaction)
        return TransactionResult(hash=hash_.hex(), provider=self.w3)

    async def reject_job(
        self, job_id: Union[int, str], reason: str
    ) -> TransactionResult:
        tx = self.contract.functions.reject(job_id, reason).build_transaction(
            {
                "from": self.account.address,
                "gas": 100000,
                "gasPrice": self.w3.eth.gas_price,
            }
        )
        signed = self.account.sign_transaction(tx)
        hash_ = self.w3.eth.send_raw_transaction(signed.rawTransaction)
        return TransactionResult(hash=hash_.hex(), provider=self.w3)

    async def get_job(self, job_id: Union[int, str]) -> Job:
        job = self.contract.functions.getJob(job_id).call()
        return Job(
            id=job[0],
            client=job[1],
            provider=job[2],
            evaluator=job[3],
            description=job[4],
            budget=job[5],
            expired_at=job[6],
            status=JobStatus(job[7]),
            hook=job[8],
            deliverable=job[9].hex(),
        )

    async def get_my_jobs(self) -> List[Job]:
        job_ids = self.contract.functions.getClientJobs(self.account.address).call()
        jobs = []
        for jid in job_ids:
            try:
                job = await self.get_job(jid)
                jobs.append(job)
            except Exception:
                pass
        return jobs

    async def approve_usdc(self, spender: Address, amount: int) -> TransactionResult:
        tx = self.usdc.functions.approve(spender, amount).build_transaction(
            {
                "from": self.account.address,
                "gas": 100000,
                "gasPrice": self.w3.eth.gas_price,
            }
        )
        signed = self.account.sign_transaction(tx)
        hash_ = self.w3.eth.send_raw_transaction(signed.rawTransaction)
        return TransactionResult(hash=hash_.hex(), provider=self.w3)

    def on(self, event: str, handler: SDKEventHandler) -> None:
        pass  # Polling mode - use listen_for_events() instead

    async def listen_for_events(
        self,
        event: str,
        handler: SDKEventHandler,
        poll_interval: float = 5.0,
        from_block: Optional[int] = None,
    ) -> None:
        if from_block is None:
            from_block = self.w3.eth.block_number

        seen_events: Set[str] = set()

        while True:
            try:
                if event == "JobCreated":
                    logs = self.contract.events.JobCreated().get_logs(
                        fromBlock=from_block
                    )
                    for log in logs:
                        event_key = f"{log.transactionHash.hex()}-{log.logIndex}"
                        if event_key not in seen_events:
                            seen_events.add(event_key)
                            handler(
                                JobCreatedEvent(
                                    job_id=log.args.jobId,
                                    client=log.args.client,
                                    provider=log.args.provider,
                                )
                            )
                elif event == "JobFunded":
                    logs = self.contract.events.JobFunded().get_logs(
                        fromBlock=from_block
                    )
                    for log in logs:
                        event_key = f"{log.transactionHash.hex()}-{log.logIndex}"
                        if event_key not in seen_events:
                            seen_events.add(event_key)
                            handler(
                                JobFundedEvent(
                                    job_id=log.args.jobId,
                                    budget=log.args.amount,
                                )
                            )
                elif event == "JobSubmitted":
                    logs = self.contract.events.JobSubmitted().get_logs(
                        fromBlock=from_block
                    )
                    for log in logs:
                        event_key = f"{log.transactionHash.hex()}-{log.logIndex}"
                        if event_key not in seen_events:
                            seen_events.add(event_key)
                            handler(JobSubmittedEvent(job_id=log.args.jobId))
            except Exception:
                pass

            import asyncio

            await asyncio.sleep(poll_interval)


# ============================================================================
# Review Module
# ============================================================================


class ReviewModule:
    def __init__(self, w3: Web3, account: Any, contracts: ContractAddresses):
        self.w3 = w3
        self.account = account
        self.contracts = contracts

    @property
    def contract(self) -> Contract:
        return self.w3.eth.contract(
            address=self.contracts["agent_review"],
            abi=AGENT_REVIEW_ABI,
        )

    async def create_proposal(self, params: ProposalParams) -> TransactionResult:
        tx = self.contract.functions.createProposal(
            params.title,
            params.description,
            params.criteria_uri or "",
            params.reward,
            params.decision_deadline,
        ).build_transaction(
            {
                "from": self.account.address,
                "value": params.reward,
                "gas": 250000,
                "gasPrice": self.w3.eth.gas_price,
            }
        )
        signed = self.account.sign_transaction(tx)
        hash_ = self.w3.eth.send_raw_transaction(signed.rawTransaction)
        return TransactionResult(hash=hash_.hex(), provider=self.w3)

    async def submit_evaluation(self, params: EvaluationParams) -> TransactionResult:
        min_stake = self.w3.to_wei("0.001", "ether")
        tx = self.contract.functions.submitEvaluation(
            params.proposal_id,
            params.confidence_score,
            params.reasoning_uri or "",
        ).build_transaction(
            {
                "from": self.account.address,
                "value": min_stake,
                "gas": 200000,
                "gasPrice": self.w3.eth.gas_price,
            }
        )
        signed = self.account.sign_transaction(tx)
        hash_ = self.w3.eth.send_raw_transaction(signed.rawTransaction)
        return TransactionResult(hash=hash_.hex(), provider=self.w3)

    async def attest_decision(
        self, proposal_id: Union[int, str], winner: Address
    ) -> TransactionResult:
        tx = self.contract.functions.attestDecision(
            proposal_id, winner
        ).build_transaction(
            {
                "from": self.account.address,
                "gas": 100000,
                "gasPrice": self.w3.eth.gas_price,
            }
        )
        signed = self.account.sign_transaction(tx)
        hash_ = self.w3.eth.send_raw_transaction(signed.rawTransaction)
        return TransactionResult(hash=hash_.hex(), provider=self.w3)

    async def get_proposal(self, proposal_id: Union[int, str]) -> Proposal:
        proposal = self.contract.functions.getProposal(proposal_id).call()
        return Proposal(
            id=proposal[0],
            proposer=proposal[1],
            title=proposal[2],
            description=proposal[3],
            criteria_uri=proposal[4],
            reward=proposal[5],
            status=ProposalStatus(proposal[6]),
            created_at=proposal[7],
            decision_deadline=proposal[8],
            winning_evaluator=proposal[9],
        )

    async def get_evaluation(
        self, proposal_id: Union[int, str], evaluator: Address
    ) -> Evaluation:
        eval_ = self.contract.functions.getEvaluation(proposal_id, evaluator).call()
        return Evaluation(
            proposal_id=eval_[0],
            evaluator=eval_[1],
            confidence_score=eval_[2],
            reasoning_uri=eval_[3],
            stake_amount=eval_[4],
            is_final=eval_[5],
            submitted_at=eval_[6],
            reward_claimed=eval_[7] if len(eval_) > 7 else False,
            stake_released=eval_[8] if len(eval_) > 8 else False,
            reward_amount=eval_[9] if len(eval_) > 9 else 0,
        )

    async def get_proposal_count(self) -> int:
        return self.contract.functions._proposalCounter().call()

    async def claim_reward(self, proposal_id: Union[int, str]) -> TransactionResult:
        tx = self.contract.functions.claimReward(proposal_id).build_transaction(
            {
                "from": self.account.address,
                "gas": 100000,
                "gasPrice": self.w3.eth.gas_price,
            }
        )
        signed = self.account.sign_transaction(tx)
        hash_ = self.w3.eth.send_raw_transaction(signed.rawTransaction)
        return TransactionResult(hash=hash_.hex(), provider=self.w3)

    async def release_stake(self, proposal_id: Union[int, str]) -> TransactionResult:
        tx = self.contract.functions.releaseStake(proposal_id).build_transaction(
            {
                "from": self.account.address,
                "gas": 100000,
                "gasPrice": self.w3.eth.gas_price,
            }
        )
        signed = self.account.sign_transaction(tx)
        hash_ = self.w3.eth.send_raw_transaction(signed.rawTransaction)
        return TransactionResult(hash=hash_.hex(), provider=self.w3)

    async def get_proposal_evaluators(
        self, proposal_id: Union[int, str]
    ) -> List[Address]:
        return self.contract.functions.getProposalEvaluators(proposal_id).call()

    async def get_total_locked_eth(self) -> int:
        return self.contract.functions.getTotalLockedETH().call()

    def on(self, event: str, handler: SDKEventHandler) -> None:
        pass  # Polling mode - use listen_for_events() instead

    async def listen_for_events(
        self,
        event: str,
        handler: SDKEventHandler,
        poll_interval: float = 5.0,
        from_block: Optional[int] = None,
    ) -> None:
        if from_block is None:
            from_block = self.w3.eth.block_number

        seen_events: Set[str] = set()

        while True:
            try:
                if event == "ProposalCreated":
                    logs = self.contract.events.ProposalCreated().get_logs(
                        fromBlock=from_block
                    )
                    for log in logs:
                        event_key = f"{log.transactionHash.hex()}-{log.logIndex}"
                        if event_key not in seen_events:
                            seen_events.add(event_key)
                            handler(
                                ProposalCreatedEvent(
                                    proposal_id=log.args.proposalId,
                                    proposer=log.args.proposer,
                                )
                            )
                elif event == "EvaluationSubmitted":
                    logs = self.contract.events.EvaluationSubmitted().get_logs(
                        fromBlock=from_block
                    )
                    for log in logs:
                        event_key = f"{log.transactionHash.hex()}-{log.logIndex}"
                        if event_key not in seen_events:
                            seen_events.add(event_key)
                            handler(
                                EvaluationSubmittedEvent(
                                    proposal_id=log.args.proposalId,
                                    evaluator=log.args.evaluator,
                                    score=log.args.confidenceScore,
                                )
                            )
                elif event == "DecisionAttested":
                    logs = self.contract.events.DecisionAttested().get_logs(
                        fromBlock=from_block
                    )
                    for log in logs:
                        event_key = f"{log.transactionHash.hex()}-{log.logIndex}"
                        if event_key not in seen_events:
                            seen_events.add(event_key)
                            handler(
                                DecisionAttestedEvent(
                                    proposal_id=log.args.proposalId,
                                    winner=log.args.winner,
                                )
                            )
            except Exception:
                pass

            import asyncio

            await asyncio.sleep(poll_interval)


# ============================================================================
# Skills Module (AgentSkillRegistry)
# ============================================================================

SKILL_REGISTRY_ABI = [
    {
        "inputs": [
            {"internalType": "uint256", "name": "agentId", "type": "uint256"},
            {"internalType": "string", "name": "name", "type": "string"},
            {"internalType": "string", "name": "version", "type": "string"},
            {"internalType": "string", "name": "description", "type": "string"},
            {"internalType": "string", "name": "endpoint", "type": "string"},
            {"internalType": "string[]", "name": "domains", "type": "string[]"},
        ],
        "name": "registerSkill",
        "outputs": [{"internalType": "uint256", "name": "skillId", "type": "uint256"}],
        "stateMutability": "nonpayable",
        "type": "function",
    },
    {
        "inputs": [{"internalType": "uint256", "name": "agentId", "type": "uint256"}],
        "name": "getAgentSkills",
        "outputs": [{"internalType": "uint256[]", "name": "", "type": "uint256[]"}],
        "stateMutability": "view",
        "type": "function",
    },
    {
        "inputs": [{"internalType": "uint256", "name": "skillId", "type": "uint256"}],
        "name": "getSkill",
        "outputs": [
            {"internalType": "uint256", "name": "agentId", "type": "uint256"},
            {"internalType": "string", "name": "name", "type": "string"},
            {"internalType": "string", "name": "version", "type": "string"},
            {"internalType": "string", "name": "description", "type": "string"},
            {"internalType": "string", "name": "endpoint", "type": "string"},
            {"internalType": "string[]", "name": "domains", "type": "string[]"},
            {"internalType": "bool", "name": "isActive", "type": "bool"},
            {"internalType": "address", "name": "registeredBy", "type": "address"},
            {"internalType": "uint256", "name": "registeredAt", "type": "uint256"},
        ],
        "stateMutability": "view",
        "type": "function",
    },
    {
        "inputs": [{"internalType": "uint256", "name": "skillId", "type": "uint256"}],
        "name": "deactivateSkill",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function",
    },
]


@dataclass
class Skill:
    id: int
    agent_id: int
    name: str
    version: str
    description: str
    endpoint: str
    domains: List[str]
    is_active: bool
    registered_by: str
    registered_at: int


class SkillsModule:
    def __init__(self, w3: Web3, account: Any, contracts: ContractAddresses):
        self.w3 = w3
        self.account = account
        self.contracts = contracts

    @property
    def contract(self) -> Contract:
        return self.w3.eth.contract(
            address=self.contracts["skill_registry"],
            abi=SKILL_REGISTRY_ABI,
        )

    async def register_skill(
        self,
        agent_id: int,
        name: str,
        version: str,
        description: str,
        endpoint: str,
        domains: List[str],
    ) -> TransactionResult:
        tx = self.contract.functions.registerSkill(
            agent_id, name, version, description, endpoint, domains
        ).build_transaction(
            {
                "from": self.account.address,
                "gas": 200000,
                "gasPrice": self.w3.eth.gas_price,
            }
        )
        signed = self.account.sign_transaction(tx)
        hash_ = self.w3.eth.send_raw_transaction(signed.rawTransaction)
        return TransactionResult(hash=hash_.hex(), provider=self.w3)

    async def get_agent_skills(self, agent_id: int) -> List[int]:
        return self.contract.functions.getAgentSkills(agent_id).call()

    async def get_skill(self, skill_id: int) -> Skill:
        skill = self.contract.functions.getSkill(skill_id).call()
        return Skill(
            id=skill_id,
            agent_id=skill[0],
            name=skill[1],
            version=skill[2],
            description=skill[3],
            endpoint=skill[4],
            domains=skill[5],
            is_active=skill[6],
            registered_by=skill[7],
            registered_at=skill[8],
        )

    async def deactivate_skill(self, skill_id: int) -> TransactionResult:
        tx = self.contract.functions.deactivateSkill(skill_id).build_transaction(
            {
                "from": self.account.address,
                "gas": 50000,
                "gasPrice": self.w3.eth.gas_price,
            }
        )
        signed = self.account.sign_transaction(tx)
        hash_ = self.w3.eth.send_raw_transaction(signed.rawTransaction)
        return TransactionResult(hash=hash_.hex(), provider=self.w3)


# ============================================================================
# PriceOracle Module
# ============================================================================

PRICE_ORACLE_ABI = [
    {
        "inputs": [],
        "name": "getUSDCPrice",
        "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function",
    },
    {
        "inputs": [],
        "name": "getETHRate",
        "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function",
    },
    {
        "inputs": [],
        "name": "isStale",
        "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
        "stateMutability": "view",
        "type": "function",
    },
]


class PriceOracleModule:
    def __init__(self, w3: Web3, contracts: ContractAddresses):
        self.w3 = w3
        self.contracts = contracts

    @property
    def contract(self) -> Contract:
        return self.w3.eth.contract(
            address=self.contracts["price_oracle"],
            abi=PRICE_ORACLE_ABI,
        )

    def get_usdc_price(self) -> int:
        return self.contract.functions.getUSDCPrice().call()

    def get_eth_rate(self) -> int:
        return self.contract.functions.getETHRate().call()

    def is_stale(self) -> bool:
        return self.contract.functions.isStale().call()


# ============================================================================
# CommitReveal Module
# ============================================================================

COMMIT_REVEAL_ABI = [
    {
        "inputs": [
            {"internalType": "bytes32", "name": "commitment", "type": "bytes32"}
        ],
        "name": "commit",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function",
    },
    {
        "inputs": [
            {"internalType": "string", "name": "data", "type": "string"},
            {"internalType": "uint256", "name": "nonce", "type": "uint256"},
            {"internalType": "uint256", "name": "serviceId", "type": "uint256"},
        ],
        "name": "reveal",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function",
    },
    {
        "inputs": [
            {"internalType": "address", "name": "user", "type": "address"},
            {"internalType": "uint256", "name": "nonce", "type": "uint256"},
        ],
        "name": "getCommitment",
        "outputs": [{"internalType": "bytes32", "name": "", "type": "bytes32"}],
        "stateMutability": "view",
        "type": "function",
    },
]


class CommitRevealModule:
    def __init__(self, w3: Web3, account: Any, contracts: ContractAddresses):
        self.w3 = w3
        self.account = account
        self.contracts = contracts

    @property
    def contract(self) -> Contract:
        return self.w3.eth.contract(
            address=self.contracts["commit_reveal"],
            abi=COMMIT_REVEAL_ABI,
        )

    async def commit(self, commitment: str) -> TransactionResult:
        tx = self.contract.functions.commit(commitment).build_transaction(
            {
                "from": self.account.address,
                "gas": 50000,
                "gasPrice": self.w3.eth.gas_price,
            }
        )
        signed = self.account.sign_transaction(tx)
        hash_ = self.w3.eth.send_raw_transaction(signed.rawTransaction)
        return TransactionResult(hash=hash_.hex(), provider=self.w3)

    async def reveal(self, data: str, nonce: int, service_id: int) -> TransactionResult:
        tx = self.contract.functions.reveal(data, nonce, service_id).build_transaction(
            {
                "from": self.account.address,
                "gas": 100000,
                "gasPrice": self.w3.eth.gas_price,
            }
        )
        signed = self.account.sign_transaction(tx)
        hash_ = self.w3.eth.send_raw_transaction(signed.rawTransaction)
        return TransactionResult(hash=hash_.hex(), provider=self.w3)

    def get_commitment(self, user: Address, nonce: int) -> str:
        return self.contract.functions.getCommitment(user, nonce).call()


# ============================================================================
# SlashManager Module
# ============================================================================

SLASH_MANAGER_ABI = [
    {
        "inputs": [
            {"internalType": "address", "name": "evaluator", "type": "address"},
            {"internalType": "uint256", "name": "proposalId", "type": "uint256"},
            {"internalType": "uint256", "name": "amount", "type": "uint256"},
            {"internalType": "string", "name": "reason", "type": "string"},
        ],
        "name": "createProposal",
        "outputs": [{"internalType": "bytes32", "name": "", "type": "bytes32"}],
        "stateMutability": "nonpayable",
        "type": "function",
    },
    {
        "inputs": [
            {"internalType": "bytes32", "name": "proposalId", "type": "bytes32"}
        ],
        "name": "confirmProposal",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function",
    },
    {
        "inputs": [
            {"internalType": "bytes32", "name": "proposalId", "type": "bytes32"}
        ],
        "name": "executeProposal",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function",
    },
    {
        "inputs": [
            {"internalType": "bytes32", "name": "proposalId", "type": "bytes32"}
        ],
        "name": "cancelProposal",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function",
    },
    {
        "inputs": [
            {"internalType": "bytes32", "name": "proposalId", "type": "bytes32"}
        ],
        "name": "getProposal",
        "outputs": [
            {"internalType": "address", "name": "evaluator", "type": "address"},
            {"internalType": "uint256", "name": "amount", "type": "uint256"},
            {"internalType": "string", "name": "reason", "type": "string"},
            {"internalType": "uint256", "name": "confirmations", "type": "uint256"},
            {"internalType": "uint256", "name": "execAfter", "type": "uint256"},
            {"internalType": "bool", "name": "isExecuted", "type": "bool"},
        ],
        "stateMutability": "view",
        "type": "function",
    },
    {
        "inputs": [{"internalType": "address", "name": "account", "type": "address"}],
        "name": "isSigner",
        "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
        "stateMutability": "view",
        "type": "function",
    },
]


@dataclass
class SlashProposal:
    evaluator: str
    amount: int
    reason: str
    confirmations: int
    exec_after: int
    is_executed: bool


class SlashManagerModule:
    def __init__(self, w3: Web3, account: Any, contracts: ContractAddresses):
        self.w3 = w3
        self.account = account
        self.contracts = contracts

    @property
    def contract(self) -> Contract:
        return self.w3.eth.contract(
            address=self.contracts["slash_manager"],
            abi=SLASH_MANAGER_ABI,
        )

    async def create_proposal(
        self, evaluator: Address, proposal_id: int, amount: int, reason: str
    ) -> TransactionResult:
        tx = self.contract.functions.createProposal(
            evaluator, proposal_id, amount, reason
        ).build_transaction(
            {
                "from": self.account.address,
                "gas": 100000,
                "gasPrice": self.w3.eth.gas_price,
            }
        )
        signed = self.account.sign_transaction(tx)
        hash_ = self.w3.eth.send_raw_transaction(signed.rawTransaction)
        return TransactionResult(hash=hash_.hex(), provider=self.w3)

    async def confirm_proposal(self, proposal_id: str) -> TransactionResult:
        tx = self.contract.functions.confirmProposal(proposal_id).build_transaction(
            {
                "from": self.account.address,
                "gas": 50000,
                "gasPrice": self.w3.eth.gas_price,
            }
        )
        signed = self.account.sign_transaction(tx)
        hash_ = self.w3.eth.send_raw_transaction(signed.rawTransaction)
        return TransactionResult(hash=hash_.hex(), provider=self.w3)

    async def execute_proposal(self, proposal_id: str) -> TransactionResult:
        tx = self.contract.functions.executeProposal(proposal_id).build_transaction(
            {
                "from": self.account.address,
                "gas": 100000,
                "gasPrice": self.w3.eth.gas_price,
            }
        )
        signed = self.account.sign_transaction(tx)
        hash_ = self.w3.eth.send_raw_transaction(signed.rawTransaction)
        return TransactionResult(hash=hash_.hex(), provider=self.w3)

    async def cancel_proposal(self, proposal_id: str) -> TransactionResult:
        tx = self.contract.functions.cancelProposal(proposal_id).build_transaction(
            {
                "from": self.account.address,
                "gas": 50000,
                "gasPrice": self.w3.eth.gas_price,
            }
        )
        signed = self.account.sign_transaction(tx)
        hash_ = self.w3.eth.send_raw_transaction(signed.rawTransaction)
        return TransactionResult(hash=hash_.hex(), provider=self.w3)

    def get_proposal(self, proposal_id: str) -> SlashProposal:
        proposal = self.contract.functions.getProposal(proposal_id).call()
        return SlashProposal(
            evaluator=proposal[0],
            amount=proposal[1],
            reason=proposal[2],
            confirmations=proposal[3],
            exec_after=proposal[4],
            is_executed=proposal[5],
        )

    def is_signer(self, account: Address) -> bool:
        return self.contract.functions.isSigner(account).call()
