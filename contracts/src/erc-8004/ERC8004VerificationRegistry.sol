// SPDX-License-Identifier: MIT
pragma solidity >=0.8.27;

import "./interfaces/IERC8004VerificationRegistry.sol";

/**
 * @title ERC8004VerificationRegistry
 * @notice Verification registry for agent capabilities in job matching
 */
contract ERC8004VerificationRegistry is IERC8004VerificationRegistry {
    mapping(bytes32 => mapping(string => Verification)) private verifications;
    mapping(bytes32 => string[]) private agentClaims;
    mapping(address => bool) public trustedVerifiers;
    
    address public admin;

    modifier onlyTrustedVerifier() {
        require(trustedVerifiers[msg.sender] || msg.sender == admin, "Not trusted verifier");
        _;
    }

    modifier onlyAdmin() {
        require(msg.sender == admin, "Not admin");
        _;
    }

    constructor() {
        admin = msg.sender;
        trustedVerifiers[msg.sender] = true;
    }

    function addTrustedVerifier(address verifier) external onlyAdmin {
        trustedVerifiers[verifier] = true;
    }

    function removeTrustedVerifier(address verifier) external onlyAdmin {
        trustedVerifiers[verifier] = false;
    }

    function verifyCapability(bytes32 agentId, string calldata claim, uint256 validUntil) 
        external 
        override 
        onlyTrustedVerifier 
    {
        require(validUntil > block.timestamp, "Invalid expiration");
        
        if (!verifications[agentId][claim].active) {
            agentClaims[agentId].push(claim);
        }
        
        verifications[agentId][claim] = Verification({
            agentId: agentId,
            verifier: msg.sender,
            claim: claim,
            validUntil: validUntil,
            active: true
        });
        
        emit CapabilityVerified(agentId, msg.sender, claim, validUntil);
    }

    function revokeVerification(bytes32 agentId, string calldata claim) 
        external 
        override 
    {
        Verification storage verification = verifications[agentId][claim];
        require(verification.verifier == msg.sender || msg.sender == admin, "Not authorized");
        require(verification.active, "Verification not active");
        
        verification.active = false;
        
        emit VerificationRevoked(agentId, msg.sender, claim);
    }

    function isVerified(bytes32 agentId, string calldata claim) 
        external 
        view 
        override 
        returns (bool) 
    {
        Verification memory verification = verifications[agentId][claim];
        return verification.active && verification.validUntil > block.timestamp;
    }

    function getVerifications(bytes32 agentId) 
        external 
        view 
        override 
        returns (Verification[] memory) 
    {
        string[] memory claims = agentClaims[agentId];
        Verification[] memory results = new Verification[](claims.length);
        
        uint256 count = 0;
        for (uint256 i = 0; i < claims.length; i++) {
            Verification memory v = verifications[agentId][claims[i]];
            if (v.active && v.validUntil > block.timestamp) {
                results[count] = v;
                count++;
            }
        }
        
        // Resize array to actual count
        Verification[] memory activeVerifications = new Verification[](count);
        for (uint256 i = 0; i < count; i++) {
            activeVerifications[i] = results[i];
        }
        
        return activeVerifications;
    }
}
