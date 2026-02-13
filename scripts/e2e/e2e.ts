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

import { ethers } from 'ethers';
import { createBiteService } from '../libs/skale/bite-protocol';
import { createERC8004Service } from '../libs/skale/erc-8004';
import { createX402Service } from '../libs/skale/x402';

// Contract ABIs (simplified for demo)
import IntentVaultArtifact from '../../out/IntentVault.sol/IntentVault.json';
import MatchEscrowArtifact from '../../out/MatchEscrow.sol/MatchEscrow.json';
import OfferContractArtifact from '../../out/OfferContract.sol/OfferContract.json';
import FacilitatorGatewayArtifact from '../../out/FacilitatorGateway.sol/FacilitatorGateway.json';
import ERC8004IdentityRegistryArtifact from '../../out/ERC8004IdentityRegistry.sol/ERC8004IdentityRegistry.json';
import ERC8004ReputationRegistryArtifact from '../../out/ERC8004ReputationRegistry.sol/ERC8004ReputationRegistry.json';
import ERC8004VerificationRegistryArtifact from '../../out/ERC8004VerificationRegistry.sol/ERC8004VerificationRegistry.json';

// Configuration
const SKALE_RPC_URL = process.env.SKALE_RPC_URL || 'https://base-sepolia-testnet.skalenodes.com/v1/bite-v2-sandbox-2';
const PRIVATE_KEY = process.env.PRIVATE_KEY || '0x0000000000000000000000000000000000000000000000000000000000000001';
const CANDIDATE_PRIVATE_KEY = process.env.CANDIDATE_PRIVATE_KEY || '0x0000000000000000000000000000000000000000000000000000000000000002';
const EMPLOYER_PRIVATE_KEY = process.env.EMPLOYER_PRIVATE_KEY || '0x0000000000000000000000000000000000000000000000000000000000000003';

// Mock ERC20 token address (use actual Axios USD or Bridged USDC on mainnet)
const PAYMENT_TOKEN_ADDRESS = '0x61a26022927096f444994dA1e53F0FD9487EAfcf'; // Axios USD on SKALE Base Sepolia

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
 * Deploy all smart contracts
 */
