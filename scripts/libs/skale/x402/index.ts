/**
 * x402 Integration for Payment-Enabled AI Agents
 * 
 * Uses @x402/core and @x402/evm packages for autonomous payments
 * Following SKALE documentation: https://docs.skale.space/get-started/agentic-builders/start-with-x402
 */

import { x402Client, x402HTTPClient } from '@x402/core/client';
import { ExactEvmScheme } from '@x402/evm';
import { privateKeyToAccount } from 'viem/accounts';
import type { Account } from 'viem';

export interface X402Config {
  privateKey: `0x${string}`;
  facilitatorUrl?: string;
  chainId?: number;
}

export interface PaymentRequirement {
  amount: string;
  token: string;
  recipient: string;
  chainId: number;
}

export interface MatchingServiceRequest {
  candidateIntentHash: string;
  employerIntentHash: string;
  agentId: string;
}

export interface MatchingServiceResponse {
  score: number;
  proof: string;
  matched: boolean;
  timestamp: number;
}

export class X402Service {
  private account: Account;
  private coreClient: x402Client;
  private httpClient: x402HTTPClient;
  private facilitatorUrl: string;
  private chainId: number;

  constructor(config: X402Config) {
    // Ensure private key has 0x prefix
    const formattedKey = config.privateKey.startsWith('0x') 
      ? config.privateKey 
      : `0x${config.privateKey}` as `0x${string}`;
    
    // Setup wallet from private key
    this.account = privateKeyToAccount(formattedKey);
    
    // Default to Kobaru facilitator on SKALE
    this.facilitatorUrl = config.facilitatorUrl || 'https://gateway.kobaru.io';
    this.chainId = config.chainId || 324705682; // SKALE Base Sepolia
    
    // Create x402 client with EVM payment scheme
    const evmScheme = new ExactEvmScheme(this.account);
    this.coreClient = new x402Client().register('eip155:*', evmScheme);
    this.httpClient = new x402HTTPClient(this.coreClient);
  }

  /**
   * Access a paywalled resource with automatic payment handling
   * Follows the x402 protocol: detect 402, create payment, retry with payment
   */
  async accessPaywalledResource<T = any>(url: string, options?: RequestInit): Promise<T> {
    try {
      const response = await fetch(url, options);

      // Check if payment is required (402 Payment Required)
      if (response.status === 402) {
        console.log(`💳 Payment required for ${url}`);
        
        // Get payment requirements from response
        const responseBody = await response.json();
        const paymentRequired = this.httpClient.getPaymentRequiredResponse(
          (name: string) => response.headers.get(name),
          responseBody
        );
        
        // Safely log payment details
        console.log(`   Payment details:`, JSON.stringify(paymentRequired, null, 2));
        
        // Create payment payload with signature
        const paymentPayload = await this.httpClient.createPaymentPayload(paymentRequired);
        const paymentHeaders = this.httpClient.encodePaymentSignatureHeader(paymentPayload);
        
        console.log(`✅ Payment created and signed`);
        
        // Retry request with payment headers
        const paidResponse = await fetch(url, {
          ...options,
          headers: { 
            ...(options?.headers || {}),
            ...paymentHeaders 
          }
        });
        
        if (!paidResponse.ok) {
          throw new Error(`Payment request failed: ${paidResponse.status}`);
        }
        
        console.log(`✅ Payment verified and resource accessed`);
        return await paidResponse.json();
      }
      
      if (!response.ok) {
        throw new Error(`Request failed: ${response.status} ${response.statusText}`);
      }
      
      // No payment required, return response
      return await response.json();
    } catch (error) {
      console.error('Error accessing paywalled resource:', error);
      throw error;
    }
  }

  /**
   * Pay for AI matching service
   * This is the main use case for the job matching platform
   */
  async payForMatchingService(
    serviceUrl: string,
    request: MatchingServiceRequest
  ): Promise<MatchingServiceResponse> {
    console.log(`\n💰 AI Agent Paying for Matching Service...`);
    console.log(`   Service: ${serviceUrl}`);
    console.log(`   Agent: ${request.agentId}`);
    
    try {
      // Access the paywalled matching service
      const result = await this.accessPaywalledResource<MatchingServiceResponse>(
        serviceUrl,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(request)
        }
      );
      
      return result;
    } catch (error: any) {
      console.error('Failed to access matching service:', error.message);
      throw error;
    }
  }

  /**
   * Pay for data access (e.g., market salary data, skills database)
   */
  async payForDataAccess(dataUrl: string): Promise<any> {
    console.log(`\n💰 Accessing paywalled data: ${dataUrl}`);
    return await this.accessPaywalledResource(dataUrl);
  }

  /**
   * Get account address
   */
  getAddress(): string {
    return this.account.address;
  }

  /**
   * Get facilitator URL
   */
  getFacilitatorUrl(): string {
    return this.facilitatorUrl;
  }
}

/**
 * Payment middleware for protecting endpoints with x402
 * This is used by service providers who want to require payment for their APIs
 */
export class X402PaymentMiddleware {
  private facilitatorUrl: string;
  private paymentRequirements: Map<string, PaymentRequirement>;

  constructor(facilitatorUrl: string) {
    this.facilitatorUrl = facilitatorUrl;
    this.paymentRequirements = new Map();
  }

  /**
   * Protect an endpoint with payment requirement
   */
  requirePayment(
    endpoint: string,
    requirement: PaymentRequirement
  ): void {
    this.paymentRequirements.set(endpoint, requirement);
  }

  /**
   * Check if request has valid payment and return 402 if not
   */
  async handleRequest(
    endpoint: string,
    paymentHeaders: Record<string, string>
  ): Promise<{ allowed: boolean; response?: any }> {
    const requirement = this.paymentRequirements.get(endpoint);
    
    // No payment required for this endpoint
    if (!requirement) {
      return { allowed: true };
    }

    // Check if payment headers are present
    if (!paymentHeaders['x-payment-authorization']) {
      return {
        allowed: false,
        response: {
          status: 402,
          body: {
            error: 'Payment Required',
            payment: requirement
          },
          headers: {
            'WWW-Authenticate': `x402 realm="${endpoint}"`,
            'X-Payment-Required': 'true'
          }
        }
      };
    }

    // Verify payment with facilitator
    try {
      const verifyResponse = await fetch(`${this.facilitatorUrl}/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...paymentHeaders
        },
        body: JSON.stringify({
          endpoint,
          requirement
        })
      });

      if (!verifyResponse.ok) {
        return {
          allowed: false,
          response: {
            status: 402,
            body: { error: 'Payment verification failed' }
          }
        };
      }

      // Settle payment
      await fetch(`${this.facilitatorUrl}/settle`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...paymentHeaders
        },
        body: JSON.stringify({
          endpoint,
          requirement
        })
      });

      return { allowed: true };
    } catch (error) {
      console.error('Payment verification failed:', error);
      return {
        allowed: false,
        response: {
          status: 500,
          body: { error: 'Payment verification error' }
        }
      };
    }
  }
}

/**
 * Create x402 service instance for AI agent payments
 */
export function createX402Service(
  privateKey: `0x${string}`, 
  facilitatorUrl?: string,
  chainId?: number
): X402Service {
  return new X402Service({ privateKey, facilitatorUrl, chainId });
}

/**
 * Create x402 payment middleware for service providers
 */
export function createX402Middleware(facilitatorUrl: string): X402PaymentMiddleware {
  return new X402PaymentMiddleware(facilitatorUrl);
}
