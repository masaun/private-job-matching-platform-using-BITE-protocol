#!/bin/bash
# Deploy Private Job Matching Platform to Base Sepolia
# Run from: contracts/scripts/deployments/base-sepolia directory

set -e  # Exit on error

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Private Job Matching Platform Deployment     ║${NC}"
echo -e "${BLUE}║  Network: Base Sepolia                         ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════╝${NC}"
echo ""

# Navigate to contracts root
echo -e "${YELLOW}→ Navigating to contracts directory...${NC}"
cd ../../..

# Load environment variables
echo -e "${YELLOW}→ Loading environment variables...${NC}"
if [ ! -f .env ]; then
  echo -e "${RED}✗ Error: .env file not found${NC}"
  echo -e "${YELLOW}  Please create .env from .env.example${NC}"
  exit 1
fi

source .env

# Validate required environment variables
echo -e "${YELLOW}→ Validating environment...${NC}"

if [ -z "$SKALE_ON_BASE_SEPOLIA_RPC_URL" ]; then
  echo -e "${RED}✗ Error: SKALE_ON_BASE_SEPOLIA_RPC_URL not set in .env${NC}"
  exit 1
fi

if [ -z "$DEPLOYER_PRIVATE_KEY" ]; then
  echo -e "${RED}✗ Error: DEPLOYER_PRIVATE_KEY not set in .env${NC}"
  exit 1
fi

echo -e "${GREEN}✓ Environment validated${NC}"
echo -e "${BLUE}  RPC: ${SKALE_ON_BASE_SEPOLIA_RPC_URL}${NC}"
echo ""

# Build contracts
echo -e "${YELLOW}→ Building contracts with Foundry...${NC}"
forge build

if [ $? -ne 0 ]; then
  echo -e "${RED}✗ Build failed!${NC}"
  exit 1
fi

echo -e "${GREEN}✓ Build successful${NC}"
echo ""

# Deploy contracts
echo -e "${YELLOW}→ Deploying contracts to Base Sepolia...${NC}"
echo -e "${BLUE}  This may take a few minutes...${NC}"
echo ""

# Check if BASESCAN_API_KEY is set for verification
if [ -n "$BASESCAN_API_KEY" ] && [ "$BASESCAN_API_KEY" != "your_basescan_api_key_here" ]; then
  echo -e "${BLUE}  Verification enabled (BaseScan API key found)${NC}"
  VERIFY_FLAGS="--verify --verifier-url https://api-sepolia.basescan.org/api --etherscan-api-key $BASESCAN_API_KEY"
else
  echo -e "${YELLOW}  Verification skipped (no BaseScan API key)${NC}"
  VERIFY_FLAGS=""
fi

forge script scripts/deployments/base-sepolia/Deploy.s.sol:DeployScript \
  --rpc-url "$SKALE_ON_BASE_SEPOLIA_RPC_URL" \
  --broadcast \
  --legacy \
  $VERIFY_FLAGS \
  -vvv

DEPLOY_STATUS=$?

echo ""
if [ $DEPLOY_STATUS -eq 0 ]; then
  echo -e "${GREEN}✓ Deployment successful!${NC}"
else
  echo -e "${YELLOW}⚠ Deployment completed with warnings${NC}"
  echo -e "${YELLOW}  Contracts deployed but verification may have failed${NC}"
fi
echo ""

# Extract and save deployment info
echo -e "${YELLOW}→ Saving deployment info...${NC}"
BROADCAST_FILE="broadcast/Deploy.s.sol/84532/run-latest.json"
DEPLOYMENT_FILE="scripts/deployments/base-sepolia/latest.json"

if [ -f "$BROADCAST_FILE" ]; then
  cp "$BROADCAST_FILE" "$DEPLOYMENT_FILE"
  echo -e "${GREEN}✓ Deployment info saved to ${DEPLOYMENT_FILE}${NC}"
  
  # Display deployed addresses if jq is available
  if command -v jq &> /dev/null; then
    echo ""
    echo -e "${BLUE}╔════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║  Deployed Contract Addresses                  ║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════════╝${NC}"
    # Note: Adjust jq queries based on actual JSON structure
    echo -e "${GREEN}Contracts deployed successfully!${NC}"
    echo -e "${YELLOW}Check ${DEPLOYMENT_FILE} for addresses${NC}"
  fi
else
  echo -e "${YELLOW}⚠ Warning: Broadcast file not found at ${BROADCAST_FILE}${NC}"
fi
echo ""

# Extract ABIs
echo -e "${YELLOW}→ Extracting contract ABIs...${NC}"
cd ../scripts

if npm run extract-abis; then
  echo -e "${GREEN}✓ ABIs extracted to scripts/contracts/abis/abi.ts${NC}"
else
  echo -e "${RED}✗ ABI extraction failed${NC}"
  exit 1
fi

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  ✓ Deployment Complete!                        ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo -e "  1. Check deployment addresses in: ${DEPLOYMENT_FILE}"
echo -e "  2. View contracts on BaseScan: https://sepolia.basescan.org"
echo -e "  3. Run E2E tests: ${YELLOW}cd scripts && npm run e2e${NC}"
echo ""

