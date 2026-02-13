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
  console.log('\n📡 Connecting to Deployed Contracts on SKALE Base Testnet...\n');
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
  deployerSigner: ethers.Signer,
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
  
  // Mint tokens to employer (150,000 USDC for safety)
  const employerAddress = await employerSigner.getAddress();
  const mintAmount = BigInt(150000) * BigInt(10 ** Number(decimals));
  
  console.log(`Minting ${ethers.formatUnits(mintAmount, decimals)} USDC to Employer...`);
  const mintTx = await mockUSDC.connect(deployerSigner).mint(employerAddress, mintAmount);
  await mintTx.wait();
  
  const balance = await mockUSDC.balanceOf(employerAddress);
  console.log(`✅ Employer balance: ${ethers.formatUnits(balance, decimals)} USDC`);

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
  agentSigner: ethers.Signer
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
  } catch (error: any) {
    // Check various places where the error message might be
    const errorStr = JSON.stringify(error);
    const errorMsg = error.message || error.info?.error?.message || error.reason || '';
    
    if (errorMsg.includes('already registered') || 
        errorMsg.includes('Agent already registered') ||
        errorStr.includes('already registered') ||
        errorStr.includes('Agent already registered')) {
      console.log(`ℹ️  Agent already registered: ${agentId}`);
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

  // Encrypt profile
  const encrypted = await biteService.encryptCandidateProfile(profile);
  console.log('✅ Profile encrypted');

  // Store in IntentVault
  const tx = await intentVault.connect(candidateSigner).storeIntent(encrypted.encrypted, 0); // 0 = CANDIDATE
  const receipt = await tx.wait();

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

  // Encrypt job requirements
  const encrypted = await biteService.encryptJobRequirements(job);
  console.log('✅ Job requirements encrypted');

  // Store in IntentVault
  const tx = await intentVault.connect(employerSigner).storeIntent(encrypted.encrypted, 1); // 1 = EMPLOYER
  const receipt = await tx.wait();

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
  console.log('\n📝 Submitting Match Proof to Facilitator...\n');

  const agentIdBytes = ethers.id(agentId);

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

  console.log(`✅ Proof verified (TX: ${receipt.hash})`);
  console.log(`   Proof ID: ${proofId}`);

  return proofId;
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
  console.log('\n💰 Employer Creating Escrow...\n');

  console.log(`Salary: ${ethers.formatUnits(salaryAmount, 6)} USDC`);
  console.log(`Agent Fee (5%): ${ethers.formatUnits(salaryAmount * BigInt(5) / BigInt(100), 6)} USDC`);

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

  console.log(`✅ Escrow created (TX: ${receipt.hash})`);
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
 * Main execution flow
 */
async function main() {
  console.log('🔐 Private Job Matching Platform - E2E Demo');
  console.log('='.repeat(60));

  // Setup providers and signers
  const provider = new ethers.JsonRpcProvider(SKALE_ON_BASE_SEPOLIA_RPC_URL);
  const agentSigner = new ethers.Wallet(DEPLOYER_PRIVATE_KEY, provider);
  const candidateSigner = new ethers.Wallet(CANDIDATE_PRIVATE_KEY, provider);
  const employerSigner = new ethers.Wallet(EMPLOYER_PRIVATE_KEY, provider);

  console.log('\n👥 Actors:');
  console.log(`Agent:     ${await agentSigner.getAddress()}`);
  console.log(`Candidate: ${await candidateSigner.getAddress()}`);
  console.log(`Employer:  ${await employerSigner.getAddress()}`);

  // Initialize services
  const biteService = createBiteService(SKALE_ON_BASE_SEPOLIA_RPC_URL);
  
  // Connect to deployed contracts
  const contracts = await connectToContracts(provider);

  // Setup MockUSDC tokens for testing
  await setupMockUSDC(provider, agentSigner, employerSigner, CONTRACT_ADDRESSES.matchEscrow);

  // Initialize ERC-8004 service
  const erc8004Service = createERC8004Service(
    provider,
    CONTRACT_ADDRESSES.identityRegistry,
    CONTRACT_ADDRESSES.reputationRegistry,
    CONTRACT_ADDRESSES.verificationRegistry
  );

  // Register AI agent
  const agentId = await registerMatchingAgent(erc8004Service, agentSigner);

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

  // Check if match passes threshold
  if (score >= 70) {
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

    console.log('\n🎉 SUCCESS - Job matching complete!');
    console.log('\nNext steps:');
    console.log('1. Candidate reveals and reviews offer using BITE CTX');
    console.log('2. Candidate accepts/rejects offer');
    console.log('3. Escrow settles payment to candidate and fee to agent');
    console.log('4. Agent reputation updated based on outcome');

    // Check agent reputation
    const reputation = await erc8004Service.getAgentReputation(agentId);
    console.log('\n📊 Agent Reputation:');
    console.log(`Score: ${reputation?.score}`);
    console.log(`Success Rate: ${await erc8004Service.getSuccessRate(agentId)}%`);

  } else {
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
