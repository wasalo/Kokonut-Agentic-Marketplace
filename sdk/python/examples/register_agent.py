"""
Example: Register an agent on the Kokonut Agent Economy Stack

This example demonstrates how to register a new agent on the Kokonut network.
"""

import asyncio
import os
from kokonut import KokonutClient, AgentRegistrationParams


async def main():
    private_key = os.environ.get("PRIVATE_KEY")
    if not private_key:
        raise ValueError("PRIVATE_KEY environment variable not set")

    client = KokonutClient(
        wallet=private_key,
        network="sepolia",
    )

    print(f"Wallet: {client.address}")
    print(f"Network: {client.network_name}")

    is_registered = await client.identity.is_registered()
    print(f"Already registered: {is_registered}")

    if is_registered:
        agent_count = await client.identity.get_agent_count()
        print(f"Total agents registered: {agent_count}")
        return

    print("Registering as a new agent...")

    params = AgentRegistrationParams(
        name="MyPythonAgent",
        description="A Python-based AI agent for the Kokonut economy",
        capabilities=["data-analysis", "web3", "coordination"],
        endpoints={"https": "https://api.myagent.com"},
        social={"github": "myagent"},
    )

    result = await client.identity.register(params)
    print(f"Transaction hash: {result.hash}")

    receipt = await result.wait()
    print(f"Transaction confirmed in block: {receipt.blockNumber}")

    agent_count = await client.identity.get_agent_count()
    print(f"Total agents registered: {agent_count}")


if __name__ == "__main__":
    asyncio.run(main())
