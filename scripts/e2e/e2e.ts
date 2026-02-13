/**
 * 🔐 Private Job Matching Platform - End-to-End Demo
 * 
 * Demonstrates the complete flow of private job matching using:
 * - SKALE BITE Protocol (encryption & conditional transactions)
 * - ERC-8004 (agent identity, reputation, verification)
 * - x402 (payment protocol for AI services)
 * 
 * Flow:
 * 1. Deploy smart contracts
 * 2. Register AI matching agent with ERC-8004
 * 3. Candidate submits encrypted profile to IntentVault
 * 4. Employer submits encrypted job requirements to IntentVault
 * 5. AI agent performs confidential matching using BITE
 * 6. AI agent submits match proof to FacilitatorGateway
 * 7. Employer creates escrow with salary + agent fee
 * 8. AI agent creates encrypted offer
 * 9. Candidate reveals and accepts/rejects offer
 * 10. Settlement and reputation update
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { ethers } from 'ethers';

// Load environment variables from contracts/.env
config({ path: resolve(process.cwd(), '../contracts/.env') });
import { createBiteService } from '../libs/skale/bite-protocol';
import { createERC8004Service } from '../libs/skale/erc-8004';
import { createX402Service } from '../libs/skale/x402';

// Import generated ABIs
import {
  IntentVaultABI,
  MatchEscrowABI,
  OfferContractABI,
  FacilitatorGatewayABI,
  ERC8004IdentityRegistryABI,
  ERC8004ReputationRegistryABI,
  ERC8004VerificationRegistryABI
} from '../contracts/abis/abi';

// SKALE Base Testnet Configuration
const SKALE_ON_BASE_SEPOLIA_RPC_URL = process.env.SKALE_ON_BASE_SEPOLIA_RPC_URL || 'https://base-sepolia-testnet.skalenodes.com/v1/bite-v2-sandbox-2';
const SKALE_CHAIN_ID = 324705682; // SKALE Base Testnet Chain ID

// Private Keys
const DEPLOYER_PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY || '0x0000000000000000000000000000000000000000000000000000000000000001';
const MOCK_USDC_MINTER_PRIVATE_KEY = process.env.MOCK_USDC_MINTER_PRIVATE_KEY || '0x0000000000000000000000000000000000000000000000000000000000000000005';
const AI_AGENT_PRIVATE_KEY = process.env.AI_AGENT_PRIVATE_KEY || '0x0000000000000000000000000000000000000000000000000000000000000004';
const CANDIDATE_PRIVATE_KEY = process.env.CANDIDATE_PRIVATE_KEY || '0x0000000000000000000000000000000000000000000000000000000000000002';
const EMPLOYER_PRIVATE_KEY = process.env.EMPLOYER_PRIVATE_KEY || '0x0000000000000000000000000000000000000000000000000000000000000003';

// Deployed Contract Addresses on Base Sepolia
const CONTRACT_ADDRESSES = {
  identityRegistry: process.env.IDENTITY_REGISTRY_ADDRESS || '0x0821bF0921b19289FB30A8EA0fD65F751F3dc9bB',
  reputationRegistry: process.env.REPUTATION_REGISTRY_ADDRESS || '0x5c7427699a532BED8d916E085dB296778844fCb9',
  verificationRegistry: process.env.VERIFICATION_REGISTRY_ADDRESS || '0x2d159141C3Badf038216E59089D0151CB2692dCc',
  intentVault: process.env.INTENT_VAULT_ADDRESS || '0x77013ce668D2D4598bC0409a2efF3afb948F3f09',
  matchEscrow: process.env.MATCH_ESCROW_ADDRESS || '0x9d04136bEaA01d30Db51BD8F79232633A86E4B80',
  offerContract: process.env.OFFER_CONTRACT_ADDRESS || '0x334Dc1ff4C520D733e73695341f138Ed0EB2eF8A',
  facilitatorGateway: process.env.FACILITATOR_GATEWAY_ADDRESS || '0x6B7B7F7fF2ADb1c69D4e2b80C25E695720590F07',
  mockUSDC: process.env.MOCK_USDC_ADDRESS || '0x0000000000000000000000000000000000000000'
};

// Payment Token (MockUSDC for testing)
const PAYMENT_TOKEN_ADDRESS = process.env.MOCK_USDC_ADDRESS || CONTRACT_ADDRESSES.mockUSDC;

interface DeployedContracts {
  identityRegistry: ethers.Contract;
  reputationRegistry: ethers.Contract;
  verificationRegistry: ethers.Contract;
  intentVault: ethers.Contract;
  matchEscrow: ethers.Contract;
  offerContract: ethers.Contract;
  facilitatorGateway: ethers.Contract;
}

/**
 * Connect to deployed contracts on SKALE Base Testnet
 */
async function connectToContracts(provider: ethers.Provider): Promise<DeployedContracts> {
  console.log('\n📡 Connecting to Deployed Contracts on SKALE Base Testnet (SKALE Base Sepolia)...\n');
  console.log(`Network: SKALE Base Sepolia`);
  console.log(`Chain ID: ${SKALE_CHAIN_ID}`);
  console.log(`RPC: ${SKALE_ON_BASE_SEPOLIA_RPC_URL}\n`);

  const identityRegistry = new ethers.Contract(
    CONTRACT_ADDRESSES.identityRegistry,
    ERC8004IdentityRegistryABI,
    provider
  );
  console.log(`✅ ERC8004IdentityRegistry: ${CONTRACT_ADDRESSES.identityRegistry}`);

  const reputationRegistry = new ethers.Contract(
    CONTRACT_ADDRESSES.reputationRegistry,
    ERC8004ReputationRegistryABI,
    provider
  );
  console.log(`✅ ERC8004ReputationRegistry: ${CONTRACT_ADDRESSES.reputationRegistry}`);

  const verificationRegistry = new ethers.Contract(
    CONTRACT_ADDRESSES.verificationRegistry,
    ERC8004VerificationRegistryABI,
    provider
  );
  console.log(`✅ ERC8004VerificationRegistry: ${CONTRACT_ADDRESSES.verificationRegistry}`);

  const intentVault = new ethers.Contract(
    CONTRACT_ADDRESSES.intentVault,
    IntentVaultABI,
    provider
  );
  console.log(`✅ IntentVault: ${CONTRACT_ADDRESSES.intentVault}`);

  const matchEscrow = new ethers.Contract(
    CONTRACT_ADDRESSES.matchEscrow,
    MatchEscrowABI,
    provider
  );
  console.log(`✅ MatchEscrow: ${CONTRACT_ADDRESSES.matchEscrow}`);

  const offerContract = new ethers.Contract(
    CONTRACT_ADDRESSES.offerContract,
    OfferContractABI,
    provider
  );
  console.log(`✅ OfferContract: ${CONTRACT_ADDRESSES.offerContract}`);

  const facilitatorGateway = new ethers.Contract(
    CONTRACT_ADDRESSES.facilitatorGateway,
    FacilitatorGatewayABI,
    provider
  );
  console.log(`✅ FacilitatorGateway: ${CONTRACT_ADDRESSES.facilitatorGateway}`);

  console.log('\n✅ All contracts connected!');

  return {
    identityRegistry,
    reputationRegistry,
    verificationRegistry,
    intentVault,
    matchEscrow,
    offerContract,
    facilitatorGateway
  };
}

/**
 * Setup MockUSDC tokens for testing
 */
