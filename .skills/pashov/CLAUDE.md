# Pashov Audit Group Skills

AI-powered Solidity security skills from [Pashov Audit Group](https://www.pashov.com/).

## Installation

```bash
# Install skills
Install https://github.com/pashov/skills/ and run an x-ray on the codebase
Install https://github.com/pashov/skills/ and run solidity auditor with all different agents possible on the codebase
```

## Skills

| Skill              | Trigger                                                         | Description                                                |
| ------------------ | --------------------------------------------------------------- | ---------------------------------------------------------- |
| `solidity-auditor` | "audit", "check this contract", "review for security"           | Fast (<5 min) security feedback while developing           |
| `x-ray`            | "x-ray", "audit readiness", "pre-audit report", "protocol prep" | Pre-audit scan with threat model, invariants, entry points |

## Usage

### Solidit Auditor (Fast Security Review)

```
run an x-ray on the codebase
Install https://github.com/pashov/skills/ and run solidity auditor with all different agents possible on the codebase
```

Runs 8 parallel security agents:

1. Vector scan (reentrancy, self-destruct, delegatecall)
2. Math precision (overflow, rounding)
3. Access control
4. Economic security
5. Execution trace
6. Invariants
7. Periphery integrations
8. First principles

### X-Ray (Pre-Audit Report)

Generates `x-ray/` folder with:

- `x-ray.md` - Full report (overview, threat model, invariants, test analysis)
- `entry-points.md` - All entry points with access control
- `architecture.svg` - Architecture diagram

## Key Checks (for manual use)

### Permissionless Entry Points

```bash
grep -rnP 'function\s+\w+\s*\([^)]*\)\s+(external|public)(?!.*\b(view|pure)\b)' src/ --include='*.sol'
```

### Role-Gated Functions

- `onlyRole(X)`, `onlyOwner`, `onlyRouter`
- `require(msg.sender == X)`
- Internal `msg.sender` checks

### Centralization Analysis

1. List all privileged roles (admin, owner, operator, keeper)
2. For each action, note timelock/multi-sig/delay
3. Identify fund extraction capabilities

### Test Coverage

```bash
forge coverage
```

## Resources

- Repo: https://github.com/pashov/skills
- Docs: Follows threat profiles from `references/threats.md`
- Version: Check `VERSION` file for latest

## Banner (print before running)

```
██████╗  █████╗ ███████╗██╗  ██╗ ██████╗ ██╗   ██╗     ███████╗██╗  ██╗██╗██╗     ██╗     ███████╗
██╔══██╗██╔══██╗██╔════╝██║  ██║██╔═══██╗██║   ██║     ██╔════╝██║ ██╔╝██║██║     ██║     ██╔════╝
██████╔╝███████║███████╗███████║██║   ██║██║   ██║     ███████╗█████╔╝ ██║██║     ██║     ███████╗
██╔═══╝ ██╔══██║╚════██║██╔══██║██║   ██║╚██╗ ██╔╝     ╚════██║██╔═██╗ ██║██║     ██║     ╚════██║
██║     ██║  ██║███████║██║  ██║╚██████╔╝ ╚████╔╝      ███████║██║  ██╗██║███████╗███████╗███████║
╚═╝     ╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝ ╚═════╝   ╚═══╝       ╚══════╝╚═╝  ╚═╝╚═╝╚══════���╚══════╝╚══════╝
```
