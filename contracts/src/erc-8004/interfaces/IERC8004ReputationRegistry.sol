// SPDX-License-Identifier: MIT
pragma solidity >=0.8.27;

/**
 * @title IERC8004ReputationRegistry
 * @notice Interface for ERC-8004 agent reputation tracking
 */
interface IERC8004ReputationRegistry {
    struct Reputation {
        bytes32 agentId;
        uint256 score;
        uint256 totalInteractions;
        uint256 successfulInteractions;
        uint256 lastUpdated;
    }

    event InteractionRecorded(bytes32 indexed agentId, bool success, uint256 weight);
    event ReputationUpdated(bytes32 indexed agentId, uint256 newScore);

    function recordInteraction(bytes32 agentId, bool success, uint256 weight) external;
    function getReputation(bytes32 agentId) external view returns (Reputation memory);
    function getSuccessRate(bytes32 agentId) external view returns (uint256);
}
