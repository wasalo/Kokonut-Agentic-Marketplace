# Deterministic Deployments & Factory Patterns

Skill for implementing factory patterns, CREATE2 deployments, and deterministic addresses in the Kokonut Agent Economy stack.

## Installation

```
install-skill deterministic-deploy
```

## Overview

This skill covers three related concepts for deploying smart contracts with predictable, deterministic addresses:

| Pattern | Description | Use Case |
|---------|------------|----------|
| **Factory** | Contract that deploys other contracts | Mass deploying services, jobs |
| **CREATE2** | Opcode for deterministic deployment | Predictable addresses before deployment |
| **Deterministic Address** | Pre-computed address | Cross-chain references, user onboarding |

---

## Current State

The Kokonut codebase currently uses:

| Approach | Status | Details |
|----------|--------|---------|
| UUPS Proxies | ✅ Active | All main contracts use OpenZeppelin UUPS |
| CREATE2 | ❌ Not Used | Available in OZ but not implemented |
| Deterministic Addresses | ❌ Not Used | Static config only |
| Factories | ❌ Not Used | No factory contracts |

---

## Use Cases for Kokonut

### 1. Service Instance Factories

Deploy service instances per agent without manual setup:

```solidity
// Deploy new ServiceInstance for each agent
contract ServiceFactory {
    function createServiceInstance(uint256 agentId) external returns (address instance) {
        instance = Clones.clone(serviceTemplate);
        ServiceInstance(instance).initialize(agentId);
    }
}
```

### 2. CREATE2 for Agent Wallets

Deploy agent wallet proxies with deterministic addresses:

```solidity
// Predict agent wallet address before deployment
function predictWalletAddress(uint256 agentId) public view returns (address) {
    bytes32 salt = keccak256(abi.encodePacked(agentId));
    return Clones.predictDeterministicAddress(
        walletTemplate,
        salt,
        address(this)
    );
}

// Deploy with CREATE2
function deployWallet(uint256 agentId) external returns (address wallet) {
    bytes32 salt = keccak256(abi.encodePacked(agentId));
    wallet = Clones.cloneDeterministic(walletTemplate, salt);
}
```

### 3. Deterministic Job Proxies

Create job proxies with predictable addresses for cross-chain messaging:

```solidity
// Predict job proxy address
function predictJobProxy(uint256 jobId) public view returns (address) {
    return Clones.predictDeterministicAddress(
        jobProxyTemplate,
        keccak256(abi.encodePacked(jobId)),
        address(this)
    );
}
```

---

## Implementation Guide

### Step 1: Add Clones Library

The OpenZeppelin Clones library is already available:

```solidity
import { Clones } from "@openzeppelin/contracts/proxy/Clones.sol";
```

Location: `lib/openzeppelin-contracts/contracts/proxy/Clones.sol`

### Step 2: Create Factory Contract

```solidity
// contracts/shared/ServiceFactory.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { Clones } from "@openzeppelin/contracts/proxy/Clones.sol";
import { Initializable } from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

contract ServiceFactory is Initializable {
    using Clones for address;

    address public implementation;
    mapping(uint256 => address) public serviceInstances;
    uint256 public instanceCount;

    event ServiceInstanceCreated(uint256 indexed agentId, address instance);

    function initialize(address _implementation) external initializer {
        implementation = _implementation;
    }

    function createInstance(uint256 agentId) external returns (address instance) {
        instance = implementation.clone();
        ServiceInstance(instance).initialize(agentId);
        serviceInstances[agentId] = instance;
        instanceCount++;
        emit ServiceInstanceCreated(agentId, instance);
    }

    function predictInstanceAddress(uint256 agentId) external view returns (address) {
        bytes32 salt = keccak256(abi.encodePacked(agentId, instanceCount));
        return implementation.predictDeterministicAddress(salt);
    }
}
```

### Step 3: Deploy with CREATE2 in Script

```solidity
// scripts/DeployFactory.s.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { Script } from "forge-std/Script.sol";
import { ServiceFactory } from "../contracts/shared/ServiceFactory.sol";

contract DeployFactory is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        address implementation = 0x...; // Your implementation address

        ServiceFactory factory = new ServiceFactory();
        factory.initialize(implementation);

        vm.stopBroadcast();
    }
}
```

### Step 4: Frontend Integration

```typescript
// apps/web/lib/contracts/factory.ts

import { getContractAddress } from './config';
import { readContract } from 'viem';

const FACTORY_ABI = [
  'function predictInstanceAddress(uint256 agentId) view returns (address)',
  'function serviceInstances(uint256 agentId) view returns (address)',
] as const;

export async function predictServiceAddress(agentId: bigint): Promise<`0x${string}`> {
  const factoryAddress = getContractAddress('SERVICE_FACTORY');
  
  // First check if already deployed
  const existing = await readContract({
    address: factoryAddress,
    abi: FACTORY_ABI,
    functionName: 'serviceInstances',
    args: [agentId],
  });
  
  if (existing !== '0x0000000000000000000000000000000000000000') {
    return existing;
  }
  
  // Predict deterministic address
  return await readContract({
    address: factoryAddress,
    abi: FACTORY_ABI,
    functionName: 'predictInstanceAddress',
    args: [agentId],
  });
}
```

---

## CREATE2 Deep Dive

### How CREATE2 Works

```
CREATE2 = keccak256(0xff + deployer + salt + bytecode_hash)
```

| Component | Size | Description |
|-----------|------|-------------|
| `0xff` | 1 byte | Constant to distinguish from CREATE |
| `deployer` | 20 bytes | Address deploying |
| `salt` | 32 bytes | User-defined bytes32 |
| `bytecode_hash` | 32 bytes | Keccak256 of init code |

