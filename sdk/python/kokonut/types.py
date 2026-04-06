"""
Kokonut Agent SDK - Python Types
Type definitions for agent interactions with the Kokonut Agent Economy Stack
"""

from dataclasses import dataclass, field
from enum import IntEnum
from typing import Any, Callable, Dict, List, Optional, Set, Tuple, Union
from typing_extensions import TypedDict


# ============================================================================
# Network Configuration
# ============================================================================

NetworkName = Union["sepolia", "mainnet"]


class ContractAddresses(TypedDict, total=False):
    identityRegistry: str
    legacyReputationRegistry: str
    feedbackRegistry: str
    reputationRegistry: str
    skillRegistry: str
    serviceRegistry: str
    agenticCommerce: str
    agentReview: str
    priceOracle: str
    commitReveal: str
    slashManager: str
    usdc: str
    erc8004Registry: str


class SDKConfig(TypedDict, total=False):
    wallet: Union[str, Any]
    network: NetworkName
    rpc_url: str
    contracts: ContractAddresses


# ============================================================================
# Agent Identity (ERC-8004)
# ============================================================================


@dataclass
class AgentMetadata:
    name: str
    description: Optional[str] = None
    capabilities: Optional[List[str]] = None
    endpoints: Optional[Dict[str, str]] = None
    pricing: Optional[Dict[str, str]] = None
    images: Optional[Dict[str, str]] = None
    social: Optional[Dict[str, str]] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        result = {"name": self.name}
        if self.description:
            result["description"] = self.description
        if self.capabilities:
            result["capabilities"] = self.capabilities
        if self.endpoints:
            result["endpoints"] = self.endpoints
        if self.pricing:
            result["pricing"] = self.pricing
        if self.images:
            result["images"] = self.images
        if self.social:
            result["social"] = self.social
        if self.created_at:
            result["createdAt"] = self.created_at
        if self.updated_at:
            result["updatedAt"] = self.updated_at
        return result

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "AgentMetadata":
        return cls(
            name=data.get("name", ""),
            description=data.get("description"),
            capabilities=data.get("capabilities"),
            endpoints=data.get("endpoints"),
            pricing=data.get("pricing"),
            images=data.get("images"),
            social=data.get("social"),
            created_at=data.get("createdAt"),
            updated_at=data.get("updatedAt"),
        )


@dataclass
class Agent:
    id: int
    owner: str
    agent_uri: str
    agent_wallet: str
    is_active: bool


@dataclass
class AgentRegistrationParams:
    name: str
    description: Optional[str] = None
    capabilities: Optional[List[str]] = None
    endpoints: Optional[Dict[str, str]] = None
    social: Optional[Dict[str, str]] = None
    metadata: Optional[Dict[str, str]] = None


# ============================================================================
# Reputation
# ============================================================================


@dataclass
class ReputationData:
    average_rating: float
    total_feedbacks: int
    providers: int
    score: float


@dataclass
class FeedbackParams:
    agent: str
    task_id: Optional[int] = None
    rating: int = 0
    comment: Optional[str] = None
    metadata: Optional[Dict[str, str]] = None


# ============================================================================
# Services
# ============================================================================


@dataclass
class Service:
    id: int
    provider: str
    agent_id: int
    name: str
    description: str
    metadata_uri: str
    price: int
    payment_token: str
    is_active: bool
    created_at: int


@dataclass
class ServiceParams:
    agent_id: int
    name: str
    description: str
    metadata_uri: Optional[str] = None
    price: int = 0
    payment_token: Optional[str] = None


# ============================================================================
# Commerce / Jobs
# ============================================================================


class JobStatus(IntEnum):
    PENDING = 0
    FUNDED = 1
    SUBMITTED = 2
    COMPLETED = 3
    CANCELLED = 4
    REJECTED = 5


@dataclass
class Job:
    id: int
    client: str
    provider: str
    evaluator: str
    description: str
    budget: int
    expired_at: int
    status: JobStatus
    hook: str
    deliverable: str


@dataclass
class JobParams:
    provider: str
    description: str
    evaluator: Optional[str] = None
    expired_at: Optional[int] = None
    hook: Optional[str] = None


# ============================================================================
# Agent Review (A/B Evaluation)
# ============================================================================


class ProposalStatus(IntEnum):
    OPEN = 0
    UNDER_REVIEW = 1
    DECIDED = 2
    CANCELLED = 3


@dataclass
class Proposal:
    id: int
    proposer: str
    title: str
    description: str
    criteria_uri: str
    reward: int
    status: ProposalStatus
    created_at: int
    decision_deadline: int
    winning_evaluator: str


@dataclass
class Evaluation:
    proposal_id: int
    evaluator: str
    confidence_score: int
    reasoning_uri: str
    stake_amount: int
    is_final: bool
    submitted_at: int
    reward_claimed: bool = False
    stake_released: bool = False
    reward_amount: int = 0


@dataclass
class ProposalParams:
    title: str
    description: str
    reward: int
    decision_deadline: int
    criteria_uri: Optional[str] = None


@dataclass
class EvaluationParams:
    proposal_id: Union[int, str]
    confidence_score: int
    reasoning_uri: Optional[str] = None


# ============================================================================
# SDK Events
# ============================================================================


