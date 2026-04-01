# 🔐 Security Review — Kokonut Agent Economy Stack

---

## Scope

|                                  |                                                                                                                                                                               |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Mode**                         | ALL (default)                                                                                                                                                                 |
| **Files reviewed**               | `AgentIdentityRegistry.sol` · `AgentReputationRegistry.sol`<br>`AgentSkillRegistry.sol` · `AgenticCommerce.sol`<br>`ServiceRegistry.sol` · `AgentReview.sol` · `IACPHook.sol` |
| **Confidence threshold (1-100)** | 80                                                                                                                                                                            |

---

## Findings

[95] **1. First registered agent's isAgent returns false**

`AgentIdentityRegistry.isAgent` · Confidence: 95

**Description**
The `isAgent` function returns `_addressToTokenId[account] > 0`, but `_tokenIdCounter` starts at 0. The first registered agent gets tokenId 0, causing `isAgent` to return `false` for valid agents.

**Fix**

```diff
- function isAgent(address account) external view returns (bool) {
-     return _addressToTokenId[account] > 0;
- }
+ function isAgent(address account) external view returns (bool) {
+     return _addressToTokenId[account] != 0;
+ }
```

---

[95] **2. Missing access control on attestDecision**

`AgentReview.attestDecision` · Confidence: 95

**Description**
Anyone can call `attestDecision` to select any address as the winning evaluator, triggering ETH reward distribution to themselves or an accomplice. This allows theft of staked funds.

**Fix**

```diff
+ modifier onlyAttestor(uint256 proposalId) {
+     require(msg.sender == proposals[proposalId].proposer, "Not proposer");
+     _;
+ }
- function attestDecision(uint256 proposalId, address winningEvaluator) external nonReentrant {
+ function attestDecision(uint256 proposalId, address winningEvaluator) external onlyAttestor(proposalId) nonReentrant {
```

---

[95] **3. Missing access control on deactivateSkill**

`AgentSkillRegistry.deactivateSkill` · Confidence: 95

**Description**
Any external caller can deactivate any skill, potentially disrupting the skill registry without authorization.

**Fix**

```diff
- function deactivateSkill(bytes32 skillId) external {
+ function deactivateSkill(bytes32 skillId) external onlyOwner {
```

---

[90] **4. Old wallet address not cleared when updating agent wallet**

`AgentIdentityRegistry.setAgentWallet` · Confidence: 90

**Description**
When setting a new agent wallet, the old wallet address remains mapped to the tokenId in `_addressToTokenId`, causing both addresses to resolve to the same agent.

**Fix**

```diff
    function setAgentWallet(uint256 tokenId, address newWallet) external {
        require(ownerOf(tokenId) == msg.sender, "Not owner");
        require(newWallet != address(0), "Zero address");
        address oldWallet = _agents[tokenId].agentWallet;
+       delete _addressToTokenId[oldWallet];
        _agents[tokenId].agentWallet = newWallet;
        _addressToTokenId[newWallet] = tokenId;
        emit AgentWalletUpdated(tokenId, oldWallet, newWallet);
    }
```

---

[90] **5. Winning evaluator can claim reward twice**

`AgentReview.attestDecision` + `AgentReview.claimReward` · Confidence: 90

**Description**
In `attestDecision`, the winning evaluator receives `totalReward` (stakeAmount + proposal.reward) but `stakeAmount` is NOT set to 0. The `claimReward` function then allows the same evaluator to claim `stakeAmount` again.

**Fix**

```diff
    Evaluation storage winningEval = evaluations[proposalId][winningEvaluator];
    winningEval.isFinal = true;
+   uint256 stake = winningEval.stakeAmount;
+   winningEval.stakeAmount = 0;
    uint256 totalReward = stake + proposal.reward;
```

---

[85] **6. uniqueProviders returns wrong value**

`AgentReputationRegistry.getAgentReputation` · Confidence: 85

**Description**
The function returns `uniqueProviders = count` instead of actual unique provider count. The `_hasProvidedFeedback` mapping tracks unique providers but is never used.

**Fix**

```diff
- function getAgentReputation(address agent) external view returns (int256 averageRating, uint256 totalFeedbacks, uint256 uniqueProviders) {
-     uint256 count = _ratings[agent].length;
-     if (count == 0) return (0, 0, 0);
-     int256 sum;
-     for (uint256 i = 0; i < count; i++) sum += _ratings[agent][i];
-     return (sum / int256(count), count, count);
- }
+ function getAgentReputation(address agent) external view returns (int256 averageRating, uint256 totalFeedbacks, uint256 uniqueProviders) {
+     uint256 count = _ratings[agent].length;
+     uint256 uniqueCount = 0;
+     for (uint256 i = 0; i < count; i++) {
+         if (_hasProvidedFeedback[agent][_feedbacks[agent][i].provider]) uniqueCount++;
+     }
+     if (count == 0) return (0, 0, 0);
+     int256 sum;
+     for (uint256 i = 0; i < count; i++) sum += _ratings[agent][i];
+     return (sum / int256(count), count, uniqueCount);
+ }
```

---

[85] **7. Fee-on-transfer token accounting bypass**

`AgenticCommerce.fund` · Confidence: 85