### Salt Strategies

| Strategy | Example | Use Case |
|----------|---------|----------|
| Sequential | `keccak256(abi.encodePacked(counter++))` | Unique per deploy |
| Agent-based | `keccak256(abi.encodePacked(agentId))` | One per agent |
| User-specified | `keccak256(abi.encodePacked(user, nonce))` | User-controlled |
| Multichain | `keccak256(abi.encodePacked(agentId, chainId))` | Same address on all chains |

### Important: Initialization Code

For CREATE2, you need **initialization code** that returns the runtime bytecode:

```solidity
// This bytecode creates a proxy that runs initialization
bytes memory initCode = abi.encodePacked(
    type(InitializableProxy).creationCode,
    abi.encode(initializationData)
);

// Deploy with CREATE2
address instance = deployer.deploy{ value: value }(initCode, salt);
```

---

## OpenZeppelin Clones API

```solidity
// Deploy minimal proxy (EIP-1167)
Clones.clone(address implementation) returns (address instance)

// Deploy minimal proxy at deterministic address
Clones.cloneDeterministic(
    address implementation,
    bytes32 salt
) returns (address instance)

// Predict address before deployment
Clones.predictDeterministicAddress(
    address implementation,
    bytes32 salt
) returns (address predicted)

// Clone with initialized data
Clones.cloneDeterministic(
    address implementation,
    bytes32 salt,
    bytes data
) returns (address instance)
```

---

## Security Considerations

### 1. Initialization Security

Unlike CREATE, CREATE2 can deploy to the same address if:
- Same implementation
- Same salt
- Different initialization data

**Always initialize in a way that prevents re-initialization:**

```solidity
function initialize(uint256 agentId) external initializer {
    require(agentId > 0, "Already initialized");
    _agentId = agentId;
}
```

### 2. Front-Running Protection

If salt includes user input, attackers can front-run:

**Bad:**
```solidity
// Attacker watches mempool, deploys first with same salt
function create(bytes32 salt) external {
    Clones.cloneDeterministic(template, salt);
}
```

**Good:**
```solidity
// Use commit-reveal for salt
mapping(bytes32 => bool) public committed;

function commit(bytes32 hash) external {
    committed[hash] = true;
}

function create(bytes32 salt, bytes32 secret) external {
    bytes32 hash = keccak256(abi.encodePacked(salt, secret));
    require(committed[hash], "Not committed");
    delete committed[hash];
    
    bytes32 actualSalt = keccak256(abi.encodePacked(salt, msg.sender));
    Clones.cloneDeterministic(template, actualSalt);
}
```

### 3. Access Control

```solidity
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";

contract ServiceFactory is Ownable {
    address public allowedTemplate;
    
    function setTemplate(address _template) external onlyOwner {
        allowedTemplate = _template;
    }
}
```

---

## Multi-Chain Strategy

### Same Address on All Chains

Using CREATE2 with the same salt and implementation:

```solidity
bytes32 constant SALT = bytes32(uint256(keccak256("kokonut.service.v1")));

function deployServiceOnAllChains() external {
    // All chains: 0x1234...
    address instance = Clones.cloneDeterministic(implementation, SALT);
}
```

### Cross-Chain References

Store deterministic addresses in contracts:

```solidity
struct ChainAddress {
    uint256 chainId;
    address instance;
}

mapping(uint256 => address) public instancesByChain;

function setInstance(uint256 chainId, address instance) external onlyOwner {
    instancesByChain[chainId] = instance;
}

function getInstance(uint256 chainId) external view returns (address) {
    return instancesByChain[chainId];
}
```

---

## Testing

```solidity
// test/ServiceFactory.t.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { Test, console } from "forge-std/Test.sol";
import { ServiceFactory } from "../contracts/shared/ServiceFactory.sol";

contract ServiceFactoryTest is Test {
    ServiceFactory public factory;
    address public implementation = address(0x123);

    function setUp() public {
        factory = new ServiceFactory();
        factory.initialize(implementation);
    }

    function testPredictAddress() public view {
        address predicted = factory.predictInstanceAddress(1);
        console.log("Predicted:", predicted);
    }

    function testCreateAndVerify() public {
        address instance = factory.createInstance(1);
        assertEq(factory.serviceInstances(1), instance);
    }

    function testDeterministic() public {
        address instance1 = factory.createInstance(100);
        
        // Deploy new factory
        ServiceFactory factory2 = new ServiceFactory();
        factory2.initialize(implementation);
        
        // Same agentId = same address
        address instance2 = factory2.createInstance(100);
        assertEq(instance1, instance2);
    }
}
```

---

## Common Issues

### 1. "Bytecode mismatch" Error

**Cause:** Implementation address changed or initialization code wrong.

**Fix:** Verify the implementation address matches exactly.

### 2. "Address already used" Error

**Cause:** Salt already used with different initialization.

**Fix:** Use unique salt (add nonce or timestamp).

### 3. Frontend Prediction Mismatch

**Cause:** Chain ID not included in salt.

**Fix:** Include chainId in salt:
```solidity
bytes32 salt = keccak256(abi.encodePacked(agentId, block.chainid));
```

---

## Related Files

- Clones library: `lib/openzeppelin-contracts/contracts/proxy/Clones.sol`
- Existing proxies: `contracts/proxies/`
- UUPS pattern: `contracts/shared/AgenticCommerceV7.sol`
- Deployment scripts: `contracts/script/`

---

## Next Steps

To implement in Kokonut:

1. Create factory contracts in `contracts/shared/`
2. Add factory addresses to `lib/contracts/config.ts`
3. Add frontend utilities in `apps/web/lib/contracts/`
4. Deploy and verify CREATE2 addresses match predictions
5. Update AGENTS.md documentation
