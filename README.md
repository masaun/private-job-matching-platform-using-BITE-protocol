# 🔐 Private Job Matching Platform

A privacy-preserving job matching platform where AI agents act as job matching agents, built on **SKALE** using:
- **x402** - Payment protocol for AI services
- **ERC-8004** - Agent identity, reputation, and verification
- **BITE Protocol** - Blockchain Integrated Threshold Encryption

## 🎯 Features

### Privacy-First Design
- ✅ **Encrypted Candidate Profiles** - Skills, experience, salary expectations remain private
- ✅ **Encrypted Job Requirements** - Employer needs hidden from competitors
- ✅ **Confidential Matching** - AI matching happens in BITE secure execution
- ✅ **Encrypted Offers** - Job offers revealed only to matched candidates
- ✅ **No MEV** - Protected from front-running and sandwich attacks

### What Stays Encrypted
- Candidate CV and profile data
- Salary expectations and ranges
- Employer budget and requirements
- Matching algorithm logic
- Offer terms until candidate reveals

### What Triggers Execution
- Match score exceeds threshold (>=70%)
- Candidate accepts offer
- Escrow timeout expires

### Failure Handling
- **No match**: Silent failure, no on-chain trace
- **Invalid proof**: Agent reputation decreases
- **Candidate rejects**: Escrow refunds employer
- **Timeout**: Automatic refund to employer

## 🏗 Architecture

```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│  Candidate  │         │  AI Agent    │         │  Employer   │
│             │         │  (x402)      │         │             │
└──────┬──────┘         └──────┬───────┘         └──────┬──────┘
       │                       │                        │
       │ Encrypted Profile     │                        │
       ├──────────────────────►│                        │
       │                       │   Encrypted Job Reqs   │
       │                       │◄───────────────────────┤
       │                       │                        │
       │                  ┌────▼─────┐                  │
       │                  │   BITE   │                  │
       │                  │ Matching │                  │
       │                  └────┬─────┘                  │
       │                       │                        │
       │                  zkProof                       │
       │                       ├───────────────────────►│
       │                       │                        │
       │                  ┌────▼─────┐                  │
       │                  │  Escrow  │◄─────────────────┤
       │                  └────┬─────┘                  │
       │                       │                        │
       │   Encrypted Offer     │                        │
       │◄──────────────────────┤                        │
       │                       │                        │
  Accept/Reject                │                        │
       ├──────────────────────►│                        │
       │                       │                        │
       │                  Settlement                    │
       │◄──────────────────────┴───────────────────────►│
```

## 📦 Smart Contracts

### Core Contracts
- **IntentVault** - Stores encrypted candidate profiles and job requirements using BITE
- **MatchEscrow** - Holds salary + agent fee until candidate accepts/rejects
- **OfferContract** - Creates and manages encrypted job offers
- **FacilitatorGateway** - Verifies zk proofs from AI matching agents

### ERC-8004 Registries
- **ERC8004IdentityRegistry** - Agent registration and metadata
- **ERC8004ReputationRegistry** - Track agent performance and credibility
- **ERC8004VerificationRegistry** - Verify agent capabilities

## 🚀 Quick Start

### Prerequisites
```bash
# Install Foundry
curl -L https://foundry.paradigm.xyz | bash
foundryup

# Install Node.js dependencies
npm install
# or
pnpm install
```

### Setup Environment
```bash
cp .env.example .env
# Edit .env with your private keys and configuration
```

### Build Contracts
```bash
forge build
```

### Run Tests
```bash
forge test
```

### Run E2E Demo
```bash
npm run e2e
```

## 📝 Flow Diagram

### 1. Intent Submission Phase
```
Candidate
   │
   │ 1. Encrypt(profile_data)
   │
   ├───────────────► IntentVault
   │                 store(hash(profile_blob))
   │
Employer
   │
   │ 2. Encrypt(job_requirements)
   │
   ├───────────────► IntentVault
                     store(hash(job_blob))
```

### 2. Matching Phase (Confidential Execution)
```
x402 AI Agent (ERC-8004 Registered)
   │
   │ 3. Fetch encrypted intents
   │
   ├───────────────► BITE Runtime
                     confidential compute:
                     - skill_score
                     - salary_overlap
                     - compliance_check
                     - threshold test
```