**Description**
The `fund()` function uses `job.budget` as the transferred amount without checking actual received tokens. For fee-on-transfer tokens, less value arrives than specified.

**Fix**

```diff
    function fund(uint256 jobId) external nonReentrant {
        Job storage job = jobs[jobId];
        require(job.id != 0, "Invalid job");
        require(uint256(job.status) == 0, "Wrong status");
        require(job.client == msg.sender, "Not client");
        require(job.provider != address(0), "No provider");
        require(job.budget > 0, "No budget");
        require(block.timestamp < job.expiredAt, "Expired");

+       uint256 balanceBefore = paymentToken.balanceOf(address(this));
        job.status = JobStatus.Funded;
        paymentToken.safeTransferFrom(msg.sender, address(this), job.budget);
+       require(paymentToken.balanceOf(address(this)) - balanceBefore >= job.budget, "Insufficient payment");
        emit JobFunded(jobId, msg.sender, job.budget);
    }
```

---

[85] **8. Job budget not reset after completion**

`AgenticCommerce.complete` · Confidence: 85

**Description**
When a job is completed, rejected, or expired, the `job.budget` is not set to 0 after transferring funds, leaving the budget value in storage.

**Fix**

```diff
    function complete(uint256 jobId, bytes32 reason) external nonReentrant {
        Job storage job = jobs[jobId];
        require(job.id != 0, "Invalid job");
        require(job.status == JobStatus.Submitted, "Wrong status");
        require(job.evaluator == msg.sender, "Not evaluator");

        job.status = JobStatus.Completed;
+       job.budget = 0;
        uint256 amount = job.budget;
        uint256 platformFee = (amount * platformFeeBP) / FEE_DENOMINATOR;
```

---

[82] **9. findSkillsByDomain uses inconsistent key hashing**

`AgentSkillRegistry.findSkillsByDomain` · Confidence: 82

**Description**
`findSkillsByDomain` hashes the domain parameter with `keccak256(abi.encodePacked(domain))` but `_skillAgents` was populated with plain domain keys in `registerSkill`.

**Fix**

```diff
    function findSkillsByDomain(string calldata domain) external view returns (bytes32[] memory) {
-       return _skillAgents[keccak256(abi.encodePacked(domain))];
+       return _skillAgents[uint256(keccak256(abi.encode(domain)))];
    }
```

And in `registerSkill`:

```diff
    function registerSkill(bytes32 skillId, string calldata name, string calldata domain) external {
        require(_skills[skillId].id == bytes32(0), "Skill exists");
        _skills[skillId] = Skill(skillId, name, domain, true);
-       _agentSkills[msg.sender].push(skillId);
-       _skillAgents[skillId].push(msg.sender);
+       bytes32 domainKey = uint256(keccak256(abi.encode(domain)));
+       _agentSkills[msg.sender].push(skillId);
+       _skillAgents[domainKey].push(msg.sender);
        _agentHasSkill[skillId][msg.sender] = true;
    }
```

---

[80] **10. ETH slash/claim transfer can silently fail**

`AgentReview.slashEvaluator`, `AgentReview.claimReward`, `AgentReview.releaseStake` · Confidence: 80

**Description**
Low-level `.call()` used for ETH transfers without proper error handling. If transfer fails, state is updated but funds are lost.

**Fix**

```diff
+   function _sendETH(address to, uint256 amount) internal {
+       (bool success, ) = to.call{value: amount}("");
+       require(success, "Transfer failed");
+   }
```

---

## Leads

- **`AgentReview.attestDecision` conflict of interest** — `AgentReview.createProposal` allows msg.sender to be evaluator, enabling self-dealing
- **`AgenticCommerce.complete` missing expiry check** — Jobs can be completed after expiration date
- **`AgentReputationRegistry.submitFeedback` no agent validation** — Fake reputation can be created for non-existent agents
- **`AgentReview.createProposal` ETH excess retention** — msg.value > reward keeps excess ETH in contract
- **`AgentReview.withdrawETH` zero address check** — No validation prevents sending ETH to address(0)

---

## Findings Summary

| #   | Confidence | Title                                                     |
| --- | ---------- | --------------------------------------------------------- |
| 1   | [95]       | First registered agent's isAgent returns false            |
| 2   | [95]       | Missing access control on attestDecision                  |
| 3   | [95]       | Missing access control on deactivateSkill                 |
| 4   | [90]       | Old wallet address not cleared when updating agent wallet |
| 5   | [90]       | Winning evaluator can claim reward twice                  |
| 6   | [85]       | uniqueProviders returns wrong value                       |
| 7   | [85]       | Fee-on-transfer token accounting bypass                   |
| 8   | [85]       | Job budget not reset after completion                     |
| 9   | [82]       | findSkillsByDomain uses inconsistent key hashing          |
| 10  | [80]       | ETH slash/claim transfer can silently fail                |

---

> ⚠️ This review was performed by an AI assistant. AI analysis can never verify the complete absence of vulnerabilities and no guarantee of security is given. Team security reviews, bug bounty programs, and on-chain monitoring are strongly recommended. For a consultation regarding your projects' security, visit [https://www.pashov.com](https://www.pashov.com)
