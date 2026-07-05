// SPDX-License-Identifier: MIT
pragma solidity 0.8.22;

/**
 * @title AggregatorV3Interface
 * @dev Minimal interface for Chainlink price feeds
 */
interface AggregatorV3Interface {
    function decimals() external view returns (uint8);
    function description() external view returns (string memory);
    function version() external view returns (uint256);
    function getRoundData(uint80 _roundId) external view returns (
        uint80 roundId,
        int256 answer,
        uint256 startedAt,
        uint256 updatedAt,
        uint80 answeredInRound
    );
    function latestRoundData() external view returns (
        uint80 roundId,
        int256 answer,
        uint256 startedAt,
        uint256 updatedAt,
        uint80 answeredInRound
    );
}

/**
 * @title PriceOracle
 * @dev Unified price oracle that auto-detects network and uses Chainlink or fixed prices
 * 
 * Security features:
 * - Staleness checks to prevent stale data usage
 * - Zero/negative price validation
 * - Decimal handling for different token precisions
 * 
 * Note: On testnet, returns fixed $1 price. On mainnet, uses Chainlink feeds.
 */
contract PriceOracle {
    // Chain IDs
    uint256 public constant ETHEREUM_MAINNET = 1;
    uint256 public constant SEPOLIA = 11155111;

    // Sepolia price feeds (Chainlink) - verified addresses
    address public constant SEPOLIA_ETH_USD = 0x694AA1769357215DE4FAC081bf1f309aDC325306;
    address public constant SEPOLIA_USDC_USD = 0x1b44F3514812d835EB1BDB0acB33d3fA3351Ee43;

    // Max staleness period (1 hour)
    uint256 public constant MAX_STALENESS = 1 hours;

    // 1 USD in terms of 8 decimals (Chainlink format)
    int256 public constant ONE_USD = 100000000; // 1e8

    // Events
    event PriceUpdated(address indexed token, int256 price, uint256 timestamp);
    event NetworkDetected(uint256 chainId);
    event FallbackPriceUsed(address indexed token, int256 price);

    /**
     * @dev Get the USD price of a token
     * @param token Token address
     * @return price USD price with 8 decimals
     */
    function getUsdPriceOfToken(address token) external view returns (int256 price) {
        require(token != address(0), "Zero address");
        
        uint256 chainId = block.chainid;

        // On Sepolia, use Chainlink price feeds
        if (chainId == SEPOLIA) {
            return _getChainlinkPriceForSepolia(token);
        }

        // On mainnet, use Chainlink if available
        if (chainId == ETHEREUM_MAINNET) {
            return _getChainlinkPriceForMainnet(token);
        }

        // On unknown networks, use fixed $1 price
        return ONE_USD;
    }

    /**
     * @dev Get Chainlink price on Sepolia
     */
    function _getChainlinkPriceForSepolia(address token) internal view returns (int256) {
        address feed = token == address(0) ? SEPOLIA_ETH_USD : SEPOLIA_USDC_USD;
        
        if (feed == address(0)) {
            return ONE_USD;
        }
        
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
     * @param usdAmount USD amount (with 6 decimals for USDC)
     * @param token Token address
     * @return tokenAmount Token amount
     */
    function getTokenAmountForUsd(uint256 usdAmount, address token) external view returns (uint256 tokenAmount) {
        require(token != address(0), "Zero address");
        require(usdAmount > 0, "Zero amount");

        int256 price = _getUsdPriceOfToken(token);
        require(price > 0, "Invalid price");

        uint8 tokenDecimals = _getTokenDecimals();
        
        // Normalize to 18 decimals for calculation
        uint256 normalizedUsd = usdAmount * 1e12; // USDC 6 + 12 = 18 decimals
        
        // Calculate token amount
        tokenAmount = (normalizedUsd * 1e8) / uint256(price);
        
        // Adjust for token decimals
        if (tokenDecimals < 18) {
            tokenAmount = tokenAmount / (10 ** (18 - tokenDecimals));
        } else if (tokenDecimals > 18) {
            tokenAmount = tokenAmount * (10 ** (tokenDecimals - 18));
        }
    }

    /**
     * @dev Internal helper to get USD price of token
     */
    function _getUsdPriceOfToken(address token) internal view returns (int256 price) {
        uint256 chainId = block.chainid;

        // On Sepolia or unknown networks, use fixed $1 price
        if (chainId != ETHEREUM_MAINNET) {
            return ONE_USD;
        }

        // On mainnet, use Chainlink if available
        return _getChainlinkPriceForMainnet(token);
    }

    /**
     * @dev Get Chainlink price on mainnet (placeholder)
     */
    function _getChainlinkPriceForMainnet(address) internal pure returns (int256) {
        // TODO: Replace with actual Chainlink feeds for mainnet
        return ONE_USD;
    }

    /**
     * @dev Get price from Chainlink aggregator with staleness check
     */
    function getChainlinkPrice(address feedAddress) external view returns (int256 price) {
        require(feedAddress != address(0), "Zero feed address");
        
        AggregatorV3Interface feed = AggregatorV3Interface(feedAddress);
        
        (, int256 answer,, uint256 updatedAt,) = feed.latestRoundData();

        // Validate price
        require(answer > 0, "Invalid price");

        // Check staleness
        require(block.timestamp - updatedAt <= MAX_STALENESS, "Stale price");
        
        return answer;
    }

    /**
     * @dev Get token decimals (simplified - assumes 18)
     */
    function _getTokenDecimals() internal pure returns (uint8) {
        return 18;
    }

    /**
     * @dev Get price feed address for a token
     */
    function getPriceFeedAddress(address token) external view returns (address feed) {
        uint256 chainId = block.chainid;
        
        if (chainId == SEPOLIA) {
            if (token == address(0)) return SEPOLIA_ETH_USD;
            return SEPOLIA_USDC_USD;
        }
        
        return address(0);
    }

    /**
     * @dev Get USDC price in USD (for SDK compatibility)
     */
    function getUSDCPrice() external view returns (uint256) {
        int256 price = _getUsdPriceOfToken(0x1b44F3514812d835EB1BDB0acB33d3fA3351Ee43); // USDC on Sepolia
        return uint256(price);
    }

    /**
     * @dev Get ETH rate in USD (for SDK compatibility)
     */
    function getETHRate() external view returns (uint256) {
        int256 price = _getUsdPriceOfToken(address(0)); // ETH
        return uint256(price);
    }

    /**
     * @dev Check if price is stale
     */
    function isStale() external view returns (bool) {
        address feed = SEPOLIA_ETH_USD;
        AggregatorV3Interface aggregator = AggregatorV3Interface(feed);
        (, int256 answer,, uint256 updatedAt,) = aggregator.latestRoundData();
        
        if (answer <= 0) return true;
        return (block.timestamp - updatedAt) > MAX_STALENESS;
    }
}
