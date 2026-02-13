// SPDX-License-Identifier: MIT
pragma solidity >=0.8.27;

/**
 * @title IERC8004IdentityRegistry
 * @notice Interface for ERC-8004 agent identity registry
 */
interface IERC8004IdentityRegistry {
    struct AgentIdentity {
        bytes32 id;
        address owner;
        string metadata;
        uint256 registeredAt;
        bool active;
    }

    event AgentRegistered(bytes32 indexed agentId, address indexed owner, string metadata);
    event AgentUpdated(bytes32 indexed agentId, string metadata);
    event AgentDeactivated(bytes32 indexed agentId);

    function registerAgent(bytes32 agentId, string calldata metadataUri) external;
    function updateMetadata(bytes32 agentId, string calldata newUri) external;
    function deactivateAgent(bytes32 agentId) external;
    function getAgentMetadata(bytes32 agentId) external view returns (AgentIdentity memory);
    function getAgentsByOwner(address owner) external view returns (bytes32[] memory);
    function isActiveAgent(bytes32 agentId) external view returns (bool);
}
