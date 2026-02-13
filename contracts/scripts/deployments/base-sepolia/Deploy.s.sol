// SPDX-License-Identifier: MIT
pragma solidity >=0.8.27;

import "forge-std/Script.sol";
import {ERC8004IdentityRegistry} from "../../../src/erc-8004/ERC8004IdentityRegistry.sol";
import {ERC8004ReputationRegistry} from "../../../src/erc-8004/ERC8004ReputationRegistry.sol";
import {ERC8004VerificationRegistry} from "../../../src/erc-8004/ERC8004VerificationRegistry.sol";
import {IntentVault} from "../../../src/IntentVault.sol";
import {MatchEscrow} from "../../../src/MatchEscrow.sol";
import {OfferContract} from "../../../src/OfferContract.sol";
import {FacilitatorGateway} from "../../../src/x402/FacilitatorGateway.sol";
import {MockUSDC} from "../../../src/mock/MockUSDC.sol";

contract DeployScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        
        vm.startBroadcast(deployerPrivateKey);

        // Deploy ERC-8004 Registries
        console.log("Deploying ERC-8004 Identity Registry...");
        ERC8004IdentityRegistry identityRegistry = new ERC8004IdentityRegistry();
        console.log("Identity Registry deployed at:", address(identityRegistry));

        console.log("Deploying ERC-8004 Reputation Registry...");
        ERC8004ReputationRegistry reputationRegistry = new ERC8004ReputationRegistry();
        console.log("Reputation Registry deployed at:", address(reputationRegistry));

        console.log("Deploying ERC-8004 Verification Registry...");
        ERC8004VerificationRegistry verificationRegistry = new ERC8004VerificationRegistry();
        console.log("Verification Registry deployed at:", address(verificationRegistry));

        // Deploy Core Contracts
        console.log("Deploying IntentVault...");
        IntentVault intentVault = new IntentVault();
        console.log("IntentVault deployed at:", address(intentVault));

        console.log("Deploying MatchEscrow...");
        MatchEscrow matchEscrow = new MatchEscrow();
        console.log("MatchEscrow deployed at:", address(matchEscrow));

        console.log("Deploying OfferContract...");
        OfferContract offerContract = new OfferContract();
        console.log("OfferContract deployed at:", address(offerContract));

        console.log("Deploying FacilitatorGateway...");
        FacilitatorGateway facilitatorGateway = new FacilitatorGateway(address(reputationRegistry));
        console.log("FacilitatorGateway deployed at:", address(facilitatorGateway));

        // Deploy MockUSDC
        console.log("Deploying MockUSDC...");
        MockUSDC mockUSDC = new MockUSDC();
        console.log("MockUSDC deployed at:", address(mockUSDC));

        // Authorize FacilitatorGateway
        console.log("Authorizing FacilitatorGateway...");
        reputationRegistry.authorizeRecorder(address(facilitatorGateway));
        console.log("FacilitatorGateway authorized");

        vm.stopBroadcast();

        // Write deployment addresses to JSON
        string memory json = string.concat(
            '{\n',
            '  "network": "base-sepolia",\n',
            '  "chainId": 84532,\n',
            '  "timestamp": "', vm.toString(block.timestamp), '",\n',
            '  "deployer": "', vm.toString(msg.sender), '",\n',
            '  "contracts": {\n',
            '    "ERC8004IdentityRegistry": "', vm.toString(address(identityRegistry)), '",\n',
            '    "ERC8004ReputationRegistry": "', vm.toString(address(reputationRegistry)), '",\n',
            '    "ERC8004VerificationRegistry": "', vm.toString(address(verificationRegistry)), '",\n',
            '    "IntentVault": "', vm.toString(address(intentVault)), '",\n',
            '    "MatchEscrow": "', vm.toString(address(matchEscrow)), '",\n',
            '    "OfferContract": "', vm.toString(address(offerContract)), '",\n',
            '    "FacilitatorGateway": "', vm.toString(address(facilitatorGateway)), '",\n',
            '    "MockUSDC": "', vm.toString(address(mockUSDC)), '"\n',
            '  }\n',
            '}'
        );

        string memory filename = string.concat("scripts/deployments/base-sepolia/deployment-", vm.toString(block.timestamp), ".json");
        vm.writeFile(filename, json);
        vm.writeFile("scripts/deployments/base-sepolia/latest.json", json);
        
        console.log("\nDeployment complete!");
        console.log("Deployment info saved to:", filename);
    }
}
