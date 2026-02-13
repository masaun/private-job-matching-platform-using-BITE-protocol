# Base Sepolia Deployment Scripts

Automated deployment and verification scripts for deploying the Private Job Matching Platform contracts to Base Sepolia testnet.

## Prerequisites

1. **Environment Variables**: Copy `.env.example` to `.env` and configure:
   ```bash
   # In contracts directory
   cp .env.example .env
   ```

2. **Required Environment Variables**:
   ```bash
   SKALE_ON_BASE_SEPOLIA_RPC_URL=https://base-sepolia-testnet.skalenodes.com/v1/bite-v2-sandbox-2
   DEPLOYER_PRIVATE_KEY=your_private_key_here
   BASESCAN_API_KEY=your_basescan_api_key_here
   ```

3. **Get BaseScan API Key**:
   - Visit [https://basescan.org/apis](https://basescan.org/apis)
   - Sign up and create an API key
   - Add it to your `.env` file

4. **Fund Your Deployer Address**:
   - Get the address from your private key
   - Get Base Sepolia ETH from [Base Sepolia Faucet](https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet)

## Usage

### Deploy and Verify (Recommended)

Deploy all contracts and automatically verify them on BaseScan:

```bash
cd contracts/scripts/deployments/base-sepolia
./Deploy.sh
```

This script will:
1. ✅ Build all contracts using Foundry
2. ✅ Deploy 7 contracts to Base Sepolia
3. ✅ Verify contracts on BaseScan automatically
4. ✅ Save deployment addresses to `latest.json`
5. ✅ Extract ABIs to `scripts/contracts/abis/abi.ts`

### Manual Verification (If Needed)

If automatic verification fails or you need to verify contracts later:

```bash
cd contracts/scripts/deployments/base-sepolia
./Verify.sh
```

This requires the `jq` JSON parser:
```bash
# macOS
brew install jq

# Ubuntu/Debian
sudo apt-get install jq
```

## Deployed Contracts

After successful deployment, check `latest.json` for contract addresses:

```json
{
  "identityRegistry": "0x...",
  "reputationRegistry": "0x...",
  "verificationRegistry": "0x...",
  "intentVault": "0x...",
  "matchEscrow": "0x...",
  "offerContract": "0x...",
  "facilitatorGateway": "0x..."
}
```

## Verification on BaseScan

View verified contracts at:
- **BaseScan Sepolia**: https://sepolia.basescan.org/address/YOUR_CONTRACT_ADDRESS

Features of verified contracts:
- ✅ Read/Write contract functions in browser
- ✅ Source code visibility
- ✅ Constructor arguments decoded
- ✅ Event logs decoded
- ✅ Increased trust and transparency

## Troubleshooting

### Verification Fails

If verification fails during deployment:
1. Contracts are still deployed successfully
2. Run `./Verify.sh` manually after deployment
3. Check that `BASESCAN_API_KEY` is valid

### Deployment Fails

Common issues:
- **Insufficient funds**: Get more Base Sepolia ETH
- **RPC issues**: Check `SKALE_ON_BASE_SEPOLIA_RPC_URL` is correct
- **Build errors**: Run `forge build` separately to check compilation

### Contract Already Verified

If you see "Contract already verified" error, that's success! The contract is already on BaseScan.

## Contract Information

| Contract | Purpose |
|----------|---------|
| ERC8004IdentityRegistry | Agent registration with metadata |
| ERC8004ReputationRegistry | Agent reputation scoring |
| ERC8004VerificationRegistry | Agent capability verification |
| IntentVault | Encrypted profile/job storage (BITE) |
| MatchEscrow | Payment escrow with agent fees |
| OfferContract | Encrypted offer revelation (BITE) |
| FacilitatorGateway | zkProof verification gateway |

## Network Information

- **Network**: Base Sepolia Testnet
- **Chain ID**: 84532
- **RPC URL**: https://base-sepolia-testnet.skalenodes.com/v1/bite-v2-sandbox-2
- **Explorer**: https://sepolia.basescan.org
- **Faucet**: https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet

## Next Steps

After deployment:
1. Update `.env` with deployed contract addresses
2. Run E2E tests: `cd scripts && npm run e2e`
3. View contracts on BaseScan
4. Test functionality through verified contract interfaces