async function deployContracts(deployer: ethers.Signer): Promise<DeployedContracts> {
  console.log('\n📦 Deploying Smart Contracts...\n');

  // Deploy ERC-8004 Registries
  console.log('Deploying ERC-8004 Identity Registry...');
  const IdentityRegistryFactory = new ethers.ContractFactory(
    ERC8004IdentityRegistryArtifact.abi,
    ERC8004IdentityRegistryArtifact.bytecode,
    deployer
  );
  const identityRegistry = await IdentityRegistryFactory.deploy();
  await identityRegistry.waitForDeployment();
  console.log(`✅ Identity Registry: ${await identityRegistry.getAddress()}`);

  console.log('Deploying ERC-8004 Reputation Registry...');
  const ReputationRegistryFactory = new ethers.ContractFactory(
    ERC8004ReputationRegistryArtifact.abi,
    ERC8004ReputationRegistryArtifact.bytecode,
    deployer
  );
  const reputationRegistry = await ReputationRegistryFactory.deploy();
  await reputationRegistry.waitForDeployment();
  console.log(`✅ Reputation Registry: ${await reputationRegistry.getAddress()}`);

  console.log('Deploying ERC-8004 Verification Registry...');
  const VerificationRegistryFactory = new ethers.ContractFactory(
    ERC8004VerificationRegistryArtifact.abi,
    ERC8004VerificationRegistryArtifact.bytecode,
    deployer
  );
  const verificationRegistry = await VerificationRegistryFactory.deploy();
  await verificationRegistry.waitForDeployment();
  console.log(`✅ Verification Registry: ${await verificationRegistry.getAddress()}`);

  // Deploy IntentVault
  console.log('Deploying IntentVault...');
  const IntentVaultFactory = new ethers.ContractFactory(
    IntentVaultArtifact.abi,
    IntentVaultArtifact.bytecode,
    deployer
  );
  const intentVault = await IntentVaultFactory.deploy();
  await intentVault.waitForDeployment();
  console.log(`✅ IntentVault: ${await intentVault.getAddress()}`);

  // Deploy MatchEscrow
  console.log('Deploying MatchEscrow...');
  const MatchEscrowFactory = new ethers.ContractFactory(
    MatchEscrowArtifact.abi,
    MatchEscrowArtifact.bytecode,
    deployer
  );
  const matchEscrow = await MatchEscrowFactory.deploy();
  await matchEscrow.waitForDeployment();
  console.log(`✅ MatchEscrow: ${await matchEscrow.getAddress()}`);

  // Deploy OfferContract
  console.log('Deploying OfferContract...');
  const OfferContractFactory = new ethers.ContractFactory(
    OfferContractArtifact.abi,
    OfferContractArtifact.bytecode,
    deployer
  );
  const offerContract = await OfferContractFactory.deploy();
  await offerContract.waitForDeployment();
  console.log(`✅ OfferContract: ${await offerContract.getAddress()}`);

  // Deploy FacilitatorGateway
  console.log('Deploying FacilitatorGateway...');
  const FacilitatorGatewayFactory = new ethers.ContractFactory(
    FacilitatorGatewayArtifact.abi,
    FacilitatorGatewayArtifact.bytecode,
    deployer
  );
  const facilitatorGateway = await FacilitatorGatewayFactory.deploy(
    await reputationRegistry.getAddress()
  );
  await facilitatorGateway.waitForDeployment();
  console.log(`✅ FacilitatorGateway: ${await facilitatorGateway.getAddress()}`);

  // Authorize FacilitatorGateway to record reputation
  console.log('\nAuthorizing FacilitatorGateway...');
  const authTx = await reputationRegistry.authorizeRecorder(await facilitatorGateway.getAddress());
  await authTx.wait();
  console.log('✅ FacilitatorGateway authorized');

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

  await erc8004Service.registerAgent(agentSigner, agentId, metadata);
  console.log(`✅ Agent registered: ${agentId}`);

  // Verify agent capabilities
  await erc8004Service.verifyCapability(agentSigner, agentId, 'skill-matching', 365);
  console.log('✅ Capability verified: skill-matching');

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

  console.log(`✅ Intent stored: ${intentHash}`);

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

  console.log(`✅ Intent stored: ${intentHash}`);

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

  console.log(`✅ Proof verified: ${proofId}`);

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

  await tx.wait();

  console.log('✅ Escrow created');
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

  await tx.wait();

  console.log(`✅ Offer created: ${offerIdBytes}`);

  return offerIdBytes;
}

/**
 * Main execution flow
 */
async function main() {
  console.log('🔐 Private Job Matching Platform - E2E Demo');
  console.log('='.repeat(60));

  // Setup providers and signers
  const provider = new ethers.JsonRpcProvider(SKALE_RPC_URL);
  const agentSigner = new ethers.Wallet(PRIVATE_KEY, provider);
  const candidateSigner = new ethers.Wallet(CANDIDATE_PRIVATE_KEY, provider);
  const employerSigner = new ethers.Wallet(EMPLOYER_PRIVATE_KEY, provider);

  console.log('\n👥 Actors:');
  console.log(`Agent:     ${await agentSigner.getAddress()}`);
  console.log(`Candidate: ${await candidateSigner.getAddress()}`);
  console.log(`Employer:  ${await employerSigner.getAddress()}`);

  // Initialize services
  const biteService = createBiteService(SKALE_RPC_URL);
  
  // Deploy contracts
  const contracts = await deployContracts(agentSigner);

  // Initialize ERC-8004 service
  const erc8004Service = createERC8004Service(
    provider,
    await contracts.identityRegistry.getAddress(),
    await contracts.reputationRegistry.getAddress(),
    await contracts.verificationRegistry.getAddress()
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