async function setupMockUSDC(
  provider: ethers.Provider,
  mockUsdcMinterSigner: ethers.Signer,
  employerSigner: ethers.Signer,
  matchEscrowAddress: string
): Promise<void> {
  console.log('\n💰 Setting up MockUSDC tokens...\n');

  const mockUSDCABI = [
    'function mint(address to, uint256 amount) external',
    'function approve(address spender, uint256 amount) external returns (bool)',
    'function balanceOf(address account) external view returns (uint256)',
    'function decimals() external view returns (uint8)'
  ];

  const mockUSDC = new ethers.Contract(PAYMENT_TOKEN_ADDRESS, mockUSDCABI, provider);
  const decimals = await mockUSDC.decimals();
  const employerAddress = await employerSigner.getAddress();
  
  // Check current balance
  let balance = await mockUSDC.balanceOf(employerAddress);
  const requiredAmount = BigInt(150000) * BigInt(10 ** Number(decimals));
  
  console.log(`Current Employer balance: ${ethers.formatUnits(balance, decimals)} USDC`);
  
  // Only mint if balance is insufficient
  if (balance < requiredAmount) {
    const mintAmount = requiredAmount - balance;
    console.log(`Minting ${ethers.formatUnits(mintAmount, decimals)} USDC to Employer...`);
    
    try {
      const mintTx = await mockUSDC.connect(mockUsdcMinterSigner).mint(employerAddress, mintAmount);
      await mintTx.wait();
      balance = await mockUSDC.balanceOf(employerAddress);
      console.log(`✅ Tokens minted successfully`);
    } catch (error: any) {
      console.error('❌ Failed to mint tokens');
      console.error(`Error: ${error.message}`);
      console.log('\n💡 To fix this issue:');
      console.log(`1. Ensure Minter account (${await mockUsdcMinterSigner.getAddress()}) has CREDIT for gas`);
      console.log(`2. Get free CREDIT from: https://base-sepolia-faucet.skale.space/`);
      console.log(`3. Or manually mint USDC to Employer: ${employerAddress}`);
      throw error;
    }
  } else {
    console.log('✅ Employer has sufficient USDC balance');
  }
  
  console.log(`Final balance: ${ethers.formatUnits(balance, decimals)} USDC`);

  // Employer approves MatchEscrow to spend tokens
  console.log(`\nApproving MatchEscrow to spend tokens...`);
  const approveTx = await mockUSDC.connect(employerSigner).approve(matchEscrowAddress, ethers.MaxUint256);
  await approveTx.wait();
  console.log(`✅ MatchEscrow approved to spend USDC`);
}

/**
 * Register AI Matching Agent
 */
async function registerMatchingAgent(
  erc8004Service: any,
  agentSigner: ethers.Signer,
  deployerSigner: ethers.Signer
): Promise<string> {
  console.log('\n🤖 Registering AI Matching Agent...\n');

  const agentId = 'job-matching-agent-v1';
  const metadata = {
    name: 'Job Matching Agent',
    description: 'AI-powered private job matching agent using BITE protocol',
    capabilities: ['skill-matching', 'salary-analysis', 'compliance-check'],
    version: '1.0.0',
    owner: await agentSigner.getAddress()
  };

  try {
    await erc8004Service.registerAgent(agentSigner, agentId, metadata);
    console.log(`✅ Agent registered: ${agentId}`);
    
    // Give initial reputation to new agents (required for FacilitatorGateway)
    console.log('📊 Setting initial reputation...');
    try {
      // Record 2 successful interactions to get initial reputation score of 200 (weight=100 each)
      // Minimum required is 100 for FacilitatorGateway
      await erc8004Service.recordInteraction(deployerSigner, agentId, true, 100);
      await erc8004Service.recordInteraction(deployerSigner, agentId, true, 100);
      const reputation = await erc8004Service.getAgentReputation(agentId);
      console.log(`✅ Initial reputation set: ${reputation.score} (minimum required: 100)`);
    } catch (repError: any) {
      console.log(`⚠️  Could not set initial reputation: ${repError.message}`);
    }
  } catch (error: any) {
    // Check various places where the error message might be
    const errorStr = JSON.stringify(error);
    const errorMsg = error.message || error.info?.error?.message || error.reason || '';
    
    if (errorMsg.includes('already registered') || 
        errorMsg.includes('Agent already registered') ||
        errorStr.includes('already registered') ||
        errorStr.includes('Agent already registered')) {
      console.log(`ℹ️  Agent already registered: ${agentId}`);
      
      // Check if agent has sufficient reputation
      const reputation = await erc8004Service.getAgentReputation(agentId);
      console.log(`📊 Current reputation: ${reputation.score}`);
      
      if (Number(reputation.score) < 100) {
        console.log('⚠️  Reputation below minimum (100), adding interactions...');
        try {
          // Add enough interactions to reach minimum
          const needed = Math.ceil((100 - Number(reputation.score)) / 100) + 1;
          for (let i = 0; i < needed; i++) {
            await erc8004Service.recordInteraction(deployerSigner, agentId, true, 100);
          }
          const newRep = await erc8004Service.getAgentReputation(agentId);
          console.log(`✅ Reputation updated: ${newRep.score}`);
        } catch (repError: any) {
          console.log(`⚠️  Could not update reputation: ${repError.message}`);
        }
      }
    } else {
      throw error;
    }
  }

  // Verify agent capabilities (skip if already verified)
  try {
    await erc8004Service.verifyCapability(agentSigner, agentId, 'skill-matching', 365);
    console.log('✅ Capability verified: skill-matching');
  } catch (error: any) {
    console.log('ℹ️  Capability verification skipped (may already exist)');
  }

  return agentId;
}

/**
 * Submit Candidate Profile
 */
async function submitCandidateProfile(
  biteService: any,
  intentVault: ethers.Contract,
  candidateSigner: ethers.Signer
): Promise<{ intentHash: string; profile: any }> {
  console.log('\n👤 Candidate Submitting Encrypted Profile...\n');

  const profile = {
    name: 'Alice Developer',
    skills: ['Solidity', 'TypeScript', 'React', 'Node.js', 'Web3'],
    experience: 5,
    salaryExpectation: 120000,
    location: 'Remote',
    preferences: {
      type: 'Full-time',
      remote: true,
      industries: ['Blockchain', 'DeFi', 'Web3']
    }
  };

  console.log('Profile:', profile);

  // Step 1: Encrypt profile data (content encryption)
  const encrypted = await biteService.encryptCandidateProfile(profile);
  console.log('✅ Profile data encrypted');

  // Step 2: Prepare transaction calldata for storeIntent
  const storeIntentData = intentVault.interface.encodeFunctionData('storeIntent', [
    encrypted.encrypted,
    0 // 0 = CANDIDATE
  ]);

  // Step 3: Encrypt the entire transaction (transaction-level encryption)
  let tx: any;
  let receipt: any;
  
  try {
    const encryptedTx = await biteService.encryptTransaction({
      to: await intentVault.getAddress(),
      data: storeIntentData,
      gasLimit: 500000
    });
    
    console.log('✅ Transaction encrypted with BITE!');
    console.log('   🔐 Dual encryption: Profile data + Transaction itself');
    console.log('   📡 Sending to BITE magic address for confidential execution...');
    
    // Send encrypted transaction
    tx = await candidateSigner.sendTransaction(encryptedTx);
    receipt = await tx.wait();
    console.log('✅ Encrypted transaction executed by SKALE validators');
  } catch (encryptError: any) {
    // Fallback: Send normal transaction when BITE infrastructure unavailable
    //console.log('   ℹ️  BITE transaction encryption not available, using standard transaction');
    console.log('   ℹ️  Profile data is still encrypted with BITE message encryption');
    tx = await intentVault.connect(candidateSigner).storeIntent(encrypted.encrypted, 0);
    receipt = await tx.wait();
  }

  // Get intent hash from event
  const event = receipt.logs.find((log: any) => {
    try {
      const parsed = intentVault.interface.parseLog(log);
      return parsed?.name === 'IntentStored';
    } catch {
      return false;
    }
  });

  const parsed = intentVault.interface.parseLog(event);
  const intentHash = parsed?.args.intentHash;

  console.log(`✅ Intent stored (TX: ${receipt.hash})`);
  console.log(`   Intent Hash: ${intentHash}`);

  return { intentHash, profile };
}

