import { ethers } from 'ethers';

/**
 * ERC-8004 Integration for Agent Registry, Reputation, and Verification
 */

export interface ERC8004Config {
  provider: ethers.Provider;
  identityRegistryAddress: string;
  reputationRegistryAddress: string;
  verificationRegistryAddress: string;
}

export interface AgentIdentity {
  id: string;
  owner: string;
  metadata: string;
  registeredAt: bigint;
  active: boolean;
}

export interface AgentReputation {
  agentId: string;
  score: bigint;
  totalInteractions: bigint;
  successfulInteractions: bigint;
  lastUpdated: bigint;
}

export interface AgentMetadata {
  name: string;
  description: string;
  capabilities: string[];
  version: string;
  owner: string;
}

export class ERC8004Service {
  private provider: ethers.Provider;
  private identityRegistry: ethers.Contract;
  private reputationRegistry: ethers.Contract;
  private verificationRegistry: ethers.Contract;

  constructor(config: ERC8004Config) {
    this.provider = config.provider;

    // Identity Registry ABI
    const identityAbi = [
      'function registerAgent(bytes32 agentId, string metadataUri)',
      'function updateMetadata(bytes32 agentId, string newUri)',
      'function deactivateAgent(bytes32 agentId)',
      'function getAgentMetadata(bytes32 agentId) view returns (tuple(bytes32 id, address owner, string metadata, uint256 registeredAt, bool active))',
      'function getAgentsByOwner(address owner) view returns (bytes32[])',
      'function isActiveAgent(bytes32 agentId) view returns (bool)',
      'event AgentRegistered(bytes32 indexed agentId, address indexed owner, string metadata)'
    ];

    // Reputation Registry ABI
    const reputationAbi = [
      'function recordInteraction(bytes32 agentId, bool success, uint256 weight)',
      'function getReputation(bytes32 agentId) view returns (tuple(bytes32 agentId, uint256 score, uint256 totalInteractions, uint256 successfulInteractions, uint256 lastUpdated))',
      'function getSuccessRate(bytes32 agentId) view returns (uint256)',
      'event InteractionRecorded(bytes32 indexed agentId, bool success, uint256 weight)'
    ];

    // Verification Registry ABI
    const verificationAbi = [
      'function verifyCapability(bytes32 agentId, string claim, uint256 validUntil)',
      'function revokeVerification(bytes32 agentId, string claim)',
      'function isVerified(bytes32 agentId, string claim) view returns (bool)',
      'function getVerifications(bytes32 agentId) view returns (tuple(bytes32 agentId, address verifier, string claim, uint256 validUntil, bool active)[])',
      'event CapabilityVerified(bytes32 indexed agentId, address indexed verifier, string claim, uint256 validUntil)'
    ];

    this.identityRegistry = new ethers.Contract(
      config.identityRegistryAddress,
      identityAbi,
      this.provider
    );

    this.reputationRegistry = new ethers.Contract(
      config.reputationRegistryAddress,
      reputationAbi,
      this.provider
    );

    this.verificationRegistry = new ethers.Contract(
      config.verificationRegistryAddress,
      verificationAbi,
      this.provider
    );
  }

  /**
   * Register a new AI agent
   */
  async registerAgent(
    signer: ethers.Signer,
    agentId: string,
    metadata: AgentMetadata
  ): Promise<ethers.ContractTransactionReceipt> {
    const metadataJson = JSON.stringify(metadata);
    const metadataUri = `data:application/json;base64,${Buffer.from(metadataJson).toString('base64')}`;

    const agentIdBytes = ethers.id(agentId);
    const contract = this.identityRegistry.connect(signer);
    
    const tx = await contract.registerAgent(agentIdBytes, metadataUri);
    return await tx.wait();
  }

