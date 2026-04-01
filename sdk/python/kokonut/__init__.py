"""
Kokonut Agent SDK - Python SDK for the Kokonut Agent Economy Stack

This package provides a Python interface for interacting with the Kokonut
Agent Economy Stack on Ethereum and compatible networks.

Example:
    >>> import asyncio
    >>> from kokonut import KokonutClient, AgentRegistrationParams
    >>>
    >>> async def main():
    ...     client = KokonutClient(
    ...         wallet="0xYourPrivateKey",
    ...         network="sepolia"
    ...     )
    ...
    ...     # Check if registered
    ...     is_registered = await client.identity.is_registered()
    ...     print(f"Agent registered: {is_registered}")
    ...
    ...     # Get USDC balance
    ...     balance = await client.get_usdc_balance()
    ...     print(f"USDC Balance: {balance / 1e6} USDC")
    >>>
    >>> asyncio.run(main())
"""

from .client import KokonutClient
from .types import (
    NETWORKS,
    Address,
    Agent,
    AgentMetadata,
    AgentRegistrationParams,
    ContractAddresses,
    Evaluation,
    EvaluationParams,
    FeedbackParams,
    Job,
    JobParams,
    JobStatus,
    NetworkName,
    Proposal,
    ProposalParams,
    ProposalStatus,
    ReputationData,
    SDKConfig,
    Service,
    ServiceParams,
    TransactionResult,
    parse_usdc,
    format_usdc,
)

__version__ = "0.1.0"

__all__ = [
    "KokonutClient",
    "NETWORKS",
    "Address",
    "Agent",
    "AgentMetadata",
    "AgentRegistrationParams",
    "ContractAddresses",
    "Evaluation",
    "EvaluationParams",
    "FeedbackParams",
    "Job",
    "JobParams",
    "JobStatus",
    "NetworkName",
    "Proposal",
    "ProposalParams",
    "ProposalStatus",
    "ReputationData",
    "SDKConfig",
    "Service",
    "ServiceParams",
    "TransactionResult",
    "parse_usdc",
    "format_usdc",
]