@dataclass
class AgentRegisteredEvent:
    agent_id: int
    owner: str


@dataclass
class ServiceCreatedEvent:
    service_id: int
    provider: str


@dataclass
class JobCreatedEvent:
    job_id: int
    client: str
    provider: str


@dataclass
class JobFundedEvent:
    job_id: int
    budget: int


@dataclass
class JobSubmittedEvent:
    job_id: int


@dataclass
class PaymentReleasedEvent:
    job_id: int
    amount: int
    recipient: str


@dataclass
class ProposalCreatedEvent:
    proposal_id: int
    proposer: str


@dataclass
class EvaluationSubmittedEvent:
    proposal_id: int
    evaluator: str
    score: int


@dataclass
class DecisionAttestedEvent:
    proposal_id: int
    winner: str


@dataclass
class FeedbackSubmittedEvent:
    agent: str
    rating: int


SDKEventMap = Union[
    AgentRegisteredEvent,
    ServiceCreatedEvent,
    JobCreatedEvent,
    JobFundedEvent,
    JobSubmittedEvent,
    PaymentReleasedEvent,
    ProposalCreatedEvent,
    EvaluationSubmittedEvent,
    DecisionAttestedEvent,
    FeedbackSubmittedEvent,
]

SDKEventName = str
SDKEventHandler = Callable[[SDKEventMap], None]

# ============================================================================
# SDK Result Types
# ============================================================================


@dataclass
class TransactionResult:
    hash: str
    provider: Any

    async def wait(self) -> Any:
        return self.provider.eth.wait_for_transaction_receipt(self.hash)


@dataclass
class PaginatedResult:
    items: List[Any]
    total: int
    page: int
    page_size: int
    has_more: bool


# ============================================================================
# Error Types
# ============================================================================


class SDKError(Exception):
    def __init__(
        self, message: str, code: Optional[str] = None, details: Optional[Dict] = None
    ):
        super().__init__(message)
        self.message = message
        self.code = code
        self.details = details or {}


class NetworkError(SDKError):
    def __init__(self, message: str, rpc_url: Optional[str] = None):
        super().__init__(message, "NETWORK_ERROR")
        self.rpc_url = rpc_url


class ContractError(SDKError):
    def __init__(
        self, message: str, contract: Optional[str] = None, method: Optional[str] = None
    ):
        super().__init__(message, "CONTRACT_ERROR")
        self.contract = contract
        self.method = method


class TransactionError(SDKError):
    def __init__(self, message: str, hash: Optional[str] = None, receipt: Any = None):
        super().__init__(message, "TRANSACTION_ERROR")
        self.hash = hash
        self.receipt = receipt


# ============================================================================
# Utility Types
# ============================================================================

Address = str


@dataclass
class USDCDenomination:
    raw: int
    formatted: float


def parse_usdc(amount: int) -> USDCDenomination:
    return USDCDenomination(raw=amount, formatted=amount / 1_000_000)


def format_usdc(amount: float) -> int:
    return int(amount * 1_000_000)


# ============================================================================
# Network Configurations
# ============================================================================

NETWORKS: Dict[str, Dict[str, Any]] = {
    "sepolia": {
        "name": "Sepolia Testnet",
        "chain_id": 11155111,
        "rpc_url": "https://ethereum-sepolia.publicnode.com",
        "explorer_url": "https://sepolia.etherscan.io",
        "contracts": {
            # ERC-8004 Official Registries
            "erc8004_registry": "0x8004A818BFB912233c491871b3d84c89A494BD9e",
            "erc8004_reputation": "0x8004B663056A597Dffe9eCcC1965A193B7388713",
            # Kokonut Contracts
            "skill_registry": "0x7cf16C00ed4831EB9eE3a8765831968F0a28f53D",
            "service_registry": "0x26773D3578400E37fbEA9397c80E8d71D67c749e",
            "agentic_commerce": "0x8E5AD4C87262A1d758E12702DE830f83d1e8D4b5",
            "agent_review": "0xb63bb35f5dbae2ff2d154fade900ef85735ba7d3",
            "price_oracle": "0x5C4AC3dAF76708DCd51911BA3B33027eAB1B4047",
            "commit_reveal": "0x6CEd1574A3dF7ec646e43DD8408300117c453Aa3",
            "slash_manager": "0x7Cf955900FD7a12680E90D834eAf19346f5DBcf9",
            "usdc": "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
        },
    },
    "mainnet": {
        "name": "Ethereum Mainnet",
        "chain_id": 1,
        "rpc_url": "https://eth.llamarpc.com",
        "explorer_url": "https://etherscan.io",
        "contracts": {
            # Mainnet deployment required
            "erc8004_registry": "0x0000000000000000000000000000000000000000",
            "erc8004_reputation": "0x0000000000000000000000000000000000000000",
            "skill_registry": "0x0000000000000000000000000000000000000000",
            "service_registry": "0x0000000000000000000000000000000000000000",
            "agentic_commerce": "0x0000000000000000000000000000000000000000",
            "agent_review": "0x0000000000000000000000000000000000000000",
            "price_oracle": "0x0000000000000000000000000000000000000000",
            "commit_reveal": "0x0000000000000000000000000000000000000000",
            "slash_manager": "0x0000000000000000000000000000000000000000",
            "usdc": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
        },
    },
}
