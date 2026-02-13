// SPDX-License-Identifier: MIT
pragma solidity >=0.8.27;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title MockUSDC
 * @notice Mock USDC token for testing purposes
 */
contract MockUSDC is ERC20 {
    uint8 private constant DECIMALS = 6; // USDC uses 6 decimals

    constructor() ERC20("Mock USD Coin", "USDC") {
        // Mint initial supply to deployer for distribution
        _mint(msg.sender, 1000000 * 10**DECIMALS); // 1M USDC
    }

    function decimals() public pure override returns (uint8) {
        return DECIMALS;
    }

    /**
     * @notice Mint tokens to an address (for testing)
     */
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    /**
     * @notice Burn tokens from an address (for testing)
     */
    function burn(address from, uint256 amount) external {
        _burn(from, amount);
    }
}
