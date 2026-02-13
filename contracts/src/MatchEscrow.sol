// SPDX-License-Identifier: MIT
pragma solidity >=0.8.27;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title MatchEscrow
 * @notice Escrow contract for job matching payments
 * @dev Holds funds until candidate accepts or rejects offer
 */
contract MatchEscrow is ReentrancyGuard {
    using SafeERC20 for IERC20;

    enum EscrowStatus { PENDING, ACCEPTED, REJECTED, REFUNDED, TIMEOUT }

    struct Escrow {
        bytes32 matchId;
        address employer;
        address candidate;
        address agent;
        address paymentToken;
        uint256 salaryAmount;
        uint256 agentFee;
        uint256 deadline;
        EscrowStatus status;
    }

    mapping(bytes32 => Escrow) public escrows;
    mapping(address => bytes32[]) public employerEscrows;
    mapping(address => bytes32[]) public candidateEscrows;

    uint256 public constant DEFAULT_TIMEOUT = 7 days;
    uint256 public constant AGENT_FEE_BPS = 500; // 5%

    event EscrowCreated(
        bytes32 indexed matchId,
        address indexed employer,
        address indexed candidate,
        address agent,
        uint256 salaryAmount,
        uint256 agentFee
    );
    event EscrowAccepted(bytes32 indexed matchId);
    event EscrowRejected(bytes32 indexed matchId);
    event EscrowRefunded(bytes32 indexed matchId);
    event EscrowTimeout(bytes32 indexed matchId);

    error EscrowAlreadyExists();
    error EscrowNotFound();
    error Unauthorized();
    error InvalidStatus();
    error DeadlineNotPassed();
    error InvalidAmount();

    /**
     * @notice Create escrow for a job match
     * @param matchId Unique match identifier
     * @param candidate Candidate address
     * @param agent AI agent address
     * @param paymentToken ERC20 token for payment
     * @param salaryAmount Salary to be paid
     */
    function createEscrow(
        bytes32 matchId,
        address candidate,
        address agent,
        address paymentToken,
        uint256 salaryAmount
    ) external nonReentrant {
        if (escrows[matchId].employer != address(0)) revert EscrowAlreadyExists();
        if (salaryAmount == 0) revert InvalidAmount();

        uint256 agentFee = (salaryAmount * AGENT_FEE_BPS) / 10000;
        uint256 totalAmount = salaryAmount + agentFee;

        IERC20(paymentToken).safeTransferFrom(msg.sender, address(this), totalAmount);

        escrows[matchId] = Escrow({
            matchId: matchId,
            employer: msg.sender,
            candidate: candidate,
            agent: agent,
            paymentToken: paymentToken,
            salaryAmount: salaryAmount,
            agentFee: agentFee,
            deadline: block.timestamp + DEFAULT_TIMEOUT,
            status: EscrowStatus.PENDING
        });

        employerEscrows[msg.sender].push(matchId);
        candidateEscrows[candidate].push(matchId);

        emit EscrowCreated(matchId, msg.sender, candidate, agent, salaryAmount, agentFee);
    }

    /**
     * @notice Candidate accepts the offer
     * @param matchId Match identifier
     */
    function acceptOffer(bytes32 matchId) external nonReentrant {
        Escrow storage escrow = escrows[matchId];
        
        if (escrow.employer == address(0)) revert EscrowNotFound();
        if (msg.sender != escrow.candidate) revert Unauthorized();
        if (escrow.status != EscrowStatus.PENDING) revert InvalidStatus();

        escrow.status = EscrowStatus.ACCEPTED;

        // Transfer salary to candidate
        IERC20(escrow.paymentToken).safeTransfer(escrow.candidate, escrow.salaryAmount);
        
        // Transfer fee to agent
        IERC20(escrow.paymentToken).safeTransfer(escrow.agent, escrow.agentFee);

        emit EscrowAccepted(matchId);
    }

    /**
     * @notice Candidate rejects the offer
     * @param matchId Match identifier
     */
    function rejectOffer(bytes32 matchId) external nonReentrant {
        Escrow storage escrow = escrows[matchId];
        
        if (escrow.employer == address(0)) revert EscrowNotFound();
        if (msg.sender != escrow.candidate) revert Unauthorized();
        if (escrow.status != EscrowStatus.PENDING) revert InvalidStatus();

        escrow.status = EscrowStatus.REJECTED;

        // Refund employer
        uint256 totalAmount = escrow.salaryAmount + escrow.agentFee;
        IERC20(escrow.paymentToken).safeTransfer(escrow.employer, totalAmount);

        emit EscrowRejected(matchId);
    }

    /**
     * @notice Employer cancels escrow before acceptance
     * @param matchId Match identifier
     */
    function cancelEscrow(bytes32 matchId) external nonReentrant {
        Escrow storage escrow = escrows[matchId];
        
        if (escrow.employer == address(0)) revert EscrowNotFound();
        if (msg.sender != escrow.employer) revert Unauthorized();
        if (escrow.status != EscrowStatus.PENDING) revert InvalidStatus();

        escrow.status = EscrowStatus.REFUNDED;

        // Refund employer
        uint256 totalAmount = escrow.salaryAmount + escrow.agentFee;
        IERC20(escrow.paymentToken).safeTransfer(escrow.employer, totalAmount);

        emit EscrowRefunded(matchId);
    }

    /**
     * @notice Process timeout if candidate doesn't respond
     * @param matchId Match identifier
     */
    function processTimeout(bytes32 matchId) external nonReentrant {
        Escrow storage escrow = escrows[matchId];
        
        if (escrow.employer == address(0)) revert EscrowNotFound();
        if (escrow.status != EscrowStatus.PENDING) revert InvalidStatus();
        if (block.timestamp < escrow.deadline) revert DeadlineNotPassed();

        escrow.status = EscrowStatus.TIMEOUT;

        // Refund employer on timeout
        uint256 totalAmount = escrow.salaryAmount + escrow.agentFee;
        IERC20(escrow.paymentToken).safeTransfer(escrow.employer, totalAmount);

        emit EscrowTimeout(matchId);
    }

    /**
     * @notice Get employer's escrows
     * @param employer Employer address
     */
    function getEmployerEscrows(address employer) external view returns (bytes32[] memory) {
        return employerEscrows[employer];
    }

    /**
     * @notice Get candidate's escrows
     * @param candidate Candidate address
     */
    function getCandidateEscrows(address candidate) external view returns (bytes32[] memory) {
        return candidateEscrows[candidate];
    }
}
