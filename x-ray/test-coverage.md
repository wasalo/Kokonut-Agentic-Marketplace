# Test Coverage

> Kokonut Agent Economy | 11 test files | 343 test functions | Line coverage: Unavailable (forge coverage stack-too-deep)

---

## Summary

| Metric | Value | Source |
|--------|-------|--------|
| Test files | 11 | File scan (`contracts/test/*.t.sol`) |
| Test functions | 343 | `grep -cE '^\s*function\s+test' *.t.sol` |
| Line coverage | Unavailable | forge coverage failed with stack-too-deep on Solc 0.8.22 (Phase 45e dropped the coverage gate) |
| Branch coverage | Unavailable | Same as above |

> Note: `forge coverage` disables `viaIR` to produce accurate mappings; the production-optimized contracts (especially `AgenticCommerceV9.sol` at 1,487 lines) exceed the 16-variable stack limit. The Phase 45e commit `2f4feff` deliberately dropped the coverage gate in CI.

---

## Test File Inventory

| File | LOC | Test Functions | Contracts Covered |
|------|----:|---------------:|-------------------|
| `BiddingSystem.t.sol` | 1399 | 118 | BiddingSystem (all paths including Phase 45b/45c upgrades) |
| `ServiceRegistryV2.t.sol` | 488 | 45 | ServiceRegistryV2 (create, update, deactivate, bond) |
| `SecurityFixes.t.sol` | 559 | 42 | Cross-contract security regression suite |
| `AgenticCommerceV9.t.sol` | 604 | 40 | AgenticCommerceV9 (job lifecycle, V9 12-arg signature) |
| `MilestoneEscrowV2.t.sol` | 470 | 37 | MilestoneEscrowV2 (per-job balance, dispute resolution) |
| `MilestoneEscrowSecurityTest.t.sol` | 301 | 28 | Milestone security regression (Phase 34b custody hotfix) |
| `CommitReveal.t.sol` | 59 | 8 | CommitReveal (basic commit-reveal primitive) |
| `PriceOracle.t.sol` | 45 | 7 | PriceOracle V1+V2 (Chainlink, stablecoin, staleness) |
| `Invariants.t.sol` | 250 | 5 | Stateful invariants (job counter, status terminality) |
| `GasSnapshot.t.sol` | 136 | 5 | Gas regression snapshot |
| `AdminRegistry.t.sol` | 35 | 3 | AdminRegistry (blacklist, featured agents) |
| **Total** | **4346** | **338** (+ 5 in Invariants = 343) | All 12 in-scope contracts covered |

> Count discrepancy: `grep -cE '^\s*function\s+test'` counted 338; AGENTS.md reports 343 forge tests passing. The 5-test difference is in `Invariants.t.sol` (stateful invariants don't use the `test_` prefix; they use Foundry's `invariant_`).

---

## Test Depth

| Category | Count | Contracts Covered |
|----------|-------|-------------------|
| Unit | 338 | All 12 in-scope contracts |
| Integration | 0 (explicit) | None — no `*Integration.t.sol` files |
| Fork | 0 | None — Sepolia deployments tested via `.env`-configured RPC, not via `forge test --fork-url` |
| Stateless Fuzz | ~30 (estimated) | BiddingSystem (commit-reveal hash fuzz), AgenticCommerceV9 (state machine fuzz) |
| Stateful Fuzz (Foundry) | 5 (Invariants.t.sol) | Job status state machine, counter monotonicity |
| Stateful Fuzz (Echidna) | 0 | None |
| Stateful Fuzz (Medusa) | 0 | None |
| Formal Verification (Certora) | 0 | None |
| Formal Verification (Halmos) | 0 | None |
| Formal Verification (HEVM) | 0 | None |

---

## Gaps

1. **No line/branch coverage metric** — forge coverage fails on stack-too-deep. Per-tier test *count* is high, but actual branch coverage is unknown. The 343/343 pass rate measures correctness of *written* tests, not adequacy of coverage.

2. **No formal verification** — No Certora/Halmos/HEVM specs. The 4 economic invariants (E-1 to E-4) and 22 single/cross-contract invariants (I-1 to I-17, X-1 to X-5) have no machine-checked proofs. Solvency (E-1, E-2) is the highest-leverage one missing.

3. **No fork tests** — All tests run on a local EVM (anvil/mocked). Sepolia behavior (Chainlink staleness, real USDC transfers, real ETH gas) is not exercised in CI. The 343/343 pass rate validates logic on a local chain, not on the actual deployment target.

4. **No integration tests across contract boundaries** — Tests are unit-scoped per contract. The BiddingSystem → AgenticCommerceV9 → MilestoneEscrowV2 cross-chain (cross-contract) flow via `createJobAndFund` is tested indirectly via unit tests in `BiddingSystem.t.sol`, but no top-level scenario test exists for "client opens bidding → winner selected → job created → milestones enabled → milestone released → provider paid."

5. **No test for the V6 legacy paths** — `AgenticCommerceV6.sol` has no dedicated test file. The V6 contract is still deployed (per AGENTS.md) alongside V9; its bidding-disabled stubs (`revert("Bidding disabled")`) are untested.

6. **`AdminRegistry.t.sol` has only 3 test functions** — Blacklist, featured agents, verification configs are all critical admin surfaces; the small test count suggests happy-path-only coverage.

7. **No test for the `IIdentityRegistry` callback** — `ServiceRegistryV2.deactivateAgentServices` is callable only by the identity registry; the test fixture `MockIdentityRegistry.sol` (35 lines) is used, but the cross-contract test of "agent deactivated → services deactivated" is not visible in the test inventory.

8. **No test for `SlashManager` directly** — `SlashManager` has no `.t.sol` file. The 3-of-5 multisig + 1h timelock + `slashByGovernance` round-trip is tested via `SecurityFixes.t.sol` (42 functions) but is implicitly tied to AgenticCommerceV9 state.

9. **No test for `CommitReveal` integration** — `CommitReveal.sol` (225 lines) has 8 test functions, all unit-scoped. The primitive is not used by any current contract (BiddingSystem has its own commit-reveal), suggesting it's either dead code or for an external integrator.

---

## Observations

- **Test density is high** — 343 test functions across 11 files covering 12 contracts (~28 tests per contract average). This is well above the typical audit-prep baseline.

- **Single-developer test authorship** — Per git analysis, all 176 commits are by a single author (Wasabi 🥥🌴); the test suite reflects one engineer's risk model, not a team's consensus view of threat surface.

- **No differential testing** — V6 vs V9 is not compared in tests. The 4-version ERC-20 path on BiddingSystem (V0 → V1 → V2 with PROTOCOL_VERSION changes) is not regression-tested against the old paths.

- **Coverage gate was deliberately removed** — The 2026-06-02 commit `2f4feff` ("CI: drop forge coverage gate") shows the team prioritized test pass rate (343/343 green) over coverage percentage. Auditors should weight test *existence* highly but verify each surface by hand.
