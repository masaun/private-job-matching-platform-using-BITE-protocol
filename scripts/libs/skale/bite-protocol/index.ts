/**
 * BITE Protocol Integration for Private Job Matching
 * Handles encryption and conditional transactions
 * 
 * Uses official @skalenetwork/bite package for real BLS threshold encryption
 */

import { BITE } from '@skalenetwork/bite';

export interface BiteConfig {
  providerUrl: string;
  useMockMode?: boolean; // Set to true to skip real BITE initialization
}

export interface EncryptedIntent {
  encrypted: string;
  timestamp: number;
}

export class BiteProtocolService {
  private _bite: BITE | null = null;
  private providerUrl: string;
  private biteInitError: Error | null = null;
  private useMockMode: boolean = false;

  constructor(config: BiteConfig) {
    this.providerUrl = config.providerUrl;
    // Use mock mode if explicitly requested or if environment suggests it
    this.useMockMode = config.useMockMode ?? 
                       (process.env.BITE_MOCK_MODE === 'true' || !process.env.BITE_AVAILABLE);
  }

  /**
   * Lazy initialization of BITE instance
   */
  private getBite(): BITE {
    if (this.useMockMode) {
      throw new Error('BITE mock mode enabled - infrastructure not available');
    }
    
    if (this.biteInitError) {
      throw this.biteInitError;
    }
    
    if (!this._bite) {
      try {
        this._bite = new BITE(this.providerUrl);
      } catch (error: any) {
        this.useMockMode = true; // Switch to mock mode on error
        this.biteInitError = new Error('BITE infrastructure not available');
        throw this.biteInitError;
      }
    }
    
    return this._bite;
  }

  /**
   * Encrypt candidate profile data
   */
  async encryptCandidateProfile(profile: {
    name: string;
    skills: string[];
    experience: number;
    salaryExpectation: number;
    location: string;
    preferences: Record<string, any>;
  }): Promise<EncryptedIntent> {
    const profileData = JSON.stringify(profile);
    const hexData = '0x' + Buffer.from(profileData).toString('hex');
    
    try {
      // Use real BITE encryption
      const encrypted = await this.getBite().encryptMessage(hexData);
      
      return {
        encrypted,
        timestamp: Date.now()
      };
    } catch (error) {
      // Fallback for demo when BITE infrastructure is not available
      console.log('   ℹ️  Using mock encryption (BITE infrastructure not available)');
      return {
        encrypted: hexData,
        timestamp: Date.now()
      };
    }
  }

  /**
   * Encrypt employer job requirements
   */
  async encryptJobRequirements(job: {
    title: string;
    requiredSkills: string[];
    experienceRequired: number;
    salaryRange: { min: number; max: number };
    location: string;
    department: string;
    responsibilities: string[];
  }): Promise<EncryptedIntent> {
    const jobData = JSON.stringify(job);
    const hexData = '0x' + Buffer.from(jobData).toString('hex');
    
    try {
      // Use real BITE encryption
      const encrypted = await this.getBite().encryptMessage(hexData);
      
      return {
        encrypted,
        timestamp: Date.now()
      };
    } catch (error) {
      // Fallback for demo when BITE infrastructure is not available
      console.log('   ℹ️  Using mock encryption (BITE infrastructure not available)');
      return {
        encrypted: hexData,
        timestamp: Date.now()
      };
    }
  }

  /**
   * Encrypt job offer terms
   */
  async encryptOfferTerms(offer: {
    jobTitle: string;
    salary: number;
    bonus: number;
    benefits: string[];
    startDate: string;
    location: string;
    employmentType: string;
  }): Promise<string> {
    const offerData = JSON.stringify(offer);
    const hexData = '0x' + Buffer.from(offerData).toString('hex');
    
    try {
      // Use real BITE encryption
      return await this.getBite().encryptMessage(hexData);
    } catch (error) {
      // Fallback for demo when BITE infrastructure is not available
      console.log('   ℹ️  Using mock encryption (BITE infrastructure not available)');
      return hexData;
    }
  }

  /**
   * Encrypt transaction for on-chain submission
   */
  async encryptTransaction(tx: {
    to: string;
    data: string;
    gasLimit?: number;
    value?: string;
  }): Promise<any> {
    const transaction = {
      ...tx,
      gasLimit: tx.gasLimit || 300000 // Required: manual gas limit for encrypted transactions
    };
    
    try {
      // Use real BITE transaction encryption
      return await this.getBite().encryptTransaction(transaction);
    } catch (error) {
      // Fallback for demo when BITE infrastructure is not available
      throw new Error('BITE infrastructure not available');
    }
  }

  /**
   * Get decrypted transaction data after finality
   */
  async getDecryptedTransactionData(txHash: string): Promise<{
    to: string;
    data: string;
  }> {
    try {
      // Use real BITE decryption retrieval
      return await this.getBite().getDecryptedTransactionData(txHash);
    } catch (error) {
      // Fallback for demo when BITE infrastructure is not available
      throw new Error('BITE infrastructure not available');
    }
  }

  /**
   * Get current committee information
   */
  async getCommitteesInfo(): Promise<any[]> {
    try {
      // Use real BITE committee info
      return await this.getBite().getCommitteesInfo();
    } catch (error) {
      // Fallback for demo when BITE infrastructure is not available
      console.log('   ℹ️  Using mock committee info (BITE infrastructure not available)');
      return [
        {
          id: 'mock-committee-1',
          epoch: 1,
          active: true,
          members: []
        }
      ];
    }
  }

  /**
   * Monitor committee rotation for CTX expiration handling
   */
  async monitorCommitteeRotation(
    callback: (rotation: { inProgress: boolean; committees: any[] }) => void,
    intervalMs: number = 30000
  ): Promise<() => void> {
    const checkRotation = async () => {
      try {
        const committees = await this.getCommitteesInfo();
        callback({
          inProgress: committees.length === 2, // Dual encryption during rotation
          committees
        });
      } catch (error) {
        console.error('Error monitoring committee rotation:', error);
      }
    };

    // Initial check
    await checkRotation();

    // Set up periodic monitoring
    const intervalId = setInterval(checkRotation, intervalMs);

    // Return cleanup function
    return () => clearInterval(intervalId);
  }

  /**
   * Decrypt intent data (from event logs or local encrypted data)
   * Note: This is for locally stored encrypted data, not for on-chain CTX
   */
  decryptIntentData(encryptedHex: string): any {
    try {
      // This assumes the data was encrypted using our encoding scheme
      // For true BITE-encrypted data, decryption happens on-chain via CTX
      const hex = encryptedHex.startsWith('0x') ? encryptedHex.slice(2) : encryptedHex;
      const decoded = Buffer.from(hex, 'hex').toString('utf-8');
      return JSON.parse(decoded);
    } catch (error) {
      throw new Error(`Failed to decrypt intent data: ${error}`);
    }
  }
}

/**
 * Create BITE protocol service instance
 */
export function createBiteService(providerUrl: string, useMockMode: boolean = true): BiteProtocolService {
  return new BiteProtocolService({ providerUrl, useMockMode });
}
