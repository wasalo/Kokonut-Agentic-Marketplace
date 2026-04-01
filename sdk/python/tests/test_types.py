"""
Kokonut Agent SDK - Python Tests
"""

import pytest
from kokonut.types import (
    NETWORKS,
    parse_usdc,
    format_usdc,
    AgentMetadata,
    AgentRegistrationParams,
    ServiceParams,
    JobParams,
    JobStatus,
    ReputationData,
    ContractAddresses,
    SDKConfig,
)


class TestNetworks:
    def test_sepolia_config(self):
        assert "sepolia" in NETWORKS
        assert NETWORKS["sepolia"]["chain_id"] == 11155111
        assert (
            NETWORKS["sepolia"]["contracts"]["identity_registry"]
            == "0x1Ba1bB0D66091076bD36e79205695Da91f0f4DA1"
        )

    def test_mainnet_config(self):
        assert "mainnet" in NETWORKS
        assert NETWORKS["mainnet"]["chain_id"] == 1
        assert (
            NETWORKS["mainnet"]["contracts"]["usdc"]
            == "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"
        )


class TestUSDCConversion:
    def test_parse_usdc(self):
        result = parse_usdc(1000000)
        assert result.raw == 1000000
        assert result.formatted == 1.0

    def test_parse_usdc_decimal(self):
        result = parse_usdc(1500000)
        assert result.formatted == 1.5

    def test_parse_usdc_zero(self):
        result = parse_usdc(0)
        assert result.formatted == 0.0

    def test_format_usdc(self):
        result = format_usdc(1.0)
        assert result == 1000000

    def test_format_usdc_decimal(self):
        result = format_usdc(1.5)
        assert result == 1500000

    def test_format_usdc_rounding(self):
        result = format_usdc(1.999)
        assert result == 1999000


class TestAgentMetadata:
    def test_create_metadata(self):
        metadata = AgentMetadata(
            name="TestAgent",
            description="A test agent",
            capabilities=["data-analysis", "web3"],
        )
        assert metadata.name == "TestAgent"
        assert metadata.description == "A test agent"
        assert "data-analysis" in metadata.capabilities

    def test_to_dict(self):
        metadata = AgentMetadata(
            name="TestAgent",
            capabilities=["test"],
        )
        d = metadata.to_dict()
        assert d["name"] == "TestAgent"
        assert d["capabilities"] == ["test"]

    def test_from_dict(self):
        data = {
            "name": "TestAgent",
            "description": "Test",
            "capabilities": ["test"],
        }
        metadata = AgentMetadata.from_dict(data)
        assert metadata.name == "TestAgent"
        assert metadata.description == "Test"


class TestServiceParams:
    def test_create_service_params(self):
        params = ServiceParams(
            name="Test Service",
            description="A test service",
            price=1000000,
        )
        assert params.name == "Test Service"
        assert params.price == 1000000


class TestJobParams:
    def test_create_job_params(self):
        params = JobParams(
            provider="0x" + "11" * 20,
            description="Test job",
        )
        assert params.provider == "0x" + "11" * 20
        assert params.description == "Test job"

    def test_job_params_with_evaluator(self):
        params = JobParams(
            provider="0x" + "11" * 20,
            description="Test job",
            evaluator="0x" + "22" * 20,
        )
        assert params.evaluator == "0x" + "22" * 20


class TestJobStatus:
    def test_job_status_values(self):
        assert JobStatus.PENDING == 0
        assert JobStatus.FUNDED == 1
        assert JobStatus.SUBMITTED == 2
        assert JobStatus.COMPLETED == 3
        assert JobStatus.CANCELLED == 4
        assert JobStatus.REJECTED == 5


class TestReputationData:
    def test_create_reputation_data(self):
        data = ReputationData(
            average_rating=85.5,
            total_feedbacks=10,
            providers=5,
            score=8.55,
        )
        assert data.average_rating == 85.5
        assert data.total_feedbacks == 10
        assert data.score == 8.55


class TestContractAddresses:
    def test_contract_addresses_dict(self):
        addresses: ContractAddresses = {
            "identity_registry": "0x" + "11" * 20,
            "usdc": "0x" + "22" * 20,
        }
        assert addresses["identity_registry"] == "0x" + "11" * 20


class TestSDKConfig:
    def test_sdk_config(self):
        config: SDKConfig = {
            "wallet": "0x" + "aa" * 32,
            "network": "sepolia",
        }
        assert config["wallet"] == "0x" + "aa" * 32
        assert config["network"] == "sepolia"

    def test_sdk_config_with_contracts(self):
        config: SDKConfig = {
            "wallet": "0x" + "aa" * 32,
            "network": "sepolia",
            "contracts": {
                "identity_registry": "0x" + "11" * 20,
            },
        }
        assert config["contracts"]["identity_registry"] == "0x" + "11" * 20
