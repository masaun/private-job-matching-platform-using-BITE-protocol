// SPDX-License-Identifier: MIT
pragma solidity >=0.8.27;

/**
 * @title IERC8004VerificationRegistry
 * @notice Interface for ERC-8004 agent capability verification
 */
interface IERC8004VerificationRegistry {
    struct Verification {
        bytes32 agentId;
        address verifier;
        string claim;
        uint256 validUntil;
        bool active;
    }

    event CapabilityVerified(bytes32 indexed agentId, address indexed verifier, string claim, uint256 validUntil);
    event VerificationRevoked(bytes32 indexed agentId, address indexed verifier, string claim);

    function verifyCapability(bytes32 agentId, string calldata claim, uint256 validUntil) external;
    function revokeVerification(bytes32 agentId, string calldata claim) external;
    function isVerified(bytes32 agentId, string calldata claim) external view returns (bool);
    function getVerifications(bytes32 agentId) external view returns (Verification[] memory);
}
