// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {AgenticCommerceV9} from "../shared/AgenticCommerceV9.sol";
import {ServiceRegistryV2} from "../shared/ServiceRegistryV2.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

/**
 * @title TestFixtures
 * @dev Standard test fixtures for Kokonut contracts
 * Provides consistent setup for all test suites
 */
contract TestFixtures is Test {
    // Contract instances
    AgenticCommerceV9 public agenticCommerce;
    ServiceRegistryV2 public serviceRegistry;
    ServiceRegistryV2 public serviceRegistryImpl;
    
    // Mock USDC
    MockERC20 public usdc;
    
    // Mock price oracle for V9
    MockPriceOracle public priceOracle;
    
    // Test accounts
    address public owner;
    address public treasury;
    address public client;
    address public provider;
    address public evaluator;
    address public proposer;
    address public evaluator1;
    address public evaluator2;
    address public evaluator3;
    address public evaluator4;
    address public evaluator5;
    address public evaluator6;
    
    // Test constants
    uint256 constant INITIAL_ETH = 100 ether;
    uint256 constant INITIAL_USDC = 1_000_000_000; // 1000 USDC (6 decimals)
    uint256 constant MIN_STAKE = 0.001 ether;
    uint256 constant SERVICE_BOND = 0.01 ether;
    
    function setUp() public virtual {
        // Create test accounts
        owner = makeAddr("owner");
        treasury = makeAddr("treasury");
        client = makeAddr("client");
        provider = makeAddr("provider");
        evaluator = makeAddr("evaluator");
        proposer = makeAddr("proposer");
        evaluator1 = makeAddr("evaluator1");
        evaluator2 = makeAddr("evaluator2");
        evaluator3 = makeAddr("evaluator3");
        evaluator4 = makeAddr("evaluator4");
        evaluator5 = makeAddr("evaluator5");
        evaluator6 = makeAddr("evaluator6");
        
        // Fund accounts
        vm.deal(owner, INITIAL_ETH);
        vm.deal(treasury, INITIAL_ETH);
        vm.deal(client, INITIAL_ETH);
        vm.deal(provider, INITIAL_ETH);
        vm.deal(evaluator, INITIAL_ETH);
        vm.deal(proposer, INITIAL_ETH);
        vm.deal(evaluator1, INITIAL_ETH);
        vm.deal(evaluator2, INITIAL_ETH);
        vm.deal(evaluator3, INITIAL_ETH);
        vm.deal(evaluator4, INITIAL_ETH);
        vm.deal(evaluator5, INITIAL_ETH);
        vm.deal(evaluator6, INITIAL_ETH);
        
        // Deploy contracts as owner
        vm.startPrank(owner);
        
        // Deploy Mock USDC
        usdc = new MockERC20("USD Coin", "USDC", 6);
        
        // Deploy Mock Price Oracle
        priceOracle = new MockPriceOracle();
        
        // Deploy AgenticCommerceV9 with ERC1967Proxy (UUPS)
        AgenticCommerceV9 commerceImpl = new AgenticCommerceV9();
        bytes memory commerceInitData = abi.encodeCall(
            AgenticCommerceV9.initialize,
            (treasury, address(0), address(priceOracle))
        );
        ERC1967Proxy commerceProxy = new ERC1967Proxy(
            address(commerceImpl),
            commerceInitData
        );
        agenticCommerce = AgenticCommerceV9(payable(address(commerceProxy)));
        
        // Deploy ServiceRegistryV2 with proxy
        // Note: Identity registry must be a valid address for initialization
        serviceRegistryImpl = new ServiceRegistryV2();
        address identityReg = makeAddr("identityRegistry");
        ERC1967Proxy proxy = new ERC1967Proxy(
            address(serviceRegistryImpl),
            abi.encodeWithSelector(ServiceRegistryV2.initialize.selector, identityReg, owner)
        );
        serviceRegistry = ServiceRegistryV2(address(proxy));
        
        // Configure V9: Allow USDC and set as stablecoin
        agenticCommerce.setAllowedToken(address(usdc), true);
        agenticCommerce.setStablecoin(address(usdc), true);
        
        vm.stopPrank();
        
        // Fund client with USDC
        usdc.mint(client, INITIAL_USDC);
    }
    
    // Helper: Create a service
    function createTestService(
        address serviceProvider,
        string memory name,
        uint256 price
    ) internal returns (uint256 serviceId) {
        vm.prank(serviceProvider);
        serviceId = serviceRegistry.createService{value: SERVICE_BOND}(
            1, // agentId
            name,
            "Test service description",
            "",
            price,
            address(usdc),
            serviceProvider // paymentAddress (defaults to provider)
        );
    }
    
    // Helper: Create a job (V9 signature with budget at creation)
    function createTestJob(
        address jobClient,
        address jobProvider,
        address jobEvaluator
    ) internal returns (uint256 jobId) {
        vm.prank(jobClient);
        jobId = agenticCommerce.createJob(
            jobProvider,
            10 ether, // budget
            address(0), // paymentToken (ETH)
            0, // serviceId
            block.timestamp + 7 days, // expiredAt
            "Test job description",
            jobEvaluator,
            address(0), // hook
            false, // evaluatorFee
            false, // clientReview_
            false, // fundNow
            0 // fundAmount
        );
    }
    
    // Helper: Create a funded job with USDC
    function createFundedJobWithUSDC(
        address jobClient,
        address jobProvider,
        address jobEvaluator,
        uint256 budget
    ) internal returns (uint256 jobId) {
        // Approve USDC spend
        vm.prank(jobClient);
        usdc.approve(address(agenticCommerce), budget);
        
        vm.prank(jobClient);
        jobId = agenticCommerce.createJob(
            jobProvider,
            budget,
            address(usdc),
            0,
            block.timestamp + 7 days,
            "Test job description",
            jobEvaluator,
            address(0),
            false,
            false,
            true, // fundNow
            budget // fundAmount
        );
    }
    
    // Helper: Fund a job (separate fund step for unfunded jobs)
    function fundTestJob(
        address jobClient,
        uint256 jobId,
        uint256 amount
    ) internal {
        vm.startPrank(jobClient);
        usdc.approve(address(agenticCommerce), amount);
        agenticCommerce.fund{value: 0}(jobId, amount);
        vm.stopPrank();
    }
}