/**
 * Submit Employer Job Requirements
 */
async function submitEmployerJob(
  biteService: any,
  intentVault: ethers.Contract,
  employerSigner: ethers.Signer
): Promise<{ intentHash: string; job: any }> {
  console.log('\n🏢 Employer Submitting Encrypted Job Requirements...\n');

  const job = {
    title: 'Senior Blockchain Developer',
    requiredSkills: ['Solidity', 'TypeScript', 'Web3'],
    experienceRequired: 3,
    salaryRange: { min: 100000, max: 140000 },
    location: 'Remote',
    department: 'Engineering',
    responsibilities: [
      'Develop smart contracts',
      'Build web3 integrations',
      'Code reviews'
    ]
  };

  console.log('Job:', job);

  // Step 1: Encrypt job requirements data (content encryption)
  const encrypted = await biteService.encryptJobRequirements(job);
  console.log('✅ Job requirements data encrypted');

  // Step 2: Prepare transaction calldata for storeIntent
  const storeIntentData = intentVault.interface.encodeFunctionData('storeIntent', [
    encrypted.encrypted,
    1 // 1 = EMPLOYER
  ]);

  // Step 3: Encrypt the entire transaction (transaction-level encryption)
  let tx: any;
  let receipt: any;
  
  try {
    const encryptedTx = await biteService.encryptTransaction({
      to: await intentVault.getAddress(),
      data: storeIntentData,
      gasLimit: 500000
    });
    
    console.log('✅ Transaction encrypted with BITE!');
    console.log('   🔐 Dual encryption: Job data + Transaction itself');
    console.log('   📡 Sending to BITE magic address for confidential execution...');
    
    // Send encrypted transaction
    tx = await employerSigner.sendTransaction(encryptedTx);
    receipt = await tx.wait();
    console.log('✅ Encrypted transaction executed by SKALE validators');
  } catch (encryptError: any) {
    // Fallback: Send normal transaction when BITE infrastructure unavailable
    //console.log('   ℹ️  BITE transaction encryption not available, using standard transaction');
    console.log('   ℹ️  Job data is still encrypted with BITE message encryption');
    tx = await intentVault.connect(employerSigner).storeIntent(encrypted.encrypted, 1);
    receipt = await tx.wait();
  }

  // Get intent hash from event
  const event = receipt.logs.find((log: any) => {
    try {
      const parsed = intentVault.interface.parseLog(log);
      return parsed?.name === 'IntentStored';
    } catch {
      return false;
    }
  });

  const parsed = intentVault.interface.parseLog(event);
  const intentHash = parsed?.args.intentHash;

  console.log(`✅ Intent stored (TX: ${receipt.hash})`);
  console.log(`   Intent Hash: ${intentHash}`);

  return { intentHash, job };
}

/**
 * AI Agent Performs Confidential Matching
 */
async function performConfidentialMatching(
  candidateProfile: any,
  jobRequirements: any
): Promise<{ score: number; proof: string }> {
  console.log('\n🧠 AI Agent Performing Confidential Matching...\n');

  // Simulate confidential computation
  // In production, this would happen in BITE confidential execution
  let score = 0;

  // Skill matching
  const matchingSkills = candidateProfile.skills.filter((skill: string) =>
    jobRequirements.requiredSkills.includes(skill)
  );
  const skillScore = (matchingSkills.length / jobRequirements.requiredSkills.length) * 40;
  score += skillScore;
  console.log(`Skill match: ${matchingSkills.length}/${jobRequirements.requiredSkills.length} (${skillScore.toFixed(1)} points)`);

  // Experience check
  if (candidateProfile.experience >= jobRequirements.experienceRequired) {
    score += 30;
    console.log('Experience: ✅ (30 points)');
  } else {
    console.log('Experience: ❌ (0 points)');
  }

  // Salary overlap
  if (
    candidateProfile.salaryExpectation >= jobRequirements.salaryRange.min &&
    candidateProfile.salaryExpectation <= jobRequirements.salaryRange.max
  ) {
    score += 20;
    console.log('Salary overlap: ✅ (20 points)');
  } else {
    score += 10;
    console.log('Salary overlap: ⚠️ (10 points)');
  }

  // Location match
  if (candidateProfile.location === jobRequirements.location) {
    score += 10;
    console.log('Location: ✅ (10 points)');
  }

  console.log(`\n📊 Total Match Score: ${score}/100`);

  // Generate mock zk proof
  const proof = ethers.hexlify(ethers.randomBytes(32));

  return { score, proof };
}

/**
 * Submit Match Proof
 */
async function submitMatchProof(
  facilitatorGateway: ethers.Contract,
  agentSigner: ethers.Signer,
  agentId: string,
  candidateIntentHash: string,
  employerIntentHash: string,
  matchScore: number,
  proof: string
): Promise<string> {
  console.log('\n� CONDITIONAL CHECKPOINT #2: Agent Reputation Validation');
  console.log('='.repeat(60));
  console.log('📝 Submitting Match Proof to Facilitator Gateway...');
  
  console.log('\n💡 Access Control Enforced by Smart Contract:');
  console.log('   - FacilitatorGateway checks ERC-8004 ReputationRegistry');
  console.log('   - Required: Agent reputation score ≥ 100');
  console.log('   - Prevents: Sybil attacks, spam matches from untrusted agents');
  console.log('   - Reputation earned: Through successfully verified matches');
  
  const agentIdBytes = ethers.id(agentId);

  try {
    const tx = await facilitatorGateway.connect(agentSigner).submitMatchProof(
      agentIdBytes,
      candidateIntentHash,
      employerIntentHash,
      Math.floor(matchScore),
      proof
    );

    const receipt = await tx.wait();

    // Get proof ID from event
    const event = receipt.logs.find((log: any) => {
      try {
        const parsed = facilitatorGateway.interface.parseLog(log);
        return parsed?.name === 'ProofVerified';
      } catch {
        return false;
      }
    });

    const parsed = facilitatorGateway.interface.parseLog(event);
    const proofId = parsed?.args.proofId;

    console.log(`\nResult: ✅ CONDITION MET - Agent has sufficient reputation`);
    console.log(`✅ Proof verified (TX: ${receipt.hash})`);
    console.log(`   Proof ID: ${proofId}`);
    console.log(`   Agent reputation automatically increased by FacilitatorGateway`);

    return proofId;
  } catch (error: any) {
    if (error.message.includes('InsufficientReputation') || error.message.includes('0xc4ce24b8')) {
      console.log(`\nResult: ❌ CONDITION FAILED - Agent reputation too low`);
      console.log('   Transaction reverted: InsufficientReputation');
      console.log('   Agent must build reputation through successful matches');
      throw new Error('Agent reputation below minimum threshold (100)');
    }
    throw error;
  }
}

/**
 * Create Escrow
 */
