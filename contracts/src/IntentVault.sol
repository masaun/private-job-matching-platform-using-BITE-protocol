// SPDX-License-Identifier: MIT
pragma solidity >=0.8.27;

import { BITE } from "./bite-protocol/BITE.sol";
import { IBiteSupplicant } from "./bite-protocol/IBiteSupplicant.sol";
import { Address } from "@openzeppelin/contracts/utils/Address.sol";

/**
 * @title IntentVault
 * @notice Stores encrypted candidate profiles and job requirements
 * @dev Uses BITE protocol for privacy-preserving storage
 */
contract IntentVault is IBiteSupplicant {
    using Address for address payable;

    enum IntentType { CANDIDATE, EMPLOYER }

    struct Intent {
        bytes32 intentHash;
        address submitter;
        IntentType intentType;
        uint256 timestamp;
        bool active;
    }

    mapping(bytes32 => Intent) public intents;
    mapping(address => bytes32[]) public userIntents;
    mapping(bytes32 => bytes) private encryptedData;
    
    // CTX tracking
    mapping(bytes32 => address) public ctxSenders;
    
    uint256 public constant CTX_GAS_LIMIT = 2500000;
    uint256 public constant CTX_GAS_PAYMENT = 0.06 ether;

    event IntentStored(bytes32 indexed intentHash, address indexed submitter, IntentType intentType);
    event IntentRevealed(bytes32 indexed intentHash, bytes decryptedData);
    event IntentRevoked(bytes32 indexed intentHash);

    error InvalidCTXPayment();
    error IntentAlreadyExists();
    error IntentNotFound();
    error Unauthorized();

    /**
     * @notice Store encrypted intent (candidate profile or job requirement)
     * @param encrypted The encrypted intent data
     * @param intentType Type of intent (CANDIDATE or EMPLOYER)
     */
    function storeIntent(bytes calldata encrypted, IntentType intentType) external returns (bytes32) {
        bytes32 intentHash = keccak256(abi.encodePacked(msg.sender, encrypted, block.timestamp));
        
        if (intents[intentHash].timestamp != 0) revert IntentAlreadyExists();
        
        intents[intentHash] = Intent({
            intentHash: intentHash,
            submitter: msg.sender,
            intentType: intentType,
            timestamp: block.timestamp,
            active: true
        });
        
        encryptedData[intentHash] = encrypted;
        userIntents[msg.sender].push(intentHash);
        
        emit IntentStored(intentHash, msg.sender, intentType);
        
        return intentHash;
    }

    /**
     * @notice Request decryption of an intent using BITE CTX
     * @param intentHash The hash of the intent to reveal
     */
    function requestIntentDecryption(bytes32 intentHash) external payable {
        Intent storage intent = intents[intentHash];
        if (intent.timestamp == 0) revert IntentNotFound();
        if (msg.value != CTX_GAS_PAYMENT) revert InvalidCTXPayment();
        
        bytes[] memory encryptedArgs = new bytes[](1);
        encryptedArgs[0] = encryptedData[intentHash];
        
        bytes[] memory plaintextArgs = new bytes[](1);
        plaintextArgs[0] = abi.encode(intentHash);
        
        address ctxSender = BITE.submitCTX(
            BITE.SUBMIT_CTX_ADDRESS,
            CTX_GAS_LIMIT,
            encryptedArgs,
            plaintextArgs
        );
        
        ctxSenders[intentHash] = ctxSender;
        payable(ctxSender).sendValue(msg.value);
    }

    /**
     * @notice Callback from BITE consensus with decrypted data
     * @param decryptedArgs The decrypted intent data
     * @param plaintextArgs The intent hash
     */
    function onDecrypt(
        bytes[] calldata decryptedArgs,
        bytes[] calldata plaintextArgs
    ) external override {
        bytes32 intentHash = abi.decode(plaintextArgs[0], (bytes32));
        
        if (msg.sender != ctxSenders[intentHash]) revert Unauthorized();
        
        emit IntentRevealed(intentHash, decryptedArgs[0]);
    }

    /**
     * @notice Revoke an active intent
     * @param intentHash The hash of the intent to revoke
     */
    function revokeIntent(bytes32 intentHash) external {
        Intent storage intent = intents[intentHash];
        if (intent.submitter != msg.sender) revert Unauthorized();
        if (intent.timestamp == 0) revert IntentNotFound();
        
        intent.active = false;
        emit IntentRevoked(intentHash);
    }

    /**
     * @notice Get encrypted intent data
     * @param intentHash The hash of the intent
     */
    function getEncryptedIntent(bytes32 intentHash) external view returns (bytes memory) {
        return encryptedData[intentHash];
    }

    /**
     * @notice Get user's intents
     * @param user The user address
     */
    function getUserIntents(address user) external view returns (bytes32[] memory) {
        return userIntents[user];
    }

    receive() external payable {}
    fallback() external payable {}
}
