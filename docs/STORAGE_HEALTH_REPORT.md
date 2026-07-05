# Storage Health Report

Generated: 2026-06-01T13:12:48.014Z
Network: Sepolia (11155111)
RPC: https://ethereum-sepolia.publicnode.com

## Implementation And Layout Status

| Contract | Proxy | Manifest Impl | On-chain Impl | Impl Status | Layout Status |
|---|---|---|---|---|---|
| AgenticCommerceV9 | `0x3a1Bc03cC84040A282F6bf238b917D8351499239` | `0x3b8b4A6d3cc93D5081a286aCC7EcD4f01086c928` | `0x3b8b4a6d3cc93d5081a286acc7ecd4f01086c928` | OK | Compatible |
| ServiceRegistryV2 | `0x62E1eeEa1A2Ab987004F35bDA430457Ed6077201` | `0xe2000Ec87D00980EE912F35fefE2D365DA402BCA` | `0xe2000ec87d00980ee912f35fefe2d365da402bca` | OK | Compatible |
| AgentSkillRegistryV2 | `0xA84684261558f342d6871DD2CFef90A2117Aa20A` | `0xbf7283c4d141ca991dae6c91d29a255e7caff48d` | `0xbf7283c4d141ca991dae6c91d29a255e7caff48d` | OK | Compatible |
| BiddingSystem | `0x4D7F38C6A9DE5De44A7B789962B7A2B06bFE8fd6` | `0xde7F38E29D3c2dBDff02984BAaB5a658F0acC96a` | `0xde7f38e29d3c2dbdff02984baab5a658f0acc96a` | OK | Compatible |
| MilestoneEscrowV2 | `0xc89D63057288092012c5D3cEF66121C1F8449a9f` | `0x8F9Bae14966Af0BceE5c291A764cE3503f9D49F3` | `0x8f9bae14966af0bcee5c291a764ce3503f9d49f3` | OK | Compatible |
| PriceOracleV2 | `0x29c27a26DD2F80f840cb4D7B5E53b7db3D67143d` | `0x7Bad7cc9754814246814299ca50041a939a244b1` | `0x7bad7cc9754814246814299ca50041a939a244b1` | OK | Compatible |
| CommitReveal | `0x85F193670fCb7B0c97D55E70Bf2a950b1065Fb3a` | `0x85ac5fd55de6f19e95bed33991f11659a92dbbd2` | `0x85ac5fd55de6f19e95bed33991f11659a92dbbd2` | OK | Compatible |
| SlashManager | `0x1B8373cDF4f2eD740c3478e0129f0B8494CE4Fa3` | `0x8754Abeba49B6688dA132552b9f183FbC7acdc58` | `0x8754abeba49b6688da132552b9f183fbc7acdc58` | OK | Compatible |
| AdminRegistry | `0xC81C864CEAb6231ad764cf9867e031D8b6dee41d` | `0xE0611728f270172E1627267138BF96BfEF08F731` | `0xe0611728f270172e1627267138bf96bfef08f731` | OK | Compatible |

## Live Sanity Checks

### ServiceRegistryV2

| Check | Status | Value |
|---|---|---|
| getServiceCounter() | OK | `9` |
| getActiveServiceCount() | OK | `5` |
| agenticCommerce() | OK | `0x3a1Bc03cC84040A282F6bf238b917D8351499239` |
| slashManager() | OK | `0x1B8373cDF4f2eD740c3478e0129f0B8494CE4Fa3` |
| adminRegistry() | OK | `0xC81C864CEAb6231ad764cf9867e031D8b6dee41d` |
| getService(0) | FAIL | `Error: server returned an error response: error code 3: execution reverted: invalid encoded storage byte array accessed, data: "0x4e487b710000000000000000000000000000000000000000000000000000000000000022"` |
| getService(1) | FAIL | `Error: server returned an error response: error code 3: execution reverted: invalid encoded storage byte array accessed, data: "0x4e487b710000000000000000000000000000000000000000000000000000000000000022"` |
| getService(2) | OK | `(2, 0x0ea26051F7657d59418da186137141CeA90D0652, 0x0ea26051F7657d59418da186137141CeA90D0652, 2322, "Test", "TEst", "", 10000000 [1e7], 0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238, true, 1776954060 [1.776e9])` |
| getService(3) | OK | `(3, 0x0ea26051F7657d59418da186137141CeA90D0652, 0x0ea26051F7657d59418da186137141CeA90D0652, 2322, "Test", "a test description", "", 5000000 [5e6], 0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238, true, 1777179288 [1.777e9])` |
| getService(4) | OK | `(4, 0x0ea26051F7657d59418da186137141CeA90D0652, 0x0ea26051F7657d59418da186137141CeA90D0652, 2322, "Syntropic Farming", "A description of farming", "", 5000000 [5e6], 0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238, true, 1777293276 [1.777e9])` |
| getService(5) | OK | `(5, 0x0ea26051F7657d59418da186137141CeA90D0652, 0x0ea26051F7657d59418da186137141CeA90D0652, 2322, "A Test Service", "A Test Description", "", 8000000 [8e6], 0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238, true, 1777742892 [1.777e9])` |
| getService(6) | OK | `(6, 0x0ea26051F7657d59418da186137141CeA90D0652, 0x0ea26051F7657d59418da186137141CeA90D0652, 2366, "Test", "Testing", "", 10000000 [1e7], 0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238, true, 1777820544 [1.777e9])` |
| getService(7) | OK | `(7, 0x0ea26051F7657d59418da186137141CeA90D0652, 0x0ea26051F7657d59418da186137141CeA90D0652, 5134, "A Service Test", "Another description", "", 25000000 [2.5e7], 0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238, false, 1779598536 [1.779e9])` |
| getService(8) | OK | `(8, 0x0ea26051F7657d59418da186137141CeA90D0652, 0x0ea26051F7657d59418da186137141CeA90D0652, 5134, "A USDC Service", "A description for a USDC service", "", 11000000 [1.1e7], 0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238, false, 1779759924 [1.779e9])` |

### AgentSkillRegistryV2

| Check | Status | Value |
|---|---|---|
| getTotalSkillCount() | OK | `1` |

### BiddingSystem

| Check | Status | Value |
|---|---|---|
| getSessionCount() | OK | `3` |

### AgenticCommerceV9

| Check | Status | Value |
|---|---|---|
| jobCounter() | OK | `2` |

### CommitReveal

| Check | Status | Value |
|---|---|---|
| serviceRegistry() | OK | `0x62E1eeEa1A2Ab987004F35bDA430457Ed6077201` |

### MilestoneEscrowV2

| Check | Status | Value |
|---|---|---|
| agenticCommerce() | OK | `0x3a1Bc03cC84040A282F6bf238b917D8351499239` |

### SlashManager

| Check | Status | Value |
|---|---|---|
| commerce() | OK | `0x3a1Bc03cC84040A282F6bf238b917D8351499239` |

## Notes

- Layout status is based on the semantic checker in `scripts/check-storage-layout.js`.
- Live sanity checks are read-only `cast call`/storage reads against Sepolia.
- A failing service record read usually means the individual record is legacy-corrupt, not necessarily that the proxy implementation is unreadable.