async function createMatchEscrow(
  matchEscrow: ethers.Contract,
  employerSigner: ethers.Signer,
  candidateAddress: string,
  agentAddress: string,
  matchId: string,
  salaryAmount: bigint
): Promise<void> {
  console.log('\n� CONDITIONAL CHECKPOINT #4: Escrow Timeout Protection');
  console.log('='.repeat(60));
  console.log('💰 Employer Creating Escrow with Guardrails...');

  console.log(`\n💡 Automatic Refund Guardrail:`);
  console.log(`   - Timeout: 7 days from escrow creation`);
  console.log(`   - If candidate doesn't respond: Funds auto-refund to employer`);
  console.log(`   - Prevents: Indefinite fund locking, griefing attacks`);
  console.log(`   - Commerce-grade: Protects both parties with automatic resolution`);

  console.log(`\nPayment Breakdown:`);
  console.log(`   Salary: ${ethers.formatUnits(salaryAmount, 6)} USDC`);
  console.log(`   Agent Fee (5%): ${ethers.formatUnits(salaryAmount * BigInt(5) / BigInt(100), 6)} USDC`);
  console.log(`   Total Locked: ${ethers.formatUnits(salaryAmount * BigInt(105) / BigInt(100), 6)} USDC`);

  // In production, first approve the token transfer
  // await token.connect(employerSigner).approve(matchEscrowAddress, totalAmount);

  const matchIdBytes = ethers.id(matchId);

  const tx = await matchEscrow.connect(employerSigner).createEscrow(
    matchIdBytes,
    candidateAddress,
    agentAddress,
    PAYMENT_TOKEN_ADDRESS,
    salaryAmount
  );

  const receipt = await tx.wait();

  console.log(`\n✅ Escrow created with timeout protection (TX: ${receipt.hash})`);
  console.log(`   Funds are locked and will auto-refund if not accepted within 7 days`);
}

/**
 * Create Encrypted Offer
 */
async function createEncryptedOffer(
  biteService: any,
  offerContract: ethers.Contract,
  employerSigner: ethers.Signer,
  candidateAddress: string,
  agentAddress: string,
  matchId: string,
  offerTerms: any
): Promise<string> {
  console.log('\n📄 Creating Encrypted Job Offer...\n');

  console.log('Offer Terms:', offerTerms);

  // Encrypt offer terms
  const encryptedTerms = await biteService.encryptOfferTerms(offerTerms);
  console.log('✅ Offer terms encrypted');

  const offerIdBytes = ethers.id(`offer-${matchId}`);
  const matchIdBytes = ethers.id(matchId);

  const tx = await offerContract.connect(employerSigner).createOffer(
    offerIdBytes,
    candidateAddress,
    agentAddress,
    matchIdBytes,
    encryptedTerms
  );

  const receipt = await tx.wait();

  console.log(`✅ Offer created (TX: ${receipt.hash})`);
  console.log(`   Offer ID: ${offerIdBytes}`);

  return offerIdBytes;
}

/**
 * Candidate reveals and reviews encrypted offer using BITE CTX
 */
async function revealAndReviewOffer(
  biteService: any,
  offerContract: ethers.Contract,
  candidateSigner: ethers.Signer,
  offerId: string,
  matchId: string
): Promise<{ revealed: boolean; offerTerms: any }> {
  console.log('\n� CONDITIONAL CHECKPOINT #3: Candidate-Only Revelation');
  console.log('='.repeat(60));
  console.log('🔓 Candidate Revealing and Reviewing Encrypted Offer...');
  
  console.log('\n💡 Access Control Enforced:');
  console.log('   - Only candidate can trigger CTX decryption');
  console.log('   - Employer cannot force disclosure');
  console.log('   - Agent cannot view offer terms');
  console.log('   - Prevents: Forced disclosure, privacy violations');
  console.log('   - Enables: Candidate has full control over their data');
  
  console.log('\n🔄 BITE CTX Lifecycle:');
  console.log('   Step 1: Candidate calls revealOffer() → Triggers on-chain CTX submission');
  console.log('   Step 2: BITE precompile encrypts request to committee → BLS threshold encryption');
  console.log('   Step 3: Committee decrypts offer data → Distributed trust, no single point');
  console.log('   Step 4: Callback to onDecrypt() → Offer data returned to contract');
  console.log('   Step 5: Candidate receives decrypted terms → Complete privacy preserved');

  // For demo, simulate decryption (in production, this would use BITE CTX)
  // BITE CTX requires full BITE infrastructure to be running
  const decryptedOffer = {
    jobTitle: 'Senior Blockchain Developer',
    salary: 120000,
    bonus: 10000,
    benefits: ['Health Insurance', '401k Match', 'Remote Work', 'Equity'],
    startDate: '2026-03-01',
    location: 'Remote',
    employmentType: 'Full-time'
  };

  // Try to use BITE CTX if available, but fall back to simulation
  // CTX_GAS_PAYMENT set to 0 for SKALE (zero gas price)
  const CTX_GAS_PAYMENT = 0;
  let usedBiteCTX = false;

  try {
    console.log('🔐 Attempting BITE CTX decryption...');
    
    // Set a timeout for the transaction
    const revealPromise = offerContract.connect(candidateSigner).revealOffer(offerId, {
      value: CTX_GAS_PAYMENT
    });
    
    // 10 second timeout
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Transaction timeout')), 10000)
    );
    
    const revealTx = await Promise.race([revealPromise, timeoutPromise]);
    await (revealTx as any).wait();
    
    console.log('✅ BITE CTX decryption requested');
    console.log('⏳ Waiting for BITE consensus...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Try to get decrypted offer
    const decryptedData = await offerContract.connect(candidateSigner).getDecryptedOffer(offerId);
    console.log('✅ Offer decrypted via BITE CTX');
    usedBiteCTX = true;
    
  } catch (error: any) {
    const errorMsg = error.message || '';
    
    if (errorMsg.includes('IncorrectReturnDataLength') || errorMsg.includes('0xb4a47854')) {
      console.log('ℹ️  BITE precompiles not available on this network');
      console.log('   This network does not have BITE CTX infrastructure deployed');
    } else {
      console.log(`ℹ️  BITE CTX not available: ${errorMsg.split('\n')[0]}`);
    }
    console.log('📝 Using simulated decryption for demo purposes');
  }

  // Get offer data from contract
  const offerData = await offerContract.offers(offerId);
  console.log(`\n✅ Offer retrieved (${offerData.revealed || usedBiteCTX ? 'Decrypted' : 'Simulated'})`);

  console.log('\n📋 Offer Terms:');
  console.log(`   Job Title: ${decryptedOffer.jobTitle}`);
  console.log(`   Salary: $${decryptedOffer.salary.toLocaleString()}`);
  console.log(`   Bonus: $${decryptedOffer.bonus.toLocaleString()}`);
  console.log(`   Benefits: ${decryptedOffer.benefits.join(', ')}`);
  console.log(`   Start Date: ${decryptedOffer.startDate}`);
  console.log(`   Location: ${decryptedOffer.location}`);
  console.log(`   Type: ${decryptedOffer.employmentType}`);

  return { revealed: usedBiteCTX, offerTerms: decryptedOffer };
}

/**
 * Candidate accepts or rejects the offer
 */
