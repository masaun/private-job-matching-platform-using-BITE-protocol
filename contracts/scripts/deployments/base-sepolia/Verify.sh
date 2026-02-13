#!/bin/bash

# Manual verification script for Base Sepolia contracts
# Usage: ./Verify.sh

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if BASESCAN_API_KEY is set
if [ -z "$BASESCAN_API_KEY" ]; then
  echo -e "${RED}Error: BASESCAN_API_KEY environment variable is not set${NC}"
  echo -e "${YELLOW}Please set it in your .env file or export it:${NC}"
  echo -e "export BASESCAN_API_KEY=your_api_key_here"
  exit 1
fi

# Read deployment file
DEPLOYMENT_FILE="latest.json"
if [ ! -f "$DEPLOYMENT_FILE" ]; then
  echo -e "${RED}Error: Deployment file not found at $DEPLOYMENT_FILE${NC}"
  echo -e "${YELLOW}Please deploy contracts first using Deploy.sh${NC}"
  exit 1
fi

echo -e "${GREEN}Reading deployment addresses from $DEPLOYMENT_FILE${NC}"

# Extract addresses from JSON (requires jq)
if ! command -v jq &> /dev/null; then
  echo -e "${YELLOW}Warning: jq not found. Please install jq or manually extract addresses${NC}"
  echo -e "Deployment file contents:"
  cat $DEPLOYMENT_FILE
  exit 1
fi

# Extract contract addresses
IDENTITY_REGISTRY=$(jq -r '.identityRegistry' $DEPLOYMENT_FILE)
REPUTATION_REGISTRY=$(jq -r '.reputationRegistry' $DEPLOYMENT_FILE)
VERIFICATION_REGISTRY=$(jq -r '.verificationRegistry' $DEPLOYMENT_FILE)
INTENT_VAULT=$(jq -r '.intentVault' $DEPLOYMENT_FILE)
MATCH_ESCROW=$(jq -r '.matchEscrow' $DEPLOYMENT_FILE)
OFFER_CONTRACT=$(jq -r '.offerContract' $DEPLOYMENT_FILE)
FACILITATOR_GATEWAY=$(jq -r '.facilitatorGateway' $DEPLOYMENT_FILE)

echo -e "${GREEN}Verifying contracts on BaseScan Sepolia...${NC}\n"

cd ../../..

# Verify ERC8004IdentityRegistry
echo -e "${YELLOW}[1/7] Verifying ERC8004IdentityRegistry at $IDENTITY_REGISTRY${NC}"
forge verify-contract \
  --chain-id 84532 \
  --verifier-url https://api-sepolia.basescan.org/api \
  --etherscan-api-key $BASESCAN_API_KEY \
  --watch \
  $IDENTITY_REGISTRY \
  src/erc-8004/ERC8004IdentityRegistry.sol:ERC8004IdentityRegistry

# Verify ERC8004ReputationRegistry
echo -e "${YELLOW}[2/7] Verifying ERC8004ReputationRegistry at $REPUTATION_REGISTRY${NC}"
forge verify-contract \
  --chain-id 84532 \
  --verifier-url https://api-sepolia.basescan.org/api \
  --etherscan-api-key $BASESCAN_API_KEY \
  --watch \
  $REPUTATION_REGISTRY \
  src/erc-8004/ERC8004ReputationRegistry.sol:ERC8004ReputationRegistry

# Verify ERC8004VerificationRegistry
echo -e "${YELLOW}[3/7] Verifying ERC8004VerificationRegistry at $VERIFICATION_REGISTRY${NC}"
forge verify-contract \
  --chain-id 84532 \
  --verifier-url https://api-sepolia.basescan.org/api \
  --etherscan-api-key $BASESCAN_API_KEY \
  --watch \
  $VERIFICATION_REGISTRY \
  src/erc-8004/ERC8004VerificationRegistry.sol:ERC8004VerificationRegistry

# Verify IntentVault
echo -e "${YELLOW}[4/7] Verifying IntentVault at $INTENT_VAULT${NC}"
forge verify-contract \
  --chain-id 84532 \
  --verifier-url https://api-sepolia.basescan.org/api \
  --etherscan-api-key $BASESCAN_API_KEY \
  --watch \
  $INTENT_VAULT \
  src/IntentVault.sol:IntentVault

# Verify MatchEscrow
echo -e "${YELLOW}[5/7] Verifying MatchEscrow at $MATCH_ESCROW${NC}"
forge verify-contract \
  --chain-id 84532 \
  --verifier-url https://api-sepolia.basescan.org/api \
  --etherscan-api-key $BASESCAN_API_KEY \
  --watch \
  $MATCH_ESCROW \
  src/MatchEscrow.sol:MatchEscrow

# Verify OfferContract
echo -e "${YELLOW}[6/7] Verifying OfferContract at $OFFER_CONTRACT${NC}"
forge verify-contract \
  --chain-id 84532 \
  --verifier-url https://api-sepolia.basescan.org/api \
  --etherscan-api-key $BASESCAN_API_KEY \
  --watch \
  $OFFER_CONTRACT \
  src/OfferContract.sol:OfferContract

# Verify FacilitatorGateway (with constructor args)
echo -e "${YELLOW}[7/7] Verifying FacilitatorGateway at $FACILITATOR_GATEWAY${NC}"
# Note: FacilitatorGateway has a constructor argument (reputationRegistry address)
CONSTRUCTOR_ARGS=$(cast abi-encode "constructor(address)" $REPUTATION_REGISTRY)
forge verify-contract \
  --chain-id 84532 \
  --verifier-url https://api-sepolia.basescan.org/api \
  --etherscan-api-key $BASESCAN_API_KEY \
  --constructor-args $CONSTRUCTOR_ARGS \
  --watch \
  $FACILITATOR_GATEWAY \
  src/x402/FacilitatorGateway.sol:FacilitatorGateway

echo -e "\n${GREEN}✓ Verification complete!${NC}"
echo -e "${GREEN}Check contract verification status at:${NC}"
echo -e "https://sepolia.basescan.org/address/$IDENTITY_REGISTRY"
echo -e "https://sepolia.basescan.org/address/$REPUTATION_REGISTRY"
echo -e "https://sepolia.basescan.org/address/$VERIFICATION_REGISTRY"
echo -e "https://sepolia.basescan.org/address/$INTENT_VAULT"
echo -e "https://sepolia.basescan.org/address/$MATCH_ESCROW"
echo -e "https://sepolia.basescan.org/address/$OFFER_CONTRACT"
echo -e "https://sepolia.basescan.org/address/$FACILITATOR_GATEWAY"
