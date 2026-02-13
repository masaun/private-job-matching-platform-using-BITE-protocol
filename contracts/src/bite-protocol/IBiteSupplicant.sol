// SPDX-License-Identifier: MIT
pragma solidity >=0.8.27;

/**
 * @title IBiteSupplicant - Mock Implementation  
 * @notice Interface for contracts that receive BITE decryption callbacks
 * @dev In production, use @skalenetwork/bite-solidity package
 */
interface IBiteSupplicant {
    /**
     * @notice Callback function called by SKALE consensus with decrypted data
     * @param decryptedArgs Array of decrypted byte arrays
     * @param plaintextArgs Array of plaintext byte arrays (passed through)
     */
    function onDecrypt(
        bytes[] calldata decryptedArgs,
        bytes[] calldata plaintextArgs
    ) external;
}