/**
 * @title MockERC20
 * @dev Simple ERC20 mock for testing
 */
contract MockERC20 {
    string public name;
    string public symbol;
    uint8 public decimals;
    uint256 public totalSupply;
    
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    
    constructor(string memory _name, string memory _symbol, uint8 _decimals) {
        name = _name;
        symbol = _symbol;
        decimals = _decimals;
    }
    
    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
        totalSupply += amount;
        emit Transfer(address(0), to, amount);
    }
    
    function transfer(address to, uint256 amount) external returns (bool) {
        require(balanceOf[msg.sender] >= amount, "Insufficient balance");
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        emit Transfer(msg.sender, to, amount);
        return true;
    }
    
    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }
    
    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        require(balanceOf[from] >= amount, "Insufficient balance");
        require(allowance[from][msg.sender] >= amount, "Insufficient allowance");
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        allowance[from][msg.sender] -= amount;
        emit Transfer(from, to, amount);
        return true;
    }
}

/**
 * @title MockERC721
 * @dev Simple ERC721 mock for testing
 */
contract MockERC721 {
    string public name;
    string public symbol;

    mapping(uint256 => address) private _owners;
    mapping(address => uint256) private _balances;

    constructor(string memory _name, string memory _symbol) {
        name = _name;
        symbol = _symbol;
    }

    function mint(address to, uint256 tokenId) external {
        require(_owners[tokenId] == address(0), "Token already minted");
        _owners[tokenId] = to;
        _balances[to]++;
    }

    function ownerOf(uint256 tokenId) external view returns (address) {
        return _owners[tokenId];
    }

    function balanceOf(address owner) external view returns (uint256) {
        return _balances[owner];
    }
}

/**
 * @title MockServiceRegistry
 * @dev Mock ServiceRegistry for testing createJobFromService
 */
