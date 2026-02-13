// SPDX-License-Identifier: MIT
pragma solidity >=0.8.27;

import "./interfaces/IERC8004IdentityRegistry.sol";

/**
 * @title ERC8004IdentityRegistry
 * @notice ERC-8004 compliant agent identity registry for job matching agents
 */
contract ERC8004IdentityRegistry is IERC8004IdentityRegistry {
    mapping(bytes32 => AgentIdentity) private agents;
    mapping(address => bytes32[]) private ownerAgents;
    
    modifier onlyAgentOwner(bytes32 agentId) {
        require(agents[agentId].owner == msg.sender, "Not agent owner");
        _;
    }

    modifier agentExists(bytes32 agentId) {
        require(agents[agentId].registeredAt > 0, "Agent does not exist");
        _;
    }

    function registerAgent(bytes32 agentId, string calldata metadataUri) external override {
        require(agents[agentId].registeredAt == 0, "Agent already registered");
        
        agents[agentId] = AgentIdentity({
            id: agentId,
            owner: msg.sender,
            metadata: metadataUri,
            registeredAt: block.timestamp,
            active: true
        });
        
        ownerAgents[msg.sender].push(agentId);
        
        emit AgentRegistered(agentId, msg.sender, metadataUri);
    }

    function updateMetadata(bytes32 agentId, string calldata newUri) 
        external 
        override 
        onlyAgentOwner(agentId) 
        agentExists(agentId) 
    {
        agents[agentId].metadata = newUri;
        emit AgentUpdated(agentId, newUri);
    }

    function deactivateAgent(bytes32 agentId) 
        external 
        override 
        onlyAgentOwner(agentId) 
        agentExists(agentId) 
    {
        agents[agentId].active = false;
        emit AgentDeactivated(agentId);
    }

    function getAgentMetadata(bytes32 agentId) 
        external 
        view 
        override 
        returns (AgentIdentity memory) 
    {
        return agents[agentId];
    }

    function getAgentsByOwner(address owner) 
        external 
        view 
        override 
        returns (bytes32[] memory) 
    {
        return ownerAgents[owner];
    }

    function isActiveAgent(bytes32 agentId) 
        external 
        view 
        override 
        returns (bool) 
    {
        return agents[agentId].active && agents[agentId].registeredAt > 0;
    }
}
