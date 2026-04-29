// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

/**
 * @title AggregatorV3Interface
 * @dev Minimal interface for Chainlink price feeds
 */
interface AggregatorV3Interface {
    function decimals() external view returns (uint8);
    function latestRoundData() external view returns (
        uint80 roundId,
        int256 answer,
        uint256 startedAt,
        uint256 updatedAt,
        uint80 answeredInRound
    );
}

/**
 * @title PriceOracleV2
 * @dev UUPS Upgradeable unified price oracle with per-token feed support
 * 
 * V2 Changes:
 * - UUPS Upgradeable for future modifications
 * - Per-token price feed registration via mapping
 * - Dynamic token decimal querying
 * - Support for arbitrary ERC20 tokens
 * - Removed hardcoded Sepolia addresses
 */
contract PriceOracleV2 is OwnableUpgradeable, UUPSUpgradeable {
    
    // Max staleness period (1 hour)
    uint256 public constant MAX_STALENESS = 1 hours;
    
    // 1 USD in terms of 8 decimals (Chainlink format)
    int256 public constant ONE_USD = 100000000; // 1e8
    
    // V2: Per-token price feed mapping
    mapping(address => address) public priceFeeds;
    mapping(address => uint8) public feedDecimals;
    mapping(address => bool) public isStablecoin;
    
    address public ethPriceFeed;
    uint8 public ethFeedDecimals;
    
    // Events
    event PriceUpdated(address indexed token, int256 price, uint256 timestamp);
    event PriceFeedRegistered(address indexed token, address indexed feed, uint8 decimals);
    event PriceFeedRemoved(address indexed token);
    event StablecoinStatusChanged(address indexed token, bool isStable);
    event FallbackPriceUsed(address indexed token, int256 price);

    function initialize(address initialOwner) external initializer {
        __Ownable_init(initialOwner);
        __UUPSUpgradeable_init();
    }
    
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    /**
     * @dev Register a price feed for a token
     * @param token The token address
     * @param feed The Chainlink price feed address
     * @param decimals The token's decimal places
     */
    function setPriceFeed(address token, address feed, uint8 decimals) external onlyOwner {
        require(token != address(0), "Zero token address");
        priceFeeds[token] = feed;
        feedDecimals[token] = decimals;
        emit PriceFeedRegistered(token, feed, decimals);
    }
    
    /**
     * @dev Remove a price feed
     */
    function removePriceFeed(address token) external onlyOwner {
        delete priceFeeds[token];
        delete feedDecimals[token];
        emit PriceFeedRemoved(token);
    }
    
    /**
     * @dev Set stablecoin status (no oracle needed, $1 peg)
     */
    function setStablecoin(address token, bool isStable) external onlyOwner {
        isStablecoin[token] = isStable;
        emit StablecoinStatusChanged(token, isStable);
    }
    
    /**
     * @dev Set ETH price feed (special case since address(0) is ETH)
     * @param feed The Chainlink ETH/USD price feed address
     * @param decimals The ETH decimal places (18)
     */
    function setEthPriceFeed(address feed, uint8 decimals) external onlyOwner {
        ethPriceFeed = feed;
        ethFeedDecimals = decimals;
        emit PriceFeedRegistered(address(0), feed, decimals);
    }

    /**
     * @dev Get the USD price of a token
     * @param token Token address (address(0) for ETH)
 * @return price USD price with 8 decimals
     */
    function getUsdPriceOfToken(address token) external view returns (int256 price) {
        // Stablecoins return $1
        if (isStablecoin[token]) {
            return ONE_USD;
        }
        
        // ETH special case
        if (token == address(0)) {
            if (ethPriceFeed != address(0)) {
                return _getChainlinkPrice(ethPriceFeed);
            }
            return ONE_USD; // Fallback only if no ETH feed set
        }
        
        // Check if feed is registered
        address feed = priceFeeds[token];
        if (feed != address(0)) {
            return _getChainlinkPrice(feed);
        }
        
        // Fallback to $1 for unknown tokens
        return ONE_USD;
    }
    
    /**
     * @dev Internal: Get price from Chainlink feed
     */
    function _getChainlinkPrice(address feed) internal view returns (int256) {
        AggregatorV3Interface aggregator = AggregatorV3Interface(feed);
        (, int256 answer,, uint256 updatedAt,) = aggregator.latestRoundData();
        
        // Check staleness
        if (block.timestamp - updatedAt > MAX_STALENESS) {
            return ONE_USD; // Fallback to $1 if stale
        }
        
        require(answer > 0, "Invalid price");
        return answer;
    }

    /**
     * @dev Get the amount of tokens for a given USD amount
     * @param usdAmount USD amount (with 6 decimals)
     * @param token Token address
     * @return tokenAmount Token amount in token's native units
     */
    function getTokenAmountForUsd(uint256 usdAmount, address token) external view returns (uint256 tokenAmount) {
        require(token != address(0), "Zero address");
        require(usdAmount > 0, "Zero amount");

        int256 price = this.getUsdPriceOfToken(token);
        require(price > 0, "Invalid price");

        uint8 decimals = _getTokenDecimals(token);
        
        // USD amount is in 6 decimals, price is in 8 decimals
        // Formula: tokenAmount = (usdAmount * 10^decimals) / (price / 10^8)
        // = (usdAmount * 10^decimals * 10^8) / price
        tokenAmount = (usdAmount * (10 ** decimals) * 1e8) / uint256(price);
    }
    
    /**
     * @dev Get USD amount for a given token amount
     * @param tokenAmount Token amount in token's native units
     * @param token Token address
     * @return usdAmount USD amount (with 6 decimals)
     */
    function getUsdAmountForTokens(uint256 tokenAmount, address token) external view returns (uint256 usdAmount) {
        require(token != address(0), "Zero address");
        require(tokenAmount > 0, "Zero amount");

        int256 price = this.getUsdPriceOfToken(token);
        require(price > 0, "Invalid price");

        uint8 decimals = _getTokenDecimals(token);
        
        // Formula: usdAmount = (tokenAmount * price) / (10^decimals * 10^8)
        // Result in 6 decimals
        usdAmount = (tokenAmount * uint256(price)) / (10 ** decimals) / 1e8;
    }

    /**
     * @dev Get token decimals (uses registered value, falls back to contract call)
     */
    function _getTokenDecimals(address token) internal view returns (uint8) {
        if (token == address(0)) return 18;
        
        // Use registered decimals if available
        if (feedDecimals[token] > 0) {
            return feedDecimals[token];
        }
        
        // Try to call decimals() on the token
        (bool success, bytes memory data) = token.staticcall(abi.encodeWithSignature("decimals()"));
        if (success && data.length >= 32) {
            return abi.decode(data, (uint8));
        }
        
        // Default to 18
        return 18;
    }
    
    /**
     * @dev Get registered price feed for a token
     */
    function getPriceFeed(address token) external view returns (address) {
        return priceFeeds[token];
    }
    
    /**
     * @dev Get all price feed info for a token
     */
    function getTokenInfo(address token) external view returns (
        address feed,
        uint8 decimals,
        bool stable
    ) {
        return (priceFeeds[token], _getTokenDecimals(token), isStablecoin[token]);
    }

    /**
     * @dev Check if price is stale for a specific token
     */
    function isStale(address token) external view returns (bool) {
        address feed = priceFeeds[token];
        if (feed == address(0)) return false; // No feed = no staleness
        
        AggregatorV3Interface aggregator = AggregatorV3Interface(feed);
        (, int256 answer,, uint256 updatedAt,) = aggregator.latestRoundData();
        
        if (answer <= 0) return true;
        return (block.timestamp - updatedAt) > MAX_STALENESS;
    }
    
    /**
     * @dev Batch register multiple feeds
     */
    function batchSetPriceFeeds(
        address[] calldata tokens,
        address[] calldata feeds,
        uint8[] calldata decimals_
    ) external onlyOwner {
        require(tokens.length == feeds.length && feeds.length == decimals_.length, "Length mismatch");
        for (uint256 i = 0; i < tokens.length; i++) {
            priceFeeds[tokens[i]] = feeds[i];
            feedDecimals[tokens[i]] = decimals_[i];
            emit PriceFeedRegistered(tokens[i], feeds[i], decimals_[i]);
        }
    }
}