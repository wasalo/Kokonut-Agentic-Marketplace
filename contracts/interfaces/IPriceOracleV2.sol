// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IPriceOracleV2
 * @dev Interface for PriceOracleV2 - UUPS upgradeable price oracle
 */
interface IPriceOracleV2 {
    /// @notice Get USD price of a token (8 decimals)
    /// @param token Token address (address(0) for ETH)
    /// @return price USD price with 8 decimals
    function getUsdPriceOfToken(address token) external view returns (int256 price);
    
    /// @notice Convert USD amount to token amount
    function convertUsdToToken(uint256 usdAmount, address token) external view returns (uint256);
    
    /// @notice Convert token amount to USD amount
    function convertTokenToUsd(uint256 tokenAmount, address token) external view returns (uint256);
    
    /// @notice Check if token is registered as stablecoin
    function isStablecoin(address token) external view returns (bool);
    
    /// @notice Get registered price feed for a token
    function priceFeeds(address token) external view returns (address);
    
    /// @notice Get registered feed decimals for a token
    function feedDecimals(address token) external view returns (uint8);
    
    /// @notice Get ETH-specific price feed
    function ethPriceFeed() external view returns (address);
    
    /// @notice Get ETH feed decimals
    function ethFeedDecimals() external view returns (uint8);
}
