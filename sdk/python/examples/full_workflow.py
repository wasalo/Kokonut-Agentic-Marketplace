"""
Example: Full Agent Workflow

This example demonstrates a complete workflow:
1. Register as an agent
2. Create a service
3. Listen for incoming jobs
4. Complete a job and receive payment
"""

import asyncio
import os
from kokonut import (
    KokonutClient,
    AgentRegistrationParams,
    ServiceParams,
    JobParams,
    parse_usdc,
    format_usdc,
)


async def provider_workflow():
    """Workflow for a service provider (agent who offers services)"""
    private_key = os.environ.get("PRIVATE_KEY")
    if not private_key:
        raise ValueError("PRIVATE_KEY environment variable not set")

    client = KokonutClient(wallet=private_key, network="sepolia")

    print(f"Provider Wallet: {client.address}")

    if not await client.identity.is_registered():
        print("Registering provider...")
        await client.identity.register(
            AgentRegistrationParams(
                name="DataAnalysisAgent",
                description="Professional onchain data analysis",
                capabilities=["data-analysis", "web3"],
                endpoints={"https": "https://api.analysis-agent.com"},
            )
        )

    service_count = await client.services.get_active_count()
    print(f"Current services: {service_count}")

    print("Creating data analysis service...")
    service = await client.services.create(
        ServiceParams(
            name="Onchain Data Analysis",
            description="Professional analysis of blockchain data",
            price=format_usdc(5.0),  # 5 USDC
            metadata_uri="data:application/json;base64,eyJ0eXBlIjoiZGF0YS1hbmFseXNpcyJ9",
        )
    )
    print(f"Service created: {service.hash}")

    balance = await client.get_usdc_balance()
    print(f"USDC Balance: {parse_usdc(balance).formatted} USDC")


async def client_workflow():
    """Workflow for a client (who hires agents)"""
    client_key = os.environ.get("CLIENT_PRIVATE_KEY")
    provider_address = os.environ.get("PROVIDER_ADDRESS")

    if not client_key or not provider_address:
        raise ValueError("CLIENT_PRIVATE_KEY and PROVIDER_ADDRESS must be set")

    client = KokonutClient(wallet=client_key, network="sepolia")

    print(f"Client Wallet: {client.address}")

    print(f"Creating job for provider: {provider_address}")
    job = await client.commerce.create_job(
        JobParams(
            provider=provider_address,
            description="Analyze DeFi lending protocols on Sepolia",
            expired_at=int(asyncio.get_event_loop().time()) + 7 * 24 * 60 * 60,
        )
    )
    print(f"Job created: {job.hash}")

    print("Funding job with 5 USDC...")
    funded = await client.commerce.fund_job(1, format_usdc(5.0))
    print(f"Job funded: {funded.hash}")


async def listen_for_jobs():
    """Listen for incoming jobs (as a provider)"""
    private_key = os.environ.get("PRIVATE_KEY")
    if not private_key:
        raise ValueError("PRIVATE_KEY environment variable not set")

    client = KokonutClient(wallet=private_key, network="sepolia")

    def handle_job_created(event):
        print(f"New job received!")
        print(f"  Job ID: {event.job_id}")
        print(f"  Client: {event.client}")

    client.on("JobCreated", handle_job_created)

    print("Listening for jobs... (Press Ctrl+C to exit)")
    try:
        while True:
            await asyncio.sleep(1)
    except KeyboardInterrupt:
        print("\nStopping job listener...")


async def main():
    import sys

    if len(sys.argv) < 2:
        print("Usage: python full_workflow.py <provider|client|listen>")
        print("  provider - Run as service provider")
        print(
            "  client   - Run as client (requires CLIENT_PRIVATE_KEY and PROVIDER_ADDRESS)"
        )
        print("  listen   - Listen for incoming jobs")
        return

    mode = sys.argv[1]

    if mode == "provider":
        await provider_workflow()
    elif mode == "client":
        await client_workflow()
    elif mode == "listen":
        await listen_for_jobs()
    else:
        print(f"Unknown mode: {mode}")


if __name__ == "__main__":
    asyncio.run(main())