contract MockServiceRegistry {
    struct Service {
        uint256 id;
        address provider;
        uint256 agentId;
        string name;
        string description;
        string metadataURI;
        uint256 price;
        address paymentToken;
        bool isActive;
        uint256 createdAt;
    }
    
    mapping(uint256 => Service) public services;
    uint256 public serviceCounter;
    
    event ServiceCreated(uint256 indexed serviceId, address indexed provider, uint256 indexed agentId, string name, uint256 price);
    event ServiceDeactivated(uint256 indexed serviceId);
    
    function createService(
        address provider,
        uint256 agentId,
        string calldata name,
        string calldata description,
        string calldata metadataURI,
        uint256 price,
        address paymentToken
    ) external returns (uint256 serviceId) {
        serviceId = ++serviceCounter;
        services[serviceId] = Service({
            id: serviceId,
            provider: provider,
            agentId: agentId,
            name: name,
            description: description,
            metadataURI: metadataURI,
            price: price,
            paymentToken: paymentToken,
            isActive: true,
            createdAt: block.timestamp
        });
        
        emit ServiceCreated(serviceId, provider, agentId, name, price);
    }
    
    function getService(uint256 serviceId) external view returns (Service memory) {
        return services[serviceId];
    }
    
    function deactivateService(uint256 serviceId) external {
        require(services[serviceId].provider == msg.sender, "Not provider");
        services[serviceId].isActive = false;
        emit ServiceDeactivated(serviceId);
    }
}

/**
 * @title MockAgenticCommerceV9
 * @dev Mock AgenticCommerceV9 for testing BiddingSystem integration
 */
contract MockAgenticCommerceV9 {
    uint256 public jobCounter;
    uint256 public platformTreasury;

    struct MockJob {
        uint256 id;
        address client;
        address provider;
        address evaluator;
        uint256 budget;
        uint256 expiredAt;
        bool funded;
    }

    mapping(uint256 => MockJob) public jobs;

    event JobCreated(uint256 indexed jobId, address indexed client, address indexed provider, address evaluator, uint256 expiredAt);
    event JobFunded(uint256 indexed jobId, uint256 amount);

    function createJob(
        address provider,
        uint256 budget,
        address, /* paymentToken */
        uint256, /* serviceId */
        uint256 expiredAt,
        string calldata,
        address evaluator,
        address, /* hook */
        bool, /* evaluatorFee */
        bool, /* clientReview_ */
        bool, /* fundNow */
        uint256 /* fundAmount */
    ) external payable returns (uint256 jobId) {
        jobId = ++jobCounter;
        jobs[jobId] = MockJob({
            id: jobId,
            client: msg.sender,
            provider: provider,
            evaluator: evaluator,
            budget: budget,
            expiredAt: expiredAt,
            funded: msg.value > 0
        });

        emit JobCreated(jobId, msg.sender, provider, evaluator, expiredAt);
    }

    function createJobForClient(
        address client,
        address provider,
        uint256 budget,
        address paymentToken,
        uint256, /* serviceId */
        uint256 expiredAt,
        string calldata,
        address evaluator,
        address, /* hook */
        bool, /* evaluatorFee */
        bool, /* clientReview_ */
        bool fundNow,
        uint256 fundAmount
    ) external payable returns (uint256 jobId) {
        bool funded = msg.value > 0;
        if (fundNow && fundAmount > 0) {
            if (paymentToken == address(0)) {
                require(msg.value >= fundAmount, "Insufficient ETH");
                funded = true;
            } else {
                require(IERC20(paymentToken).allowance(msg.sender, address(this)) >= fundAmount, "Insufficient allowance");
                require(IERC20(paymentToken).transferFrom(msg.sender, address(this), fundAmount), "Transfer failed");
                funded = true;
            }
        }

        jobId = ++jobCounter;
        jobs[jobId] = MockJob({
            id: jobId,
            client: client,
            provider: provider,
            evaluator: evaluator,
            budget: budget,
            expiredAt: expiredAt,
            funded: funded
        });

        emit JobCreated(jobId, client, provider, evaluator, expiredAt);
    }

    function setBudget(uint256 jobId, uint256 amount) external {
        jobs[jobId].budget = amount;
    }

    function fund(uint256 jobId, uint256) external payable {
        require(jobs[jobId].id != 0, "Invalid job");
        jobs[jobId].funded = true;
        emit JobFunded(jobId, msg.value);
    }

    function getJob(uint256 jobId) external view returns (MockJob memory) {
        return jobs[jobId];
    }
}

/**
 * @title MockPriceOracle
 * @dev Mock price oracle for testing AgenticCommerceV9
 * Returns fixed prices for testing (ETH = $2000, tokens = $1)
 */
contract MockPriceOracle {
    int256 public constant ETH_PRICE = 2000e8; // $2000 with 8 decimals
    int256 public constant ONE_USD = 1e8; // $1 with 8 decimals

    function getUsdPriceOfToken(address token) external pure returns (int256) {
        if (token == address(0)) {
            return ETH_PRICE;
        }
        return ONE_USD;
    }
}