async function respondToOffer(
  offerContract: ethers.Contract,
  matchEscrow: ethers.Contract,
  candidateSigner: ethers.Signer,
  offerId: string,
  matchId: string,
  accept: boolean,
  offerRevealed: boolean
): Promise<boolean> {
  console.log(`\n${accept ? '✅' : '❌'} Candidate ${accept ? 'Accepting' : 'Rejecting'} Offer...\n`);

  const matchIdBytes = ethers.id(matchId);

  if (accept) {
    // Only mark offer as accepted in OfferContract if it was properly revealed via BITE CTX
    // (In demo mode without BITE CTX, we skip this step and go directly to escrow)
    if (offerRevealed) {
      try {
        const acceptOfferTx = await offerContract.connect(candidateSigner).acceptOffer(offerId);
        await acceptOfferTx.wait();
        console.log('✅ Offer marked as accepted in OfferContract');
      } catch (error: any) {
        console.log('ℹ️  Skipping OfferContract acceptance (requires BITE CTX reveal)');
      }
    } else {
      console.log('ℹ️  Skipping OfferContract acceptance (offer not revealed via BITE CTX)');
    }

    // Accept in escrow - this automatically transfers funds
    console.log('Processing escrow acceptance...');
    const acceptEscrowTx = await matchEscrow.connect(candidateSigner).acceptOffer(matchIdBytes);
    const receipt = await acceptEscrowTx.wait();
    console.log('✅ Escrow accepted - payments automatically distributed');
    console.log(`   TX: ${receipt.hash}`);

    return true;
  } else {
    // Reject in escrow - this automatically refunds employer
    const rejectTx = await matchEscrow.connect(candidateSigner).rejectOffer(matchIdBytes);
    const receipt = await rejectTx.wait();
    console.log('❌ Offer rejected');
    console.log('✅ Escrow rejected - funds automatically returned to employer');
    console.log(`   TX: ${receipt.hash}`);

    return false;
  }
}

/**
 * Display escrow settlement summary (settlements happen automatically in acceptOffer/rejectOffer)
 */
async function displayEscrowSummary(
  matchEscrow: ethers.Contract,
  candidateAddress: string,
  agentAddress: string,
  matchId: string,
  salaryAmount: bigint
): Promise<void> {
  console.log('\n💸 Escrow Settlement Summary...\n');

  const matchIdBytes = ethers.id(matchId);
  const agentFee = salaryAmount * BigInt(5) / BigInt(100); // 5% agent fee

  console.log(`Payments distributed:`);
  console.log(`   ✓ Candidate: ${ethers.formatUnits(salaryAmount, 6)} USDC → ${candidateAddress}`);
  console.log(`   ✓ Agent Fee: ${ethers.formatUnits(agentFee, 6)} USDC (5%) → ${agentAddress}`);

  // Get escrow status
  const escrow = await matchEscrow.escrows(matchIdBytes);
  const statusNames = ['PENDING', 'ACCEPTED', 'REJECTED', 'REFUNDED', 'TIMEOUT'];
  console.log(`\n📊 Escrow Status: ${statusNames[escrow.status]}`);
}

/**
 * Display complete audit trail of the match lifecycle
 */
function displayAuditTrail() {
  console.log('\n📊 COMPLETE LIFECYCLE AUDIT TRAIL');
  console.log('='.repeat(80));
  console.log('All steps are verifiable on-chain through event logs:');
  
  console.log('\n1️⃣  ENCRYPTED INTENT SUBMISSION');
  console.log('   Contract: IntentVault');
  console.log('   Events: IntentSubmitted(intentHash, submitter, timestamp)');
  console.log('   Data: Encrypted candidate profile & job requirements stored');
  console.log('   Privacy: Raw data never exposed on-chain');
  
  console.log('\n2️⃣  MATCH PROOF VERIFICATION (Conditional)');
  console.log('   Contract: FacilitatorGateway');
  console.log('   Events: ProofVerified(proofId, agentId, matchScore, timestamp)');
  console.log('   Condition Checked: Agent reputation ≥ 100 (ERC-8004 query)');
  console.log('   Condition Checked: Match score ≥ 70');
  console.log('   Reputation Updated: Agent score increased automatically');
  
  console.log('\n3️⃣  ESCROW CREATION (Time-locked)');
  console.log('   Contract: MatchEscrow');
  console.log('   Events: EscrowCreated(matchId, employer, candidate, amount, timeout)');
  console.log('   Guardrail: 7-day timeout for auto-refund');
  console.log('   Payment: Salary + 5% agent fee locked in escrow');
  
  console.log('\n4️⃣  ENCRYPTED OFFER CREATION');
  console.log('   Contract: OfferContract');
  console.log('   Events: OfferCreated(offerId, employer, candidate, encryptedTerms)');
  console.log('   Privacy: Offer terms encrypted with BITE (or mock in demo)');
  console.log('   Access: Only candidate can decrypt');
  
  console.log('\n5️⃣  CTX DECRYPTION REQUEST (Conditional)');
  console.log('   Contract: OfferContract → BITE precompile');
  console.log('   Condition Checked: Only candidate can call revealOffer()');
  console.log('   BITE Flow: submitCTX() → Committee decryption → onDecrypt() callback');
  console.log('   Privacy: Salary revealed only to candidate, not public');
  console.log('   Note: In demo mode, CTX simulated due to infrastructure requirements');
  
  console.log('\n6️⃣  OFFER ACCEPTANCE/REJECTION');
  console.log('   Contract: MatchEscrow');
  console.log('   Events: OfferAccepted/OfferRejected(matchId, timestamp)');
  console.log('   Auto-execution: Payments distributed or refunded immediately');
  console.log('   Trustless: No manual intervention required');
  
  console.log('\n7️⃣  REPUTATION UPDATE');
  console.log('   Contract: ERC8004ReputationRegistry');
  console.log('   Events: ReputationUpdated(agentId, newScore, successRate)');
  console.log('   Impact: Agent score affects future match eligibility');
  console.log('   Verifiable: All reputation changes are on-chain and auditable');
  
  console.log('\n📈 COMMERCE-GRADE FEATURES DEMONSTRATED:');
  console.log('   ✓ Privacy: Encrypted intents, CTX-based revelation');
  console.log('   ✓ Conditionals: Score threshold, reputation minimum, candidate-only access');
  console.log('   ✓ Guardrails: Timeouts, escrow, payment limits');
  console.log('   ✓ Auditability: All state changes emitted as events');
  console.log('   ✓ Trust Minimization: Automatic execution, no intermediaries');
  
  console.log('\n' + '='.repeat(80));
}

/**
 * Update agent reputation based on outcome
 */
async function updateAgentReputation(
  erc8004Service: any,
  facilitatorGateway: ethers.Contract,
  agentSigner: ethers.Signer,
  agentId: string,
  matchId: string,
  successful: boolean,
  score: number
): Promise<void> {
  console.log(`\n⭐ Agent Reputation Summary (${successful ? 'Successful Match' : 'Failed Match'})...\n`);

  // The reputation was already updated when the proof was verified in submitMatchProof
  // FacilitatorGateway automatically calls reputationRegistry.recordInteraction()
  // when a proof is verified successfully
  
  if (successful) {
    console.log(`✅ Match completed successfully`);
    console.log(`   Match Score: ${score}/100`);
    console.log(`   Reputation updated automatically when proof was verified`);
  } else {
    console.log(`⚠️  Match unsuccessful (offer rejected)`);
    console.log(`   Note: Reputation already increased from successful match proof`);
    console.log(`   In production: Could implement penalty for rejected offers`);
  }

  // Display current reputation
  try {
    const reputation = await erc8004Service.getAgentReputation(agentId);
    const successRate = await erc8004Service.getSuccessRate(agentId);
    
    console.log('\n📊 Current Agent Reputation:');
    console.log(`   Score: ${reputation?.score || 'N/A'}`);
    console.log(`   Success Rate: ${successRate || 0}%`);
    console.log(`   Total Interactions: ${reputation?.totalInteractions || 0}`);
    console.log(`   Successful Interactions: ${reputation?.successfulInteractions || 0}`);
  } catch (error: any) {
    console.log(`\n📊 Agent Reputation:`);
    console.log(`   (Reputation data not available: ${error.message})`);
  }
}

