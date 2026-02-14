/**
 * Mock Paywalled AI Matching Service
 * 
 * Simulates a paywalled API endpoint that requires x402 payment
 * In production, this would be a separate microservice/API
 */

import { X402PaymentMiddleware } from './index';

export interface MatchingRequest {
  candidateIntentHash: string;
  employerIntentHash: string;
  agentId: string;
}

export interface MatchingResponse {
  score: number;
  proof: string;
  matched: boolean;
  timestamp: number;
}

/**
 * Mock AI Matching Service that requires payment
 * In production, this would be deployed as a separate API service
 */
export class PaywalledMatchingService {
  private middleware: X402PaymentMiddleware;
  private serviceUrl: string;
  private paymentToken: string;
  private pricePerMatch: string;
  private recipientAddress: string;

  constructor(config: {
    facilitatorUrl: string;
    serviceUrl: string;
    paymentToken: string;
    pricePerMatch: string;
    recipientAddress: string;
  }) {
    this.serviceUrl = config.serviceUrl;
    this.paymentToken = config.paymentToken;
    this.pricePerMatch = config.pricePerMatch;
    this.recipientAddress = config.recipientAddress;
    
    // Setup payment middleware
    this.middleware = new X402PaymentMiddleware(config.facilitatorUrl);
    
    // Require payment for the matching endpoint
    this.middleware.requirePayment('/match', {
      amount: this.pricePerMatch,
      token: this.paymentToken,
      recipient: this.recipientAddress,
      chainId: 324705682 // SKALE Base Sepolia
    });
  }

  /**
   * Simulate handling an HTTP POST request to /match
   * In production, this would be in your API server (Express, Hono, etc.)
   */
  async handleMatchRequest(
    request: MatchingRequest,
    headers: Record<string, string>
  ): Promise<{ status: number; body: any; headers?: Record<string, string> }> {
    // Check payment
    const paymentCheck = await this.middleware.handleRequest('/match', headers);
    
    if (!paymentCheck.allowed) {
      return paymentCheck.response!;
    }

    // Payment verified, perform matching
    const result = await this.performMatching(request);
    
    return {
      status: 200,
      body: result
    };
  }

  /**
   * Demo mode: Simulate the complete flow without real facilitator calls
   * Used for demonstration when facilitator infrastructure is unavailable
   */
  async handleMatchRequestDemo(
    request: MatchingRequest,
    hasPayment: boolean = true
  ): Promise<{ status: number; body: any; headers?: Record<string, string> }> {
    // Simulate payment check
    if (!hasPayment) {
      return {
        status: 402,
        body: {
          error: 'Payment Required',
          payment: {
            amount: this.pricePerMatch,
            token: this.paymentToken,
            recipient: this.recipientAddress,
            chainId: 324705682
          }
        },
        headers: {
          'WWW-Authenticate': `x402 realm="/match"`,
          'X-Payment-Required': 'true'
        }
      };
    }

    // Payment verified, perform matching
    const result = await this.performMatching(request);
    
    return {
      status: 200,
      body: result
    };
  }

  /**
   * Mock AI matching algorithm
   * In production, this would call actual AI models
   */
  private async performMatching(request: MatchingRequest): Promise<MatchingResponse> {
    console.log(`\n🧠 Paywalled AI Service Processing Match...`);
    console.log(`   Candidate Intent: ${request.candidateIntentHash.slice(0, 10)}...`);
    console.log(`   Employer Intent: ${request.employerIntentHash.slice(0, 10)}...`);
    console.log(`   Agent ID: ${request.agentId}`);
    
    // Simulate AI processing time
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Mock sophisticated AI matching (in reality, would analyze encrypted intents)
    const score = Math.floor(Math.random() * 30) + 70; // 70-100 range
    const matched = score >= 70;
    
    // Generate mock zero-knowledge proof
    const proof = `0x${Buffer.from(
      `proof-${request.candidateIntentHash}-${request.employerIntentHash}-${score}`
    ).toString('hex')}`;
    
    console.log(`✅ AI Matching Complete (Score: ${score}/100)`);
    
    return {
      score,
      proof,
      matched,
      timestamp: Date.now()
    };
  }

  getServiceUrl(): string {
    return `${this.serviceUrl}/match`;
  }

  getPaymentRequirement() {
    return {
      amount: this.pricePerMatch,
      token: this.paymentToken,
      recipient: this.recipientAddress,
      chainId: 324705682
    };
  }
}

/**
 * Create a mock paywalled matching service
 * In production, this would be deployed separately as an API service
 */
export function createPaywalledMatchingService(config: {
  facilitatorUrl: string;
  serviceUrl: string;
  paymentToken: string;
  pricePerMatch: string;
  recipientAddress: string;
}): PaywalledMatchingService {
  return new PaywalledMatchingService(config);
}
