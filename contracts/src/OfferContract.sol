// SPDX-License-Identifier: MIT
pragma solidity >=0.8.27;

import { BITE } from "@skalenetwork/bite-solidity/BITE.sol";
import { IBiteSupplicant } from "@skalenetwork/bite-solidity/interfaces/IBiteSupplicant.sol";
import { Address } from "@openzeppelin/contracts/utils/Address.sol";

/**
 * @title OfferContract
 * @notice Conditional job offer that reveals terms upon candidate request
 * @dev Uses BITE CTX for privacy-preserving offer revelation
 */
contract OfferContract is IBiteSupplicant {
    using Address for address payable;

    struct Offer {
        bytes32 offerId;
        address employer;
        address candidate;
        address agent;
        bytes32 escrowId;
        bytes encryptedTerms;
        uint256 createdAt;
        uint256 expiresAt;
        bool revealed;
        bool accepted;
        bool active;
    }

    mapping(bytes32 => Offer) public offers;
    mapping(bytes32 => address) private ctxSenders;
    mapping(bytes32 => bytes) private decryptedOffers;

    uint256 public constant OFFER_VALIDITY = 7 days;
    uint256 public constant CTX_GAS_LIMIT = 2500000;
    uint256 public constant CTX_GAS_PAYMENT = 0.06 ether;

    event OfferCreated(
        bytes32 indexed offerId,
        address indexed employer,
        address indexed candidate,
        bytes32 escrowId
    );
    event OfferRevealed(bytes32 indexed offerId);
    event OfferAccepted(bytes32 indexed offerId);
    event OfferExpired(bytes32 indexed offerId);

    error OfferAlreadyExists();
    error OfferNotFound();
    error Unauthorized();
    error OfferHasExpired();
    error OfferAlreadyRevealed();
    error InvalidCTXPayment();

    /**
     * @notice Create a new encrypted job offer
     * @param offerId Unique offer identifier
     * @param candidate Candidate address
     * @param agent AI agent address
     * @param escrowId Associated escrow identifier
     * @param encryptedTerms Encrypted offer terms
     */
    function createOffer(
        bytes32 offerId,
        address candidate,
        address agent,
        bytes32 escrowId,
        bytes calldata encryptedTerms
    ) external {
        if (offers[offerId].employer != address(0)) revert OfferAlreadyExists();

        offers[offerId] = Offer({
            offerId: offerId,
            employer: msg.sender,
            candidate: candidate,
            agent: agent,
            escrowId: escrowId,
            encryptedTerms: encryptedTerms,
            createdAt: block.timestamp,
            expiresAt: block.timestamp + OFFER_VALIDITY,
            revealed: false,
            accepted: false,
            active: true
        });

        emit OfferCreated(offerId, msg.sender, candidate, escrowId);
    }

    /**
     * @notice Request offer decryption using BITE CTX
     * @param offerId Offer identifier
     */
    function revealOffer(bytes32 offerId) external payable {
        Offer storage offer = offers[offerId];
        
        if (offer.employer == address(0)) revert OfferNotFound();
        if (msg.sender != offer.candidate) revert Unauthorized();
        if (block.timestamp > offer.expiresAt) revert OfferHasExpired();
        if (offer.revealed) revert OfferAlreadyRevealed();
        if (msg.value != CTX_GAS_PAYMENT) revert InvalidCTXPayment();

        bytes[] memory encryptedArgs = new bytes[](1);
        encryptedArgs[0] = offer.encryptedTerms;
        
        bytes[] memory plaintextArgs = new bytes[](1);
        plaintextArgs[0] = abi.encode(offerId);

        address ctxSender = BITE.submitCTX(
            BITE.SUBMIT_CTX_ADDRESS,
            CTX_GAS_LIMIT,
            encryptedArgs,
            plaintextArgs
        );

        ctxSenders[offerId] = ctxSender;
        payable(ctxSender).sendValue(msg.value);
    }

    /**
     * @notice Callback from BITE consensus with decrypted offer
     * @param decryptedArgs Decrypted offer terms
     * @param plaintextArgs Offer identifier
     */
    function onDecrypt(
        bytes[] calldata decryptedArgs,
        bytes[] calldata plaintextArgs
    ) external override {
        bytes32 offerId = abi.decode(plaintextArgs[0], (bytes32));
        
        if (msg.sender != ctxSenders[offerId]) revert Unauthorized();
        
        offers[offerId].revealed = true;
        decryptedOffers[offerId] = decryptedArgs[0];
        
        emit OfferRevealed(offerId);
    }

    /**
     * @notice Mark offer as accepted
     * @param offerId Offer identifier
     * @dev Should be called by escrow contract after payment
     */
    function acceptOffer(bytes32 offerId) external {
        Offer storage offer = offers[offerId];
        
        if (offer.employer == address(0)) revert OfferNotFound();
        if (msg.sender != offer.candidate) revert Unauthorized();
        if (block.timestamp > offer.expiresAt) revert OfferHasExpired();
        if (!offer.revealed) revert OfferNotFound();

        offer.accepted = true;
        
        emit OfferAccepted(offerId);
    }

    /**
     * @notice Mark offer as expired
     * @param offerId Offer identifier
     */
    function expireOffer(bytes32 offerId) external {
        Offer storage offer = offers[offerId];
        
        if (offer.employer == address(0)) revert OfferNotFound();
        if (block.timestamp <= offer.expiresAt) revert OfferHasExpired();

        offer.active = false;
        
        emit OfferExpired(offerId);
    }

    /**
     * @notice Get decrypted offer terms (only after revelation)
     * @param offerId Offer identifier
     */
    function getDecryptedOffer(bytes32 offerId) external view returns (bytes memory) {
        Offer memory offer = offers[offerId];
        
        if (offer.employer == address(0)) revert OfferNotFound();
        if (msg.sender != offer.candidate && msg.sender != offer.employer) revert Unauthorized();
        
        return decryptedOffers[offerId];
    }

    receive() external payable {}
    fallback() external payable {}
}