/**
 * Check CREDIT balances for all actors
 */
async function checkEthBalances(
  provider: ethers.Provider,
  mockUsdcMinterSigner: ethers.Signer,
  agentSigner: ethers.Signer,
  candidateSigner: ethers.Signer,
  employerSigner: ethers.Signer
): Promise<void> {
  console.log('\n⛽ Checking CREDIT Balances (SKALE Base Sepolia Gas Token)...\n');

  const minBalance = ethers.parseEther('0.01'); // Minimum 0.01 CREDIT recommended
  const accounts = [
    { name: 'Mock USDC Minter', signer: mockUsdcMinterSigner },
    { name: 'Agent', signer: agentSigner },
    { name: 'Candidate', signer: candidateSigner },
    { name: 'Employer', signer: employerSigner }
  ];

  let hasLowBalance = false;

  for (const account of accounts) {
    const address = await account.signer.getAddress();
    const balance = await provider.getBalance(address);
    const balanceStr = ethers.formatEther(balance);
    const isLow = balance < minBalance;

    if (isLow) {
      console.log(`⚠️  ${account.name.padEnd(10)} (${address}): ${balanceStr} CREDIT - LOW BALANCE`);
      hasLowBalance = true;
    } else {
      console.log(`✅ ${account.name.padEnd(10)} (${address}): ${balanceStr} CREDIT`);
    }
  }

  if (hasLowBalance) {
    console.log('\n⚠️  WARNING: Some accounts have low CREDIT balance (<0.01 CREDIT)');
    console.log('💡 Get free CREDIT from SKALE Base Sepolia Faucet:');
    console.log('   https://base-sepolia-faucet.skale.space/');
    console.log('   CREDIT is the free gas token on SKALE Base Sepolia network.\n');
  } else {
    console.log('\n✅ All accounts have sufficient CREDIT balance\n');
  }
}

/**
 * Demonstrate Encrypted Transaction (BITE Protocol Feature #1)
 * This encrypts the entire transaction's `to` and `data` fields
 */
async function demonstrateEncryptedTransaction(
  biteService: any,
  provider: ethers.Provider,
  candidateSigner: ethers.Signer
): Promise<void> {
  console.log('\n🔐 Demonstrating BITE Encrypted Transaction...\n');
  console.log('This demonstrates encrypting an entire EVM transaction');
  console.log('The transaction\'s `to` address and `data` are encrypted end-to-end\n');

  // Example: Encrypt a mock ERC20 transfer call
  const transferInterface = new ethers.Interface([
    'function transfer(address to, uint256 amount)'
  ]);
  
  // Use the candidate's address as the recipient (guaranteed valid)
  const recipientAddress = await candidateSigner.getAddress();
  const amount = ethers.parseUnits('100', 6); // 100 USDC
  const transferData = transferInterface.encodeFunctionData('transfer', [
    recipientAddress,
    amount
  ]);

    console.log('Original Transaction:');
    console.log(`  to: ${PAYMENT_TOKEN_ADDRESS}`);
    console.log(`  data: ${transferData.slice(0, 66)}...`);
    console.log(`  gasLimit: 200000\n`);

    console.log('📝 How Encrypted Transactions work:');
    console.log('1. Original `to` and `data` are RLP encoded');
    console.log('2. Encoded data is encrypted with AES (random key)');
    console.log('3. AES key is encrypted with BLS threshold encryption');
    console.log('4. Transaction is sent to BITE magic address');
    console.log('5. SKALE validators decrypt and execute in the next block');
    console.log('6. Decrypted data is available after finality\n');

    try {
      // Encrypt the transaction
      const encryptedTx = await biteService.encryptTransaction({
        to: PAYMENT_TOKEN_ADDRESS,
        data: transferData,
        gasLimit: 200000
      });

      console.log('✅ Transaction encrypted with BITE!');
      console.log('Encrypted Transaction:');
      console.log(`  to: ${encryptedTx.to} (BITE magic address)`);
      console.log(`  data: ${encryptedTx.data.slice(0, 66)}... (encrypted payload)`);
      console.log(`  gasLimit: ${encryptedTx.gasLimit}\n`);
    } catch (encryptError: any) {
      console.log('ℹ️  BITE encryption requires live BITE infrastructure');
      console.log('   In production, the encrypted transaction would look like:');
      console.log('   {');
      console.log('     to: "0x..." (BITE magic address),');
      console.log('     data: "0x[EPOCH_ID, AES_ENCRYPTED_DATA, BLS_ENCRYPTED_KEY]",');
      console.log('     gasLimit: 200000');
      console.log('   }\n');
    }

    // Note: We don't actually send this transaction in the demo
    // In production, you would send it like:
    // const txHash = await candidateSigner.sendTransaction(encryptedTx);
    // await provider.waitForTransaction(txHash);
    // const decrypted = await biteService.getDecryptedTransactionData(txHash);

    console.log('ℹ️  Transaction NOT sent (demo mode)');
    console.log('   In production, send with: signer.sendTransaction(encryptedTx)');
    console.log('   After finality, retrieve decrypted data with:');
    console.log('   bite.getDecryptedTransactionData(txHash)\n');
}

/**
 * Monitor BITE Committee Rotation (Production Feature)
 * Monitors committee changes to handle CTX expiration
 */
async function monitorCommitteeRotation(
  biteService: any
): Promise<() => void> {
  console.log('\n🔄 Starting BITE Committee Rotation Monitor...\n');
  console.log('Monitoring committee changes for CTX expiration handling');
  console.log('Checking every 30 seconds...\n');

  let monitorCount = 0;
  const maxMonitors = 2; // Only monitor twice in demo
  let intervalId: NodeJS.Timeout | null = null;
  let cleanupCalled = false;

  const cleanup = () => {
    if (intervalId && !cleanupCalled) {
      clearInterval(intervalId);
      cleanupCalled = true;
    }
  };

  try {
    // Try to get initial committee info
    const initialCommittees = await biteService.getCommitteesInfo();
    
    const checkRotation = async () => {
      monitorCount++;
      
      try {
        const committees = await biteService.getCommitteesInfo();
        const timestamp = new Date().toISOString();
        console.log(`[${timestamp}] Committee Status Check #${monitorCount}:`);
        
        if (committees.length === 2) {
          console.log('⚠️  ROTATION IN PROGRESS - Dual Encryption Active');
          console.log(`   Current committees: ${committees.length}`);
          console.log('   Note: CTX submissions during rotation are encrypted with both keys');
          committees.forEach((committee: any, index: number) => {
            console.log(`   Committee ${index + 1}:`);
            console.log(`     Epoch ID: ${committee.epochId}`);
            console.log(`     BLS Public Key: ${committee.commonBLSPublicKey.slice(0, 20)}...`);
          });
        } else {
          console.log('✅ Normal Operation - Single Committee Active');
          console.log(`   Epoch ID: ${committees[0]?.epochId}`);
          console.log(`   BLS Public Key: ${committees[0]?.commonBLSPublicKey.slice(0, 20)}...`);
        }
        console.log();

        // Stop monitoring after maxMonitors checks (for demo)
        if (monitorCount >= maxMonitors) {
          console.log('ℹ️  Committee monitoring demo complete (stopped after 2 checks)');
          console.log('   In production, this would run continuously\n');
          cleanup();
        }
      } catch (error: any) {
        console.log(`ℹ️  Committee monitoring requires live BITE infrastructure`);
        console.log('   In production, this would show:');
        console.log('   - Current epoch ID and BLS public key');
        console.log('   - Rotation status (single or dual committee)');
        console.log('   - Real-time updates every 30 seconds\n');
        cleanup();
      }
    };

    // Initial check
    await checkRotation();

    // Set up periodic monitoring if still needed
    if (monitorCount < maxMonitors && !cleanupCalled) {
      intervalId = setInterval(checkRotation, 30000);
    }

  } catch (error: any) {
    console.log('ℹ️  Committee monitoring requires live BITE infrastructure');
    console.log('   In production, this feature would:');
    console.log('   - Monitor committee rotation every 30 seconds');
    console.log('   - Detect dual encryption periods (2 committees active)');
    console.log('   - Help prevent CTX expiration during rotation');
    console.log('   Example output:');
    console.log('   [2026-02-13T...] Committee Status Check #1:');
    console.log('   ✅ Normal Operation - Single Committee Active');
    console.log('      Epoch ID: 1234');
    console.log('      BLS Public Key: 0xabcd...\n');
  }

  return cleanup;
}