  /**
   * Get agent identity
   */
  async getAgentIdentity(agentId: string): Promise<AgentIdentity | null> {
    const agentIdBytes = ethers.id(agentId);
    
    try {
      const result = await this.identityRegistry.getAgentMetadata(agentIdBytes);
      
      return {
        id: result.id,
        owner: result.owner,
        metadata: result.metadata,
        registeredAt: result.registeredAt,
        active: result.active
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Get agent metadata (parse from URI)
   */
  async getAgentMetadata(agentId: string): Promise<AgentMetadata | null> {
    const identity = await this.getAgentIdentity(agentId);
    if (!identity) return null;

    try {
      if (identity.metadata.startsWith('data:application/json;base64,')) {
        const base64Data = identity.metadata.replace('data:application/json;base64,', '');
        const jsonData = Buffer.from(base64Data, 'base64').toString('utf-8');
        return JSON.parse(jsonData);
      }
      return null;
    } catch (error) {
      console.error('Failed to parse metadata:', error);
      return null;
    }
  }

  /**
   * Get agents by owner
   */
  async getAgentsByOwner(owner: string): Promise<string[]> {
    const agentIds = await this.identityRegistry.getAgentsByOwner(owner);
    return agentIds.map((id: string) => id);
  }

  /**
   * Check if agent is active
   */
  async isActiveAgent(agentId: string): Promise<boolean> {
    const agentIdBytes = ethers.id(agentId);
    return await this.identityRegistry.isActiveAgent(agentIdBytes);
  }

  /**
   * Get agent reputation
   */
  async getAgentReputation(agentId: string): Promise<AgentReputation | null> {
    const agentIdBytes = ethers.id(agentId);
    
    try {
      const result = await this.reputationRegistry.getReputation(agentIdBytes);
      
      return {
        agentId: result.agentId,
        score: result.score,
        totalInteractions: result.totalInteractions,
        successfulInteractions: result.successfulInteractions,
        lastUpdated: result.lastUpdated
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Get agent success rate
   */
  async getSuccessRate(agentId: string): Promise<number> {
    const agentIdBytes = ethers.id(agentId);
    const rate = await this.reputationRegistry.getSuccessRate(agentIdBytes);
    return Number(rate) / 100; // Convert from basis points to percentage
  }

  /**
   * Record agent interaction
   */
  async recordInteraction(
    signer: ethers.Signer,
    agentId: string,
    success: boolean,
    weight: number
  ): Promise<ethers.ContractTransactionReceipt> {
    const agentIdBytes = ethers.id(agentId);
    const contract = this.reputationRegistry.connect(signer);
    
    const tx = await contract.recordInteraction(agentIdBytes, success, weight);
    return await tx.wait();
  }

  /**
   * Verify agent capability
   */
  async verifyCapability(
    signer: ethers.Signer,
    agentId: string,
    claim: string,
    validityDays: number
  ): Promise<ethers.ContractTransactionReceipt> {
    const agentIdBytes = ethers.id(agentId);
    const validUntil = Math.floor(Date.now() / 1000) + (validityDays * 24 * 60 * 60);
    
    const contract = this.verificationRegistry.connect(signer);
    const tx = await contract.verifyCapability(agentIdBytes, claim, validUntil);
    return await tx.wait();
  }

  /**
   * Check if agent has verified capability
   */
  async isVerified(agentId: string, claim: string): Promise<boolean> {
    const agentIdBytes = ethers.id(agentId);
    return await this.verificationRegistry.isVerified(agentIdBytes, claim);
  }

  /**
   * Get all agent verifications
   */
  async getVerifications(agentId: string): Promise<any[]> {
    const agentIdBytes = ethers.id(agentId);
    const verifications = await this.verificationRegistry.getVerifications(agentIdBytes);
    return verifications;
  }

  /**
   * Discover agents by capability
   */
  async discoverAgentsByCapability(capability: string): Promise<{
    agentId: string;
    metadata: AgentMetadata | null;
    reputation: AgentReputation | null;
  }[]> {
    // This is a simplified implementation
    // In production, you'd want to index events or use a subgraph
    const events = await this.verificationRegistry.queryFilter(
      this.verificationRegistry.filters.CapabilityVerified()
    );

    const agents = new Set<string>();
    for (const event of events) {
      const args = event.args as any;
      if (args.claim === capability) {
        agents.add(args.agentId);
      }
    }

    const results = [];
    for (const agentIdBytes of agents) {
      const agentId = agentIdBytes;
      const metadata = await this.getAgentMetadata(agentId);
      const reputation = await this.getAgentReputation(agentId);
      results.push({ agentId, metadata, reputation });
    }

    return results;
  }
}

/**
 * Create ERC-8004 service instance
 */
export function createERC8004Service(
  provider: ethers.Provider,
  identityRegistryAddress: string,
  reputationRegistryAddress: string,
  verificationRegistryAddress: string
): ERC8004Service {
  return new ERC8004Service({
    provider,
    identityRegistryAddress,
    reputationRegistryAddress,
    verificationRegistryAddress
  });
}
