# 🔐 Private Job Matching Platform (using BITE Protocol)

## Overview
A privacy-preserving job matching platform where **AI agents** act as `job matching agents`, built on **SKALE (BASE Sepolia)** using:
- **BITE Protocol** - Blockchain Integrated `Threshold Encryption`
- **x402** - Payment protocol for AI services
- **ERC-8004** - Agent identity, reputation, and verification

## Benefits

**For `Candidates`:** Unlike traditional platforms where your resume and salary expectations are visible to recruiters and potentially your current employer, this platform keeps your job search completely confidential until you choose to reveal a specific offer.

**For `Employers`:** Unlike traditional job boards where your openings and budget constraints are public to competitors and recruiting agencies, this platform keeps your hiring needs and compensation ranges fully encrypted until matched with qualified candidates.


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
       │               ┌───────▼────────┐               │
       │               │ Proof Verified │               │
       │               │   Reputation   │               │
       │               │     Updated    │               │
       │               │   (ERC-8004)   │               │
       │               └───────┬────────┘               │
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
(NOTE: The `ZK Proof` part above is still in progress to implement)

<br>


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


<br>

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

<br>

## Deployed Contract Addresses on [`SKALE / BASE Sepolia`](https://docs.skale.space/developers/integrate-skale/connect-to-skale#skale-base-testnet) 

NOTE: SKALE Base Chains is built on Base L2 with native bridge to/from Base

| Contract Name | Address |
|--------------|---------|
| **ERC8004IdentityRegistry** | [`0x1396149da537645cc8c77f4b4a312f6e23a74143`](https://base-sepolia-testnet-explorer.skalenodes.com/address/0x1396149da537645cc8c77f4b4a312f6e23a74143) |
| **ERC8004ReputationRegistry** | [`0xa4d646605c74b4bb95e006375825cac8ae846981`](https://base-sepolia-testnet-explorer.skalenodes.com/address/0xa4d646605c74b4bb95e006375825cac8ae846981) |
| **ERC8004VerificationRegistry** | [`0x985d734f7b61f9db72087025da661b14e65871a6`](https://base-sepolia-testnet-explorer.skalenodes.com/address/0x985d734f7b61f9db72087025da661b14e65871a6) |
| **IntentVault** | [`0x9b58e2288a0d00cc67996b8210cb9871523c2daf`](https://base-sepolia-testnet-explorer.skalenodes.com/address/0x9b58e2288a0d00cc67996b8210cb9871523c2daf) |
| **MatchEscrow** | [`0xeedbc84bdb660b013e80433afd0534d3947fa349`](https://base-sepolia-testnet-explorer.skalenodes.com/address/0xeedbc84bdb660b013e80433afd0534d3947fa349) |
| **OfferContract** | [`0x2afc489ac5dc040bcbdea9d545884bc7a57f6136`](https://base-sepolia-testnet-explorer.skalenodes.com/address/0x2afc489ac5dc040bcbdea9d545884bc7a57f6136) |
| **FacilitatorGateway** | [`0x5d41a0292a7381321a65d430dda70a7b433a49b5`](https://base-sepolia-testnet-explorer.skalenodes.com/address/0x5d41a0292a7381321a65d430dda70a7b433a49b5) |
| **MockUSDC** | [`0x12e3e841555e6e2b3db3152198c982050d0cbedc`](https://base-sepolia-testnet-explorer.skalenodes.com/address/0x12e3e841555e6e2b3db3152198c982050d0cbedc) |

**Network:**

- Network: SKALE Base Sepolia
- Chain ID: 324705682
- RPC: https://base-sepolia-testnet.skalenodes.com/v1/jubilant-horrible-ancha
- Block Explorer: https://base-sepolia-testnet-explorer.skalenodes.com

<br>

## DEMO video (E2E flow)

- DEMO video showing the conditional flow end-to-end (encrypted → trigger → execution):
  - In this DEMO video, the `end-to-end` flow is demonstrated by running the `e2e.ts`
     https://www.loom.com/share/8d3a5251212b4420a7ae4321d9175c17


<br>


## 🛠 Development

### Project Structure
```
private-job-matching-platform-using-BITE-protocol/
├── contracts/                    # Foundry project
│   ├── src/                     # Solidity smart contracts
│   │   ├── IntentVault.sol
│   │   ├── MatchEscrow.sol
│   │   ├── OfferContract.sol
│   │   ├── bite-protocol/
│   │   │   ├── BITE.sol
│   │   │   └── IBiteSupplicant.sol
│   │   ├── erc-8004/
│   │   │   ├── ERC8004IdentityRegistry.sol
│   │   │   ├── ERC8004ReputationRegistry.sol
│   │   │   ├── ERC8004VerificationRegistry.sol
│   │   │   └── interfaces/
│   │   ├── mock/
│   │   │   └── MockUSDC.sol
│   │   └── x402/
│   │       └── FacilitatorGateway.sol
│   ├── scripts/
│   │   └── deployments/
│   │       └── base-sepolia/
│   ├── foundry.toml
│   ├── package.json
│   └── remappings.txt
├── scripts/                     # TypeScript scripts
│   ├── contracts/
│   │   └── abis/
│   ├── e2e/
│   │   └── e2e.ts               # End-to-end demo
│   ├── libs/                    # SDK integrations
│   │   └── skale/
│   │       ├── bite-protocol/   # BITE SDK wrapper
│   │       ├── erc-8004/        # ERC-8004 SDK
│   │       └── x402/            # x402 SDK
│   ├── extract-abis.ts
│   ├── package.json
│   └── tsconfig.json
└── README.md
```

### Adding New Features

**Add new matching criteria**:
Edit `performConfidentialMatching()` in [scripts/e2e/e2e.ts](scripts/e2e/e2e.ts)

**Change escrow terms**:
Modify `MatchEscrow.sol` constants

**Adjust agent fees**:
Update `AGENT_FEE_BPS` in [contracts/src/MatchEscrow.sol](contracts/src/MatchEscrow.sol)

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


<br>


## 🚀 Quick Start

### Prerequisites
```bash
# Install Foundry
curl -L https://foundry.paradigm.xyz | bash
foundryup

# Install Node.js dependencies for contracts
cd contracts
npm install

# Install Node.js dependencies for scripts
cd ../scripts
npm install
```

### Setup Environment
```bash
# Setup environment for contracts
cd contracts
cp .env.example .env
# Edit .env with your private keys and configuration

# Setup environment for scripts
cd ../scripts
cp .env.example .env
# Edit .env with your configuration
```

### Build Contracts
```bash
cd contracts
forge build
```

### Run Tests
```bash
cd contracts
forge test
```

### Run E2E Demo
```bash
cd scripts
npm run e2e
```

<br>

## 📚 Documentation

- [BITE Protocol SDK](https://docs.skale.space/developers/bite-protocol/typescript-sdk)
- [ERC-8004 Standard](https://docs.skale.space/get-started/agentic-builders/start-with-erc-8004)
- [x402 Protocol](https://docs.skale.space/get-started/agentic-builders/start-with-x402)
- [SKALE Documentation](https://docs.skale.space/)