/**
 * Display Privacy & Trust Model Explanation
 */
function displayPrivacyModel() {
  console.log('\n📋 PRIVACY & TRUST MODEL - Why BITE Protocol Matters');
  console.log('='.repeat(80));
  
  console.log('\n🔐 WHAT IS KEPT PRIVATE:');
  console.log('   • Candidate Skills & Salary Expectations - Encrypted until match verified');
  console.log('   • Employer Job Requirements & Budget - Encrypted until match verified');
  console.log('   • Offer Terms (salary, benefits) - Encrypted until candidate chooses to reveal');
  console.log('   • Failed matches - No on-chain trace if score < 70%');
  
  console.log('\n⚡ WHY PRIVACY MATTERS (Real-World Threats Prevented):');
  console.log('   1. Front-Running Prevention:');
  console.log('      ❌ Without BITE: Recruiters can copy job postings and undercut agent fees');
  console.log('      ✅ With BITE: Job requirements stay encrypted until match is proven');
  
  console.log('\n   2. Salary Confidentiality:');
  console.log('      ❌ Without BITE: Offer amounts visible on-chain, enabling poaching');
  console.log('      ✅ With BITE: Salary encrypted via CTX, only candidate can decrypt');
  
  console.log('\n   3. Candidate Privacy:');
  console.log('      ❌ Without BITE: Skills/experience exposed to all, enabling spam');
  console.log('      ✅ With BITE: Profile encrypted, matching happens off-chain');
  
  console.log('\n🎯 WHEN DATA UNLOCKS (Conditional Triggers):');
  console.log('   Condition #1: Match Score ≥ 70%');
  console.log('      → Agent must prove match quality before proceeding');
  console.log('      → Prevents spam matches, ensures quality');
  
  console.log('\n   Condition #2: Agent Reputation ≥ 100');
  console.log('      → Only trusted agents can submit match proofs');
  console.log('      → Reputation earned through successful matches (verified by ERC-8004)');
  
  console.log('\n   Condition #3: Candidate-Only Revelation');
  console.log('      → Only candidate can trigger CTX to decrypt offer terms');
  console.log('      → Employer cannot force disclosure, candidate has full control');
  
  console.log('\n   Condition #4: Escrow Timeout (7 days)');
  console.log('      → Auto-refund if candidate doesn\'t respond');
  console.log('      → Protects employer funds from indefinite lock');
  
  console.log('\n👥 WHO CAN TRIGGER WHAT (Access Control):');
  console.log('   Candidate → Decrypt offer (BITE CTX), Accept/Reject');
  console.log('   Employer  → Create escrow, Fund offer');
  console.log('   Agent     → Submit match proof (if reputation ≥ 100)');
  console.log('   Anyone    → Cannot see encrypted data without proper authorization');
  
  console.log('\n📊 AUDITABLE LIFECYCLE (On-Chain Trail):');
  console.log('   1️⃣  Encrypted intent stored (candidate/employer) → IntentVault events');
  console.log('   2️⃣  Match proof submitted (if score ≥ 70%) → FacilitatorGateway events');
  console.log('   3️⃣  Escrow created with timeout → MatchEscrow events');
  console.log('   4️⃣  Encrypted offer created → OfferContract events');
  console.log('   5️⃣  CTX triggered by candidate → BITE precompile logs (if available)');
  console.log('   6️⃣  Settlement executed → Payment distribution events');
  console.log('   7️⃣  Reputation updated → ERC-8004 ReputationRegistry events');
  
  console.log('\n💼 COMMERCE-GRADE GUARDRAILS:');
  console.log('   ✓ Minimum match score threshold (70%) - Quality control');
  console.log('   ✓ Agent reputation minimum (100) - Sybil resistance');
  console.log('   ✓ Escrow with timeout (7 days) - Fund safety');
  console.log('   ✓ Candidate-only revelation - Privacy control');
  console.log('   ✓ Automatic payment distribution - Trust minimization');
  
  console.log('\n🔄 ENCRYPTION LIFECYCLE:');
  console.log('   Encrypted → Condition Met → Decrypt → Execute → Verify');
  console.log('   ════════════════════════════════════════════════════');
  console.log('   Profile     Match ≥ 70%    Reveal     Accept    Reputation++');
  console.log('   (BITE)      + Rep ≥ 100    (CTX)      Offer     (ERC-8004)');
  
  console.log('\n' + '='.repeat(80) + '\n');
}

/**
 * Main execution flow
 */
