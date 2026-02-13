// SPDX-License-Identifier: MIT
pragma solidity >=0.8.27;

import "./interfaces/IERC8004ReputationRegistry.sol";

/**
 * @title ERC8004ReputationRegistry
 * @notice Tracks reputation scores for job matching agents
 */
contract ERC8004ReputationRegistry is IERC8004ReputationRegistry {
    mapping(bytes32 => Reputation) private reputations;
    mapping(address => bool) public authorized;
    
    address public admin;

    modifier onlyAuthorized() {
        require(authorized[msg.sender] || msg.sender == admin, "Not authorized");
        _;
    }

    modifier onlyAdmin() {
        require(msg.sender == admin, "Not admin");
        _;
    }

    constructor() {
        admin = msg.sender;
        authorized[msg.sender] = true;
    }

    function authorizeRecorder(address recorder) external onlyAdmin {
        authorized[recorder] = true;
    }

    function revokeRecorder(address recorder) external onlyAdmin {
        authorized[recorder] = false;
    }

    function recordInteraction(bytes32 agentId, bool success, uint256 weight) 
        external 
        override 
        onlyAuthorized 
    {
        Reputation storage rep = reputations[agentId];
        
        rep.agentId = agentId;
        rep.totalInteractions++;
        
        if (success) {
            rep.successfulInteractions++;
            rep.score += weight;
        } else {
            // Penalty for failure
            if (rep.score > weight / 2) {
                rep.score -= weight / 2;
            } else {
                rep.score = 0;
            }
        }
        
        rep.lastUpdated = block.timestamp;
        
        emit InteractionRecorded(agentId, success, weight);
        emit ReputationUpdated(agentId, rep.score);
    }

    function getReputation(bytes32 agentId) 
        external 
        view 
        override 
        returns (Reputation memory) 
    {
        return reputations[agentId];
    }

    function getSuccessRate(bytes32 agentId) 
        external 
        view 
        override 
        returns (uint256) 
    {
        Reputation memory rep = reputations[agentId];
        if (rep.totalInteractions == 0) return 0;
        return (rep.successfulInteractions * 10000) / rep.totalInteractions;
    }
}
