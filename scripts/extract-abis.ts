#!/usr/bin/env tsx
/**
 * Extract ABIs from Foundry build output and generate TypeScript exports
 */
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const CONTRACTS_OUT_DIR = '../contracts/out';
const ABI_OUTPUT_FILE = './contracts/abis/abi.ts';

const contracts = [
  'ERC8004IdentityRegistry',
  'ERC8004ReputationRegistry', 
  'ERC8004VerificationRegistry',
  'IntentVault',
  'MatchEscrow',
  'OfferContract',
  'FacilitatorGateway'
];

interface ContractArtifact {
  abi: any[];
  bytecode: {
    object: string;
  };
}

async function extractABIs() {
  const abis: Record<string, any> = {};
  
  for (const contractName of contracts) {
    const artifactPath = join(
      __dirname,
      CONTRACTS_OUT_DIR,
      `${contractName}.sol`,
      `${contractName}.json`
    );
    
    try {
      const artifact: ContractArtifact = JSON.parse(readFileSync(artifactPath, 'utf-8'));
      abis[contractName] = artifact.abi;
      console.log(`✓ Extracted ABI for ${contractName}`);
    } catch (error) {
      console.error(`✗ Failed to extract ABI for ${contractName}:`, error);
      process.exit(1);
    }
  }
  
  // Generate TypeScript file
  const tsContent = `/**
 * Contract ABIs
 * Auto-generated from Foundry build output
 * Generated at: ${new Date().toISOString()}
 */

export const ERC8004IdentityRegistryABI = ${JSON.stringify(abis.ERC8004IdentityRegistry, null, 2)} as const;

export const ERC8004ReputationRegistryABI = ${JSON.stringify(abis.ERC8004ReputationRegistry, null, 2)} as const;

export const ERC8004VerificationRegistryABI = ${JSON.stringify(abis.ERC8004VerificationRegistry, null, 2)} as const;

export const IntentVaultABI = ${JSON.stringify(abis.IntentVault, null, 2)} as const;

export const MatchEscrowABI = ${JSON.stringify(abis.MatchEscrow, null, 2)} as const;

export const OfferContractABI = ${JSON.stringify(abis.OfferContract, null, 2)} as const;

export const FacilitatorGatewayABI = ${JSON.stringify(abis.FacilitatorGateway, null, 2)} as const;

// Export all ABIs as a collection
export const ABIS = {
  ERC8004IdentityRegistry: ERC8004IdentityRegistryABI,
  ERC8004ReputationRegistry: ERC8004ReputationRegistryABI,
  ERC8004VerificationRegistry: ERC8004VerificationRegistryABI,
  IntentVault: IntentVaultABI,
  MatchEscrow: MatchEscrowABI,
  OfferContract: OfferContractABI,
  FacilitatorGateway: FacilitatorGatewayABI,
} as const;
`;
  
  const outputPath = join(__dirname, ABI_OUTPUT_FILE);
  writeFileSync(outputPath, tsContent, 'utf-8');
  
  console.log(`\n✓ Generated ${outputPath}`);
  console.log(`✓ Exported ${contracts.length} contract ABIs`);
}

extractABIs().catch(console.error);
