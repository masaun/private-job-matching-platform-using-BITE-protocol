// SPDX-License-Identifier: MIT
pragma solidity >=0.8.27;

import "../erc-8004/interfaces/IERC8004ReputationRegistry.sol";

/**
 * @title FacilitatorGateway
 * @notice Verifies zk proofs from AI matching agents
 * @dev Simplified proof verification for demo - production should use proper zk-SNARKs
 */
contract FacilitatorGateway {
    struct MatchProof {
        bytes32 proofId;
        bytes32 agentId;
        bytes32 candidateIntentHash;
        bytes32 employerIntentHash;
        uint256 matchScore;
        bytes proof;
        uint256 timestamp;
        bool verified;
    }

    mapping(bytes32 => MatchProof) public proofs;
    mapping(bytes32 => bool) public verifiedProofs;
    
    IERC8004ReputationRegistry public reputationRegistry;
    
    uint256 public constant MIN_MATCH_SCORE = 70;
    uint256 public constant MIN_REPUTATION_SCORE = 100;

    event ProofSubmitted(
        bytes32 indexed proofId,
        bytes32 indexed agentId,
        bytes32 candidateIntentHash,
        bytes32 employerIntentHash,
        uint256 matchScore
    );
    event ProofVerified(bytes32 indexed proofId, bool valid);
    event ProofRejected(bytes32 indexed proofId, string reason);

    error ProofAlreadyExists();
    error ProofNotFound();
    error InvalidProof();
    error InsufficientMatchScore();
    error InsufficientReputation();

    constructor(address _reputationRegistry) {
        reputationRegistry = IERC8004ReputationRegistry(_reputationRegistry);
    }

    /**
     * @notice Submit match proof for verification
     * @param agentId AI agent identifier
     * @param candidateIntentHash Candidate intent hash
     * @param employerIntentHash Employer intent hash
     * @param matchScore Match quality score (0-100)
     * @param proof zk proof data
     */
    function submitMatchProof(
        bytes32 agentId,
        bytes32 candidateIntentHash,
        bytes32 employerIntentHash,
        uint256 matchScore,
        bytes calldata proof
    ) external returns (bytes32) {
        bytes32 proofId = keccak256(
            abi.encodePacked(
                agentId,
                candidateIntentHash,
                employerIntentHash,
                matchScore,
                proof
            )
        );

        if (proofs[proofId].timestamp != 0) revert ProofAlreadyExists();

        // Check agent reputation
        IERC8004ReputationRegistry.Reputation memory rep = reputationRegistry.getReputation(agentId);
        if (rep.score < MIN_REPUTATION_SCORE) {
            emit ProofRejected(proofId, "Insufficient agent reputation");
            revert InsufficientReputation();
        }

        // Check match score threshold
        if (matchScore < MIN_MATCH_SCORE) {
            emit ProofRejected(proofId, "Match score below threshold");
            revert InsufficientMatchScore();
        }

        proofs[proofId] = MatchProof({
            proofId: proofId,
            agentId: agentId,
            candidateIntentHash: candidateIntentHash,
            employerIntentHash: employerIntentHash,
            matchScore: matchScore,
            proof: proof,
            timestamp: block.timestamp,
            verified: false
        });

        emit ProofSubmitted(proofId, agentId, candidateIntentHash, employerIntentHash, matchScore);

        // Auto-verify for demo (in production, use proper zk verification)
        _verifyProof(proofId);

        return proofId;
    }

    /**
     * @notice Verify a submitted proof
     * @param proofId Proof identifier
     * @dev Simplified verification - production should use zk-SNARK verification
     */
    function _verifyProof(bytes32 proofId) internal {
        MatchProof storage matchProof = proofs[proofId];
        
        if (matchProof.timestamp == 0) revert ProofNotFound();

        // Simplified verification logic
        // In production, implement proper zk-SNARK verification here
        bool isValid = matchProof.proof.length > 0 && 
                      matchProof.matchScore >= MIN_MATCH_SCORE;

        if (!isValid) {
            emit ProofRejected(proofId, "Invalid proof");
            revert InvalidProof();
        }

        matchProof.verified = true;
        verifiedProofs[proofId] = true;

        // Record successful interaction for agent
        reputationRegistry.recordInteraction(matchProof.agentId, true, 100);

        emit ProofVerified(proofId, true);
    }

    /**
     * @notice Check if a proof is verified
     * @param proofId Proof identifier
     */
    function isProofVerified(bytes32 proofId) external view returns (bool) {
        return verifiedProofs[proofId];
    }

    /**
     * @notice Get match proof details
     * @param proofId Proof identifier
     */
    function getProof(bytes32 proofId) external view returns (MatchProof memory) {
        return proofs[proofId];
    }
}