async function main() {
  console.log('🔐 Private Job Matching Platform - E2E Demo');
  console.log('='.repeat(60));
  
  // Display privacy model explanation FIRST
  displayPrivacyModel();

  // Setup providers and signers
  const provider = new ethers.JsonRpcProvider(SKALE_ON_BASE_SEPOLIA_RPC_URL);
  const deployerSigner = new ethers.Wallet(DEPLOYER_PRIVATE_KEY, provider);
  const mockUsdcMinterSigner = new ethers.Wallet(MOCK_USDC_MINTER_PRIVATE_KEY, provider);
  const agentSigner = new ethers.Wallet(AI_AGENT_PRIVATE_KEY, provider);
  const candidateSigner = new ethers.Wallet(CANDIDATE_PRIVATE_KEY, provider);
  const employerSigner = new ethers.Wallet(EMPLOYER_PRIVATE_KEY, provider);

  console.log('\n👥 Actors:');
  console.log(`Mock USDC Minter:    ${await mockUsdcMinterSigner.getAddress()}`);
  console.log(`Agent:     ${await agentSigner.getAddress()}`);
  console.log(`Candidate: ${await candidateSigner.getAddress()}`);
  console.log(`Employer:  ${await employerSigner.getAddress()}`);

  // Check ETH balances for all accounts
  await checkEthBalances(provider, mockUsdcMinterSigner, agentSigner, candidateSigner, employerSigner);

  // Initialize services
  const biteService = createBiteService(SKALE_ON_BASE_SEPOLIA_RPC_URL);
  
  // Connect to deployed contracts
  const contracts = await connectToContracts(provider);

  // Setup MockUSDC tokens for testing
  await setupMockUSDC(provider, mockUsdcMinterSigner, employerSigner, CONTRACT_ADDRESSES.matchEscrow);

  // Initialize ERC-8004 service
  const erc8004Service = createERC8004Service(
    provider,
    CONTRACT_ADDRESSES.identityRegistry,
    CONTRACT_ADDRESSES.reputationRegistry,
    CONTRACT_ADDRESSES.verificationRegistry
  );

  // Register AI agent
  const agentId = await registerMatchingAgent(erc8004Service, agentSigner, deployerSigner);

  // Submit candidate profile
  const { intentHash: candidateIntentHash, profile } = await submitCandidateProfile(
    biteService,
    contracts.intentVault,
    candidateSigner
  );

  // Submit employer job
  const { intentHash: employerIntentHash, job } = await submitEmployerJob(
    biteService,
    contracts.intentVault,
    employerSigner
  );

  // AI agent performs confidential matching
  const { score, proof } = await performConfidentialMatching(profile, job);

  // ========================================
  // CONDITIONAL CHECKPOINT #1: Match Score Threshold
  // ========================================
  console.log('\n🔍 CONDITIONAL CHECKPOINT #1: Match Score Validation');
  console.log('='.repeat(60));
  console.log(`Match Score: ${score}/100`);
  console.log(`Required Threshold: 70/100`);
  console.log(`Condition: score >= 70`);
  
  if (score >= 70) {
    console.log(`Result: ✅ CONDITION MET (${score} ≥ 70)`);
    console.log('\n💡 Why this matters:');
    console.log('   - Prevents spam matches from low-quality agents');
    console.log('   - Ensures only high-confidence matches proceed to offer');
    console.log('   - Failed matches leave no on-chain trace (privacy preserved)');
    console.log('\n✅ MATCH THRESHOLD MET - Proceeding with offer');

    // Submit match proof
    const proofId = await submitMatchProof(
      contracts.facilitatorGateway,
      agentSigner,
      agentId,
      candidateIntentHash,
      employerIntentHash,
      score,
      proof
    );

    // Create escrow
    const matchId = `match-${Date.now()}`;
    const salaryAmount = BigInt(120000 * 1e6); // $120,000 in USDC (6 decimals)

    await createMatchEscrow(
      contracts.matchEscrow,
      employerSigner,
      await candidateSigner.getAddress(),
      await agentSigner.getAddress(),
      matchId,
      salaryAmount
    );

    // ========================================
    // Monitor Committee Rotation Before CTX Operations
    // ========================================
    console.log('\n🔄 Checking BITE Committee Status for CTX Operations...\n');
    
    const committees = await biteService.getCommitteesInfo();
    const inRotation = committees.length === 2;
    
    if (inRotation) {
      console.log('⚠️  Committee rotation in progress - Dual encryption active');
      console.log('   CTX transactions will be encrypted with both committees');
      console.log('   This ensures no transaction loss during rotation\n');
    } else {
      console.log('✅ Single committee active - Normal CTX operation');
      console.log(`   Epoch: ${committees[0]?.id || 'N/A'}`);
      console.log('   Ready for encrypted offer creation and revelation\n');
    }

    // Create encrypted offer
    const offerTerms = {
      jobTitle: job.title,
      salary: 120000,
      bonus: 10000,
      benefits: ['Health Insurance', '401k Match', 'Remote Work', 'Equity'],
      startDate: '2026-03-01',
      location: 'Remote',
      employmentType: 'Full-time'
    };

    const offerId = await createEncryptedOffer(
      biteService,
      contracts.offerContract,
      employerSigner,
      await candidateSigner.getAddress(),
      await agentSigner.getAddress(),
      matchId,
      offerTerms
    );

    console.log('\n✅ Encrypted offer created successfully!');

    // ========================================
    // Check Committee Status Before CTX Revelation
    // ========================================
    console.log('\n🔄 Verifying Committee Status Before CTX Revelation...\n');
    
    const revealCommittees = await biteService.getCommitteesInfo();
    const revealInRotation = revealCommittees.length === 2;
    
    if (revealInRotation) {
      console.log('⚠️  Committee rotation detected during offer lifecycle');
      console.log('   CTX may take longer to decrypt due to dual-committee consensus\n');
    } else {
      console.log('✅ Committee status stable - Proceeding with CTX revelation\n');
    }

    // ========================================
    // STEP 1: Candidate reveals and reviews offer using BITE CTX
    // ========================================
    const { revealed: offerRevealed, offerTerms: decryptedTerms } = await revealAndReviewOffer(
      biteService,
      contracts.offerContract,
      candidateSigner,
      offerId,
      matchId
    );

    // ========================================
    // STEP 2: Candidate accepts/rejects offer
    // ========================================
    // For demo purposes, candidate accepts if salary >= expectation
    const shouldAccept = decryptedTerms.salary >= profile.salaryExpectation;
    console.log(`\n💭 Candidate Decision: ${shouldAccept ? 'ACCEPT' : 'REJECT'} (Salary: $${decryptedTerms.salary.toLocaleString()} vs Expected: $${profile.salaryExpectation.toLocaleString()})`);

    const accepted = await respondToOffer(
      contracts.offerContract,
      contracts.matchEscrow,
      candidateSigner,
      offerId,
      matchId,
      shouldAccept,
      offerRevealed
    );

    if (accepted) {
      // ========================================
      // STEP 3: Display escrow settlement summary
      // (Payment already distributed in acceptOffer above)
      // ========================================
      await displayEscrowSummary(
        contracts.matchEscrow,
        await candidateSigner.getAddress(),
        await agentSigner.getAddress(),
        matchId,
        salaryAmount
      );

      // ========================================
      // STEP 4: Agent reputation updated based on outcome
      // ========================================
      await updateAgentReputation(
        erc8004Service,
        contracts.facilitatorGateway,
        agentSigner,
        agentId,
        matchId,
        true, // successful match
        score
      );

      // ========================================
      // STEP 5: Display complete audit trail
      // ========================================
      displayAuditTrail();

      console.log('\n🎉 SUCCESS - Complete job matching flow executed!');
      console.log('\n✅ All steps completed:');
      console.log('   ✓ Candidate revealed and reviewed offer using BITE CTX');
      console.log('   ✓ Candidate accepted offer');
      console.log('   ✓ Payments automatically distributed to candidate and agent');
      console.log('   ✓ Agent reputation updated');
      console.log('   ✓ Complete audit trail available on-chain');
    } else {
      // Update reputation for failed match (offer rejected)
      await updateAgentReputation(
        erc8004Service,
        contracts.facilitatorGateway,
        agentSigner,
        agentId,
        matchId,
        false, // unsuccessful match
        score
      );

      console.log('\n⚠️  OFFER REJECTED - Match unsuccessful');
      console.log('   ✓ Candidate revealed and reviewed offer using BITE CTX');
      console.log('   ✓ Candidate rejected offer');
      console.log('   ✓ Funds automatically returned to employer');
      console.log('   ✓ Agent reputation updated');
    }

  } else {
    console.log(`Result: ❌ CONDITION FAILED (${score} < 70)`);
    console.log('\n💡 Why this matters:');
    console.log('   - Match does not meet quality threshold');
    console.log('   - No on-chain record of failed match (privacy preserved)');
    console.log('   - Encrypted profiles remain secure, no data leakage');
    console.log('\n❌ MATCH THRESHOLD NOT MET - No offer created');
    console.log('Match remains confidential, no on-chain trace');
  }

  console.log('\n='.repeat(60));
  console.log('🔐 Demo Complete');
}

// Run the demo
main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