### 3. Unlock Condition Check
```
Inside BITE:

IF
  skill_score ≥ threshold
AND salary_overlap == true
AND compliance == pass
THEN
  generate zkMatchProof
ELSE
  abort silently
```

### 4. Proof Submission & Settlement
```
x402 Agent
   │
   │ 4. submitMatchProof()
   │
   ├───────────────► FacilitatorGateway
   │                 verify zkProof
   │
Employer
   │
   │ 5. depositEscrow()
   │
   ├───────────────► MatchEscrow
   │                 lock salary + agent fee
   │
Candidate
   │
   │ 6. revealOffer() → accept/reject
   │
   ├───────────────► OfferContract
                     │
                     ▼
                MatchEscrow.finalize()
                     │
                     ├── Salary → Candidate
                     └── Fee → AI Agent
```

## 🔑 Key Technologies

### SKALE BITE Protocol
- **Threshold Encryption** - BLS encryption with committee consensus
- **Conditional Transactions** - Smart contracts request decryption
- **No MEV** - Transactions encrypted until execution
- **Privacy** - Data encrypted end-to-end

### ERC-8004
- **Agent Identity** - On-chain agent registration
- **Reputation System** - Track agent performance
- **Verification** - Capability attestation
- **Trustless A2A** - Agent-to-Agent interactions

### x402
- **Payment Protocol** - HTTP 402 for AI services
- **ERC-3009** - Gasless token transfers
- **Autonomous Payments** - Agents pay for resources
- **Multi-Token Support** - Various ERC-20 tokens

## 📊 Agent Economics

### Fee Structure
- **Agent Fee**: 5% of salary
- **Payment Token**: Axios USD or Bridged USDC
- **Settlement**: Automatic upon candidate acceptance

### Reputation System
- **Success**: +100 points per successful match
- **Failure**: -50 points per failed match
- **Threshold**: Minimum 100 points to submit proofs

## 🛠 Development

### Project Structure
```
private-job-matching-platform-using-BITE-protocol/
├── contracts/                    # Solidity smart contracts
│   ├── interfaces/              # Contract interfaces
│   ├── ERC8004IdentityRegistry.sol
│   ├── ERC8004ReputationRegistry.sol
│   ├── ERC8004VerificationRegistry.sol
│   ├── IntentVault.sol
│   ├── MatchEscrow.sol
│   ├── OfferContract.sol
│   └── FacilitatorGateway.sol
├── scripts/                     # TypeScript scripts
│   ├── libs/                    # SDK integrations
│   │   └── skale/
│   │       ├── bite-protocol/   # BITE SDK wrapper
│   │       ├── erc-8004/        # ERC-8004 SDK
│   │       └── x402/            # x402 SDK
│   └── e2e/
│       └── e2e.ts               # End-to-end demo
├── foundry.toml                 # Foundry configuration
├── package.json                 # Node.js dependencies
└── README.md
```

### Adding New Features

**Add new matching criteria**:
Edit `performConfidentialMatching()` in [scripts/e2e/e2e.ts](scripts/e2e/e2e.ts)

**Change escrow terms**:
Modify `MatchEscrow.sol` constants

**Adjust agent fees**:
Update `AGENT_FEE_BPS` in [contracts/MatchEscrow.sol](contracts/MatchEscrow.sol)

## 🔒 Security Considerations

### Privacy Guarantees
- ✅ No public job-seeking signal
- ✅ No employer budget exposure
- ✅ No front-running
- ✅ No recruiter arbitrage
- ✅ Deterministic matching
- ✅ Confidential negotiation

### Threat Model
- **Sybil Resistance**: ERC-8004 identity + reputation
- **Reputation Gaming**: Score decay over time
- **MEV Protection**: BITE encryption
- **Data Integrity**: IPFS content addressing

## 📚 Documentation

- [BITE Protocol SDK](https://docs.skale.space/developers/bite-protocol/typescript-sdk)
- [ERC-8004 Standard](https://docs.skale.space/get-started/agentic-builders/start-with-erc-8004)
- [x402 Protocol](https://docs.skale.space/get-started/agentic-builders/start-with-x402)
- [SKALE Documentation](https://docs.skale.space/)

## 🤝 Contributing

Contributions welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for details.

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details

## 🎓 Built For

**SKALE - SF🇺🇸 Agentic Commerce x402 Hackathon**  
February 12-14, 2026

---

**Revolutionizing recruitment with privacy-first AI agents on SKALE** 🚀