# Test Coverage

> Kokonut Agent Economy | 12 test files | 353 test functions | Line coverage: Unavailable (forge coverage stack-too-deep / Yul stack limit)

---

## Summary

| Metric | Value | Source |
|--------|-------|--------|
| Test files | 12 | File scan (`contracts/test/*.t.sol`) |
| Test functions | 353 | Count of `function test*` + `function invariant_*` across `contracts/test/*.t.sol` |
| Line coverage | Unavailable | `forge coverage` fails stack-too-deep; retry with `--ir-minimum` fails Yul stack-depth (`memoryguard was present`) |
| Branch coverage | Unavailable | Same as above |

> Note: `forge coverage` disables `viaIR` to produce accurate mappings; the production-optimized contracts (especially `AgenticCommerceV9.sol` and `BiddingSystem.sol`) exceed stack limits. The `--ir-minimum` retry also fails in Yul stack-depth handling, so current evidence is test pass rate, not line/branch coverage.

---

## Test File Inventory

| File | LOC | Test Functions | Contracts Covered |
|------|----:|---------------:|-------------------|
| `BiddingSystem.t.sol` | 2111 | 121 | BiddingSystem (all paths including Phase 45b/45c/46b upgrades: pending creator refund, stuck recovery, ETH excess refund, no-show sweep) |
| `SecurityFixes.t.sol` | 932 | 44 | Cross-contract security regression suite, including SlashManager stale active slash and capped partial slash forwarding |
| `AgenticCommerceV9.t.sol` | 838 | 43 | AgenticCommerceV9 (job lifecycle, invalid oracle price, partial/full governance slash) |
| `ServiceRegistryV2.t.sol` | 696 | 45 | ServiceRegistryV2 (create, update, deactivate, bond) |
| `MilestoneEscrowV2.t.sol` | 614 | 37 | MilestoneEscrowV2 (per-job balance, dispute resolution) |
| `MilestoneEscrowSecurityTest.t.sol` | 435 | 28 | Milestone security regression (Phase 34b custody hotfix) |
| `Invariants.t.sol` | 309 | 10 | Stateful invariants (job counter, status terminality) |
| `GasSnapshot.t.sol` | 160 | 5 | Gas regression snapshot |
| `AgentSkillRegistryV2.t.sol` | 84 | 2 | Phase 46a domain hash lookup regression |
| `CommitReveal.t.sol` | 80 | 8 | CommitReveal (basic commit-reveal primitive) |
| `PriceOracle.t.sol` | 68 | 7 | PriceOracle V1+V2 (Chainlink, stablecoin, staleness) |
| `AdminRegistry.t.sol` | 42 | 3 | AdminRegistry (blacklist, featured agents) |
| **Total** | **6369** | **353** | All active in-scope contract families covered by at least one test file or security regression suite |

---

## Test Depth

| Category | Count | Contracts Covered |
|----------|-------|-------------------|
| Unit | 343 | All active in-scope contract families |
| Integration | 0 (explicit) | None — no `*Integration.t.sol` files |
| Fork | 0 | None — Sepolia deployments tested via `.env`-configured RPC, not via `forge test --fork-url` |
| Stateless Fuzz | ~30 (estimated) | BiddingSystem (commit-reveal hash fuzz), AgenticCommerceV9 (state machine fuzz) |
| Stateful Fuzz (Foundry) | 10 (Invariants.t.sol) | Job status state machine, counter monotonicity |
| Stateful Fuzz (Echidna) | 0 | None |
| Stateful Fuzz (Medusa) | 0 | None |
| Formal Verification (Certora) | 0 | None |
| Formal Verification (Halmos) | 0 | None |
| Formal Verification (HEVM) | 0 | None |

---

## Gaps

1. **No line/branch coverage metric** — forge coverage fails on stack-too-deep; retry with `--ir-minimum` fails a Yul stack-depth path. Per-tier test *count* is high, but actual branch coverage is unknown. The 353/353 pass rate measures correctness of *written* tests, not adequacy of coverage.

2. **No formal verification** — No Certora/Halmos/HEVM specs. The 4 economic invariants (E-1 to E-4) and 26 single/cross-contract invariants (I-1 to I-19, X-1 to X-7) have no machine-checked proofs. Solvency (E-1, E-2) is the highest-leverage one missing.

3. **No fork tests** — All tests run on a local EVM (anvil/mocked). Sepolia behavior (Chainlink staleness, real USDC transfers, real ETH gas) is not exercised in CI. The 353/353 pass rate validates logic on a local chain, not on the actual deployment target.

4. **No full scenario tests across all contract boundaries** — Tests are mostly unit-scoped per contract. The BiddingSystem → AgenticCommerceV9 handoff via `createJobAndFund` is covered by Phase 46a/46b regression tests, but no top-level scenario test exists for "client opens bidding → winner selected → job created → milestones enabled → milestone released → provider paid."

5. **No test for the V6 legacy paths** — `AgenticCommerceV6.sol` has no dedicated test file. The V6 contract is still deployed (per AGENTS.md) alongside V9; its bidding-disabled stubs (`revert("Bidding disabled")`) are untested.

6. **`AdminRegistry.t.sol` has only 3 test functions** — Blacklist, featured agents, verification configs are all critical admin surfaces; the small test count suggests happy-path-only coverage.

7. **No test for the `IIdentityRegistry` callback** — `ServiceRegistryV2.deactivateAgentServices` is callable only by the identity registry; the test fixture `MockIdentityRegistry.sol` (35 lines) is used, but the cross-contract test of "agent deactivated → services deactivated" is not visible in the test inventory.

8. **No dedicated `SlashManager.t.sol` file** — The 3-of-5 multisig + 1h timelock + `slashByGovernance` round-trip and partial slash forwarding are tested via `SecurityFixes.t.sol` (44 functions), but there is no standalone suite for every proposal lifecycle branch.

9. **No test for `CommitReveal` integration** — `CommitReveal.sol` (225 lines) has 8 test functions, all unit-scoped. The primitive is not used by any current contract (BiddingSystem has its own commit-reveal), suggesting it's either dead code or for an external integrator.

---

## Observations

- **Test density is high** — 353 test functions across 12 files covering active in-scope contract families. This is well above the typical audit-prep baseline.

- **Single-developer test authorship** — Per git analysis, source-touching commits are by a single author (Wasabi); the test suite reflects one engineer's risk model, not a team's consensus view of threat surface.

- **No differential testing** — V6 vs V9 is not compared in tests. The 4-version ERC-20 path on BiddingSystem (V0 → V1 → V2 with PROTOCOL_VERSION changes) is not regression-tested against the old paths.

- **Coverage gate was deliberately removed** — The 2026-06-02 commit `2f4feff` ("CI: drop forge coverage gate") shows the team prioritized test pass rate over coverage percentage. Current rerun is 353/353 green, but auditors should weight test *existence* highly and verify each surface by hand.
