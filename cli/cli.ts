#!/usr/bin/env tsx
/**
 * Kokonut Agent CLI - Command Line Interface
 */

import { Command } from 'commander';
import { ethers } from 'ethers';
import chalk from 'chalk';
import * as dotenv from 'dotenv';
import { NETWORKS, type NetworkName } from '../config/networks';

// Load environment variables
dotenv.config();

// Configuration
const config = {
  network: (process.env.NETWORK as NetworkName) || 'sepolia',
  get networkConfig() {
    return NETWORKS[this.network];
  },
  rpcUrl: '',
  provider: null as null | ethers.JsonRpcProvider,
  signer: null as null | ethers.Wallet,

  get contracts() {
    return this.networkConfig.contracts;
  },
};

// Initialize provider and signer
function initWallet() {
  if (!process.env.PRIVATE_KEY) {
    console.error(
      chalk.red('❌ Private key not found. Please set PRIVATE_KEY environment variable.')
    );
    process.exit(1);
  }

  config.rpcUrl = config.networkConfig.rpcUrl;
  const provider = new ethers.JsonRpcProvider(config.rpcUrl);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

  config.provider = provider;
  config.signer = wallet;

  console.log(chalk.green('✅ Wallet initialized:'), wallet.address);
  console.log(
    chalk.cyan('Network:'),
    config.networkConfig.name,
    `(chainId: ${config.networkConfig.chainId})`
  );
}

// Create CLI program
const program = new Command();

program
  .name('kokonut')
  .description('Kokonut Agent Economy Stack CLI - Agent-friendly blockchain interactions')
  .version('0.1.0')
  .option('-n, --network <network>', 'Network to use (sepolia|mainnet)', 'sepolia')
  .option('-j, --json', 'Output results as JSON')
  .hook('preAction', thisCommand => {
    const opts = thisCommand.opts();
    config.network = opts.network as NetworkName;
    if (!NETWORKS[config.network]) {
      console.error(chalk.red(`❌ Unknown network: ${opts.network}`));
      console.error(chalk.cyan('Available networks:'), Object.keys(NETWORKS).join(', '));
      process.exit(1);
    }
  });

// 🎯 REGISTER AGENT COMMAND
program
  .command('register-agent')
  .description('Register a new agent with ERC-8004 identity')
  .option('--name <string>', 'Agent name')
  .option(
    '--capabilities <string>',
    'Comma-separated capabilities (e.g., coordination,identity-management)'
  )
  .option('--skills <string>', 'Comma-separated skills (e.g., hermes-agent,identity-management)')
  .option('--framework <string>', 'Agent framework (default: Hermes Agent)')
  .option('--model <string>', 'AI model (default: qwen3-5-35b-a3b)')
  .option('--metadata <string>', 'Additional metadata (JSON string)')
  .action(async options => {
    try {
      initWallet();

      if (
        !config.contracts.identityRegistry ||
        config.contracts.identityRegistry === ethers.ZeroAddress
      ) {
        console.log(chalk.yellow('⚠️  Identity Registry not deployed yet.'));
        console.log(chalk.cyan('Deploy first:'));
        console.log(
          chalk.cyan(
            '  forge create contracts/shared/AgentIdentityRegistry.sol:AgentIdentityRegistry --rpc-url $ETHEREUM_RPC_URL --private-key $PRIVATE_KEY --verify --etherscan-api-key $ETHERSCAN_API_KEY --chain mainnet'
          )
        );
        console.log(chalk.cyan('Then update contracts.identityRegistry in config'));
        return;
      }

      // Initialize contract
      const identityRegistryABI = [
        'function register() external returns (uint256 agentId)',
        'function register(string agentURI) external returns (uint256 agentId)',
        'function registerWithMetadata(string agentURI, tuple(string metadataKey, bytes metadataValue)[] metadata) external returns (uint256 agentId)',
        'function resolveAgent(address agentAddress) external view returns (uint256 agentId, string memory agentURI)',
        'function getAgent(uint256 agentId) external view returns (address owner, string memory agentURI, address agentWallet, bool isActive)',
        'function isAgent(address agentAddress) external view returns (bool)',
        'function getCurrentAgentId() external view returns (uint256)',
        'function setAgentURI(uint256 agentId, string newURI) external',
        'function getMetadata(uint256 agentId, string metadataKey) external view returns (bytes)',
        'function setMetadata(uint256 agentId, string metadataKey, bytes metadataValue) external',
        'function getAgentWallet(uint256 agentId) external view returns (address)',
        'function setAgentWallet(uint256 agentId, address newWallet, uint256 deadline, bytes signature) external',
        'function unsetAgentWallet(uint256 agentId) external',
        'event Registered(uint256 indexed agentId, string agentURI, address indexed owner)',
        'event URIUpdated(uint256 indexed agentId, string newURI, address indexed updatedBy)',
        'event MetadataSet(uint256 indexed agentId, string indexed indexedMetadataKey, string metadataKey, bytes metadataValue)',
        'event AgentWalletSet(uint256 indexed agentId, address indexed newWallet)',
      ];

      const identityRegistry = new ethers.Contract(
        config.contracts.identityRegistry,
        identityRegistryABI,
        config.signer
      );

      // Prepare agent data
      const agentName = options.name || `Agent_${config.signer.address.slice(2, 10)}`;
      const capabilities = options.capabilities
        ? options.capabilities.split(',')
        : ['coordination'];
      const skills = options.skills ? options.skills.split(',') : ['hermes-agent'];

      console.log(chalk.cyan('\n🌴 Creating Agent Identity...'));
      console.log(chalk.dim('Agent Name:'), agentName);
      console.log(chalk.dim('Wallet:'), config.signer.address);
      console.log(chalk.dim('Capabilities:'), capabilities.join(', '));
      console.log(chalk.dim('Skills:'), skills.join(', '));

      // Prepare metadata
      const metadata = {
        agentId: `eip155:8453:${config.signer.address}`,
        name: agentName,
        description: 'AI agent for onchain economy coordination',
        owner: config.signer.address,
        capabilities: capabilities,
        skills: skills,
        framework: options.framework || 'Hermes Agent',
        model: options.model || 'qwen3-5-35b-a3b',
        createdAt: new Date().toISOString(),
        metadata: {
          social: {
            email: 'wasabi@kokonut.network',
            twitter: '@SyntropicAgent',
          },
        },
      };

      // Add additional metadata if provided
      if (options.metadata) {
        try {
          const extraMetadata = JSON.parse(options.metadata);
          Object.assign(metadata, extraMetadata);
        } catch (e) {
          console.warn(chalk.yellow('⚠️  Could not parse custom metadata'), e.message);
        }
      }

      // Store metadata - use data:URI for ERC-8004 compliance (base64 encoded JSON)
      const metadataJSON = JSON.stringify(metadata, null, 2);
      const metadataBase64 = Buffer.from(metadataJSON).toString('base64');
      const metadataURI = `data:application/json;base64,${metadataBase64}`;
      console.log(chalk.dim('Metadata URI:'), metadataURI.substring(0, 50) + '...');

      // Register agent (ERC-8004 compliant)
      console.log('\n' + chalk.cyan('📝 Registering agent on-chain...'));
      const tx = await identityRegistry.register(metadataURI);
      console.log(chalk.cyan('Transaction sent:'), tx.hash);

      const receipt = await tx.wait();
      console.log(chalk.green('✅ Agent registered successfully!'));
      console.log(chalk.cyan('Gas used:'), receipt.gasUsed.toString());

      // Get event data
      let agentId;
      for (const log of receipt.logs) {
        try {
          const parsed = identityRegistry.interface.parseLog(log);
          if (parsed && parsed.name === 'Registered') {
            agentId = parsed.args.agentId.toString();
            break;
          }
        } catch (e) {
          // Ignore non-relevant logs
        }
      }

      if (agentId) {
        console.log(chalk.green('\n🎊 Agent Identity Created!'));
        console.log(chalk.cyan('Agent ID:'), agentId);
        console.log(chalk.cyan('Contract:'), config.contracts.identityRegistry);

        // Verify registration
        const agent = await identityRegistry.getAgent(agentId);
        console.log('\n' + chalk.cyan('🔍 Verification:'));
        console.log(chalk.dim('Owner:'), agent[0]);
        console.log(chalk.dim('URI:'), agent[1].substring(0, 50) + '...');
        console.log(chalk.dim('Wallet:'), agent[2]);
        console.log(chalk.dim('Active:'), agent[3]);
      }
    } catch (error) {
      console.error(chalk.red('❌ Error registering agent:'), error.message || error);
    }
  });

// 🎯 RESOLVE AGENT COMMAND
program
  .command('resolve-agent')
  .description('Resolve agent identity from wallet address')
  .argument('<address>', 'Agent wallet address')
  .action(async target => {
    try {
      initWallet();

      if (
        !config.contracts.identityRegistry ||
        config.contracts.identityRegistry === ethers.ZeroAddress
      ) {
        console.log(chalk.yellow('⚠️  Identity Registry not deployed yet.'));
        return;
      }

      const identityRegistryABI = [
        'function resolveAgent(address agentAddress) external view returns (uint256 tokenId, string memory did)',
        'function getAgent(uint256 tokenId) external view returns (address owner, string memory did, string memory metadataURI)',
        'function isAgent(address agentAddress) external view returns (bool)',
      ];

      const identityRegistry = new ethers.Contract(
        config.contracts.identityRegistry,
        identityRegistryABI,
        config.provider
      );

      const address = target;

      if (!(await identityRegistry.isAgent(address))) {
        console.log(chalk.yellow('⚠️  Address is not a registered agent'));
        return;
      }

      const result = await identityRegistry.resolveAgent(address);
      const tokenId = result.tokenId.toString();
      const did = result.did;

      // Get full agent info
      const agent = await identityRegistry.getAgent(tokenId);

      console.log(chalk.green('\n🔍 Agent Identity Resolved:'));
      console.log(chalk.cyan('Address:'), address);
      console.log(chalk.cyan('Token ID:'), tokenId);
      console.log(chalk.cyan('Owner:'), agent[0]);
      console.log(chalk.cyan('Metadata:'), agent[2]);

      // Try to fetch metadata from IPFS (placeholder)
      console.log(chalk.cyan('\n📄 Metadata:'));
      console.log(chalk.dim('TODO: Fetch from IPFS using CID'), agent[2]);
    } catch (error) {
      console.error(chalk.red('❌ Error resolving agent:'), error.message);
      process.exit(1);
    }
  });

// 🎯 LIST AGENTS COMMAND
program
  .command('list-agents')
  .description('List all registered agents')
  .option('--json', 'Output as JSON')
  .action(async options => {
    try {
      initWallet();

      if (
        !config.contracts.identityRegistry ||
        config.contracts.identityRegistry === ethers.ZeroAddress
      ) {
        console.log(chalk.yellow('⚠️  Identity Registry not deployed yet.'));
        return;
      }

      const identityRegistryABI = [
        'function getAgentCount() external view returns (uint256)',
        'function getCurrentTokenId() external view returns (uint256)',
        'function getAgent(uint256 tokenId) external view returns (address owner, string memory did, string memory metadataURI)',
        'function isAgent(address agentAddress) external view returns (bool)',
      ];

      const identityRegistry = new ethers.Contract(
        config.contracts.identityRegistry,
        identityRegistryABI,
        config.provider
      );

      const count = await identityRegistry.getAgentCount();
      console.log(chalk.green(`\n📊 Total Agents: ${count.toString()}`));

      if (count === 0n) {
        console.log(chalk.dim('No agents registered yet.'));
        return;
      }

      const agents = [];
      for (let i = 1n; i <= count; i++) {
        const agent = await identityRegistry.getAgent(i);
        agents.push({
          tokenId: i.toString(),
          owner: agent[0],
          did: agent[1],
          metadataURI: agent[2],
        });
      }

      if (options.json) {
        console.log(JSON.stringify(agents, null, 2));
      } else {
        console.log('\n' + '='.repeat(80));
        for (const agent of agents) {
          console.log(chalk.cyan(`\nAgent #${agent.tokenId}:`));
          console.log(chalk.dim('DID:'), agent.did);
          console.log(chalk.dim('Owner:'), agent.owner);
          console.log(chalk.dim('Metadata:'), agent.metadataURI);
          console.log('-'.repeat(80));
        }
      }
    } catch (error) {
      console.error(chalk.red('❌ Error listing agents:'), error.message);
      process.exit(1);
    }
  });

// 🎯 ADD REPUTATION COMMAND (Submit feedback)
program
  .command('add-reputation')
  .description('Submit feedback/reputation for an agent')
  .argument('<agent-address>', 'Agent wallet address')
  .option('--rating <number>', 'Rating (0-1000)', '85')
  .option('--task-id <string>', 'Task ID that was completed')
  .option('--comment <string>', 'Feedback comment')
  .option('--metadata <string>', 'Additional metadata (JSON string)')
  .action(async (agentTarget, options) => {
    try {
      initWallet();

      if (
        !config.contracts.reputationRegistry ||
        config.contracts.reputationRegistry === ethers.ZeroAddress
      ) {
        console.log(chalk.yellow('⚠️  Reputation Registry not deployed yet.'));
        console.log(chalk.cyan('Deploy first:'));
        console.log(
          chalk.cyan(
            '  forge create contracts/shared/AgentReputationRegistry.sol:AgentReputationRegistry --rpc-url $BASE_RPC_URL --private-key $PRIVATE_KEY --verify --etherscan-api-key $ETHERSCAN_API_KEY'
          )
        );
        return;
      }

      const reputationRegistryABI = [
        'function submitFeedback(address agent, uint256 taskId, int256 rating, string calldata metadataURI) external returns (uint256 feedbackId)',
      ];

      const reputationRegistry = new ethers.Contract(
        config.contracts.reputationRegistry,
        reputationRegistryABI,
        config.signer
      );

      const agentAddress = agentTarget;

      console.log(chalk.cyan('\n🌟 Submitting Reputation:'));
      console.log(chalk.dim('Agent:'), agentAddress);
      console.log(chalk.dim('Task ID:'), options.taskId || 'N/A');
      console.log(chalk.dim('Rating:'), options.rating);
      console.log(chalk.dim('Comment:'), options.comment || 'N/A');

      // Prepare metadata
      const metadata = {
        rating: options.rating,
        comment: options.comment || '',
        taskId: options.taskId || '',
        timestamp: new Date().toISOString(),
        feedbackProvider: config.signer?.address,
      };

      if (options.metadata) {
        try {
          const extraMetadata = JSON.parse(options.metadata);
          Object.assign(metadata, extraMetadata);
        } catch (err) {
          console.warn(chalk.yellow('⚠️  Could not parse custom metadata'));
        }
      }

      const metadataJSON = JSON.stringify(metadata, null, 2);
      const metadataCID = `data:application/json;base64,${Buffer.from(metadataJSON).toString('base64')}`;

      const taskId = options.taskId ? parseInt(options.taskId) : 1;
      const rating = parseInt(options.rating);

      console.log('\n' + chalk.cyan('📝 Submitting feedback...'));
      const tx = await reputationRegistry.submitFeedback(agentAddress, taskId, rating, metadataCID);

      console.log(chalk.cyan('Transaction sent:'), tx.hash);

      const receipt = await tx.wait();
      console.log(chalk.green('✅ Feedback submitted successfully!'));
      console.log(chalk.cyan('Gas used:'), receipt.gasUsed.toString());

      // Get feedback ID from events
      let feedbackId;
      for (const log of receipt.logs) {
        try {
          const parsed = reputationRegistry.interface.parseLog(log);
          if (parsed && parsed.name === 'FeedbackSubmitted') {
            feedbackId = parsed.args.feedbackId.toString();
            break;
          }
        } catch {
          // Ignore non-relevant logs
        }
      }

      if (feedbackId) {
        console.log(chalk.green('\n🎊 Feedback ID:'), feedbackId);
      }
    } catch (error) {
      console.error(chalk.red('❌ Error submitting reputation:'), (error as Error).message);
      if ((error as { reason?: string }).reason) {
        console.error(chalk.red('Reason:'), (error as { reason: string }).reason);
      }
      process.exit(1);
    }
  });

// 🎯 GET REPUTATION COMMAND
program
  .command('get-reputation')
  .description('Get agent reputation')
  .argument('<agent-address>', 'Agent wallet address')
  .action(async agentTarget => {
    try {
      initWallet();

      if (
        !config.contracts.reputationRegistry ||
        config.contracts.reputationRegistry === ethers.ZeroAddress
      ) {
        console.log(chalk.yellow('⚠️  Reputation Registry not deployed yet.'));
        return;
      }

      const reputationRegistryABI = [
        'function getAgentReputation(address agent) external view returns (int256 averageRating, uint256 totalFeedbacks, uint256 uniqueProviders)',
      ];

      const reputationRegistry = new ethers.Contract(
        config.contracts.reputationRegistry,
        reputationRegistryABI,
        config.provider
      );

      const agentAddress = agentTarget;

      const [averageRating, totalFeedbacks, uniqueProviders] =
        await reputationRegistry.getAgentReputation(agentAddress);

      console.log(chalk.green('\n📊 Agent Reputation:'));
      console.log(chalk.cyan('Address:'), agentAddress);
      console.log(chalk.cyan('Average Rating:'), averageRating.toString(), '/ 1000');
      console.log(chalk.cyan('Total Feedbacks:'), totalFeedbacks.toString());
      console.log(chalk.cyan('Unique Providers:'), uniqueProviders.toString());

      // Convert to percentage
      const percentage = parseFloat(averageRating.toString()) / 10;
      console.log(chalk.cyan('Score:'), percentage.toFixed(1) + '%');
    } catch (error) {
      console.error(chalk.red('❌ Error getting reputation:'), (error as Error).message);
      process.exit(1);
    }
  });

// 🎯 VERIFY AGENT COMMAND (Verify agent registration)
program
  .command('verify-agent')
  .description('Verify if an address is a registered agent')
  .argument('<address>', 'Agent wallet address')
  .action(async targetAddress => {
    try {
      initWallet();

      if (
        !config.contracts.identityRegistry ||
        config.contracts.identityRegistry === ethers.ZeroAddress
      ) {
        console.log(chalk.yellow('⚠️  Identity Registry not deployed yet.'));
        return;
      }

      const identityRegistryABI = [
        'function isAgent(address agentAddress) external view returns (bool)',
        'function getAgentCount() external view returns (uint256)',
      ];

      const identityRegistry = new ethers.Contract(
        config.contracts.identityRegistry,
        identityRegistryABI,
        config.provider
      );

      const isRegistered = await identityRegistry.isAgent(targetAddress);
      const agentCount = await identityRegistry.getAgentCount();

      console.log(chalk.green('\n🔍 Agent Verification:'));
      console.log(chalk.cyan('Address:'), targetAddress);
      console.log(
        chalk.cyan('Registered:'),
        isRegistered ? chalk.green('✅ Yes') : chalk.red('❌ No')
      );
      console.log(chalk.cyan('Total Agents:'), agentCount.toString());

      if (isRegistered) {
        console.log(chalk.green('\n✅ This address is a registered agent in the Kokonut economy!'));
      } else {
        console.log(chalk.yellow('\n⚠️  This address is not registered. Register with:'));
        console.log(chalk.cyan('  npm run cli -- register-agent --name "YourAgent"'));
      }
    } catch (error) {
      console.error(chalk.red('❌ Error verifying agent:'), error.message);
      process.exit(1);
    }
  });

// 🎯 CREATE SERVICE COMMAND
program
  .command('create-service')
  .description('Create a new service listing')
  .option('--agent-id <number>', 'Agent ID (required)')
  .option('--name <string>', 'Service name')
  .option('--description <string>', 'Service description')
  .option('--price <number>', 'Service price in USDC (wei)', '1000000') // 1 USDC = 1e6
  .option('--metadata <string>', 'Metadata URI (IPFS)')
  .action(async options => {
    try {
      initWallet();

      if (!options.agentId) {
        console.log(chalk.red('❌ --agent-id is required. Use --agent-id <number>'));
        console.log(chalk.cyan('Example:'));
        console.log(
          chalk.cyan('  kokonut create-service --agent-id 1 --name "My Service" --price 1000000')
        );
        return;
      }

      if (
        !config.contracts.serviceRegistry ||
        config.contracts.serviceRegistry === ethers.ZeroAddress
      ) {
        console.log(chalk.yellow('⚠️  Service Registry not deployed yet.'));
        console.log(chalk.cyan('Deploy first:'));
        console.log(
          chalk.cyan(
            '  forge create contracts/shared/ServiceRegistry.sol:ServiceRegistry --rpc-url $ETHEREUM_RPC_URL --private-key $PRIVATE_KEY --verify --etherscan-api-key $ETHERSCAN_API_KEY --chain mainnet'
          )
        );
        return;
      }

      const serviceRegistryABI = [
        'function createService(uint256 agentId, string calldata name, string calldata description, string calldata metadataURI, uint256 price, address paymentToken) external returns (uint256 serviceId)',
        'function getService(uint256 serviceId) external view returns (tuple(uint256 id, address provider, uint256 agentId, string name, string description, string metadataURI, uint256 price, address paymentToken, bool isActive, uint256 createdAt))',
      ];

      const serviceRegistry = new ethers.Contract(
        config.contracts.serviceRegistry,
        serviceRegistryABI,
        config.signer
      );

      const agentId = BigInt(options.agentId);
      const name = options.name || 'Agent Service';
      const description = options.description || 'AI agent service';
      const metadataURI = options.metadata || `ipfs://${config.signer.address}`;
      const price = options.price ? BigInt(options.price) : 1000000n; // Default 1 USDC
      const paymentToken = config.contracts.usdc;

      console.log(chalk.cyan('\n🛠️  Creating Service:'));
      console.log(chalk.dim('Agent ID:'), agentId.toString());
      console.log(chalk.dim('Name:'), name);
      console.log(chalk.dim('Description:'), description);
      console.log(chalk.dim('Price:'), price.toString(), 'wei');
      console.log(chalk.dim('Payment Token:'), paymentToken);

      const tx = await serviceRegistry.createService(
        agentId,
        name,
        description,
        metadataURI,
        price,
        paymentToken
      );

      console.log(chalk.cyan('Transaction sent:'), tx.hash);

      const receipt = await tx.wait();
      console.log(chalk.green('✅ Service created successfully!'));
      console.log(chalk.cyan('Gas used:'), receipt.gasUsed.toString());

      let serviceId;
      for (const log of receipt.logs) {
        try {
          const parsed = serviceRegistry.interface.parseLog(log);
          if (parsed && parsed.name === 'ServiceCreated') {
            serviceId = parsed.args.serviceId.toString();
            break;
          }
        } catch (e) {
          /* ignore */
        }
      }

      if (serviceId) {
        console.log(chalk.green('\n🎊 Service ID:'), serviceId);
      }
    } catch (error) {
      console.error(chalk.red('❌ Error creating service:'), error.message);
      if (error.reason) console.error(chalk.red('Reason:'), error.reason);
      process.exit(1);
    }
  });

// 🎯 LIST SERVICES COMMAND
program
  .command('list-services')
  .description('List all available services')
  .option('--start <number>', 'Start index', '0')
  .option('--count <number>', 'Number of services to list', '10')
  .option('--json', 'Output as JSON')
  .action(async options => {
    try {
      initWallet();

      if (
        !config.contracts.serviceRegistry ||
        config.contracts.serviceRegistry === ethers.ZeroAddress
      ) {
        console.log(chalk.yellow('⚠️  Service Registry not deployed yet.'));
        return;
      }

      const serviceRegistryABI = [
        'function getServiceCount() external view returns (uint256)',
        'function getServices(uint256 start, uint256 count) external view returns (uint256[] memory)',
        'function getService(uint256 serviceId) external view returns (tuple(uint256 id, address provider, string name, string description, string metadataURI, uint256 price, address paymentToken, bool isActive, uint256 createdAt))',
      ];

      const serviceRegistry = new ethers.Contract(
        config.contracts.serviceRegistry,
        serviceRegistryABI,
        config.provider
      );

      const start = parseInt(options.start);
      const count = parseInt(options.count);

      const serviceIds = await serviceRegistry.getServices(start, count);

      console.log(chalk.green(`\n📋 Available Services (${serviceIds.length} shown):`));

      const services = [];
      for (const id of serviceIds) {
        try {
          const service = await serviceRegistry.getService(id);
          services.push({
            id: service.id.toString(),
            provider: service.provider,
            name: service.name,
            description: service.description,
            price: service.price.toString(),
            isActive: service.isActive,
          });
        } catch (e) {
          /* skip invalid */
        }
      }

      if (options.json) {
        console.log(JSON.stringify(services, null, 2));
      } else {
        for (const s of services) {
          const priceDisplay = (parseInt(s.price) / 1e6).toFixed(2);
          console.log(chalk.cyan(`\nService #${s.id}:`));
          console.log(chalk.dim('  Name:'), s.name);
          console.log(chalk.dim('  Provider:'), s.provider);
          console.log(chalk.dim('  Price:'), `$${priceDisplay} USDC`);
          console.log(chalk.dim('  Active:'), s.isActive ? '✅' : '❌');
          console.log('-'.repeat(50));
        }
      }
    } catch (error) {
      console.error(chalk.red('❌ Error listing services:'), error.message);
      process.exit(1);
    }
  });

// 🎯 BUY SERVICE COMMAND
program
  .command('buy-service')
  .description('Purchase a service and create a job')
  .argument('<service-id>', 'Service ID to purchase')
  .option('--evaluator <address>', 'Evaluator address for job approval')
  .option('--expiry <number>', 'Job expiry in days', '7')
  .action(async (serviceId, options) => {
    try {
      initWallet();

      if (
        !config.contracts.agenticCommerce ||
        config.contracts.agenticCommerce === ethers.ZeroAddress
      ) {
        console.log(chalk.yellow('⚠️  Agentic Commerce not deployed yet.'));
        console.log(chalk.cyan('Deploy first:'));
        console.log(
          chalk.cyan(
            '  forge create contracts/shared/AgenticCommerce.sol:AgenticCommerce --rpc-url $ETHEREUM_RPC_URL --private-key $PRIVATE_KEY --verify --etherscan-api-key $ETHERSCAN_API_KEY --chain mainnet'
          )
        );
        return;
      }

      const serviceRegistryABI = [
        'function getService(uint256 serviceId) external view returns (tuple(uint256 id, address provider, string name, string description, string metadataURI, uint256 price, address paymentToken, bool isActive, uint256 createdAt))',
      ];

      const agenticCommerceABI = [
        'function createJob(address provider, address evaluator, uint256 expiredAt, string calldata description, address hook) external returns (uint256 jobId)',
        'function setBudget(uint256 jobId, uint256 amount) external',
        'function fund(uint256 jobId) external',
        'function getJob(uint256 jobId) external view returns (tuple(uint256 id, address client, address provider, address evaluator, string description, uint256 budget, uint256 expiredAt, uint8 status, address hook, bytes32 deliverable))',
      ];

      const serviceRegistry = new ethers.Contract(
        config.contracts.serviceRegistry,
        serviceRegistryABI,
        config.provider
      );

      const commerce = new ethers.Contract(
        config.contracts.agenticCommerce,
        agenticCommerceABI,
        config.signer
      );

      const service = await serviceRegistry.getService(parseInt(serviceId));

      if (!service.isActive) {
        console.log(chalk.red('❌ Service is not active'));
        return;
      }

      console.log(chalk.cyan('\n🛒 Purchasing Service:'));
      console.log(chalk.dim('Service ID:'), serviceId);
      console.log(chalk.dim('Name:'), service.name);
      console.log(chalk.dim('Provider:'), service.provider);
      console.log(chalk.dim('Price:'), service.price.toString(), 'wei');

      const evaluator = options.evaluator || service.provider;
      const expiryDays = parseInt(options.expiry);
      const expiredAt = Math.floor(Date.now() / 1000) + expiryDays * 24 * 60 * 60;

      console.log(chalk.cyan('\n📝 Creating Job...'));

      const jobTx = await commerce.createJob(
        service.provider,
        evaluator,
        expiredAt,
        `Purchase: ${service.name}`,
        '0x0000000000000000000000000000000000000000'
      );

      let jobId;
      const jobReceipt = await jobTx.wait();
      for (const log of jobReceipt.logs) {
        try {
          const parsed = commerce.interface.parseLog(log);
          if (parsed && parsed.name === 'JobCreated') {
            jobId = parsed.args.jobId.toString();
            break;
          }
        } catch (e) {
          /* ignore */
        }
      }

      console.log(chalk.green('✅ Job Created!'));
      console.log(chalk.cyan('Job ID:'), jobId);

      console.log(chalk.cyan('\n💰 Setting budget...'));
      const budgetTx = await commerce.setBudget(jobId, service.price);
      await budgetTx.wait();

      console.log(chalk.green('✅ Budget set!'));
      console.log(chalk.cyan('Now approve USDC and fund the job:'));
      console.log(chalk.dim(`  npx kokonut fund-job ${jobId}`));
    } catch (error) {
      console.error(chalk.red('❌ Error buying service:'), error.message);
      if (error.reason) console.error(chalk.red('Reason:'), error.reason);
      process.exit(1);
    }
  });

// 🎯 FUND JOB COMMAND
program
  .command('fund-job')
  .description('Fund an existing job with payment')
  .argument('<job-id>', 'Job ID to fund')
  .action(async (jobId, _options) => {
    try {
      initWallet();

      if (
        !config.contracts.agenticCommerce ||
        config.contracts.agenticCommerce === ethers.ZeroAddress
      ) {
        console.log(chalk.yellow('⚠️  Agentic Commerce not deployed yet.'));
        return;
      }

      const agenticCommerceABI = [
        'function fund(uint256 jobId) external',
        'function getJob(uint256 jobId) external view returns (tuple(uint256 id, address client, address provider, address evaluator, string description, uint256 budget, uint256 expiredAt, uint8 status, address hook, bytes32 deliverable))',
      ];

      const commerce = new ethers.Contract(
        config.contracts.agenticCommerce,
        agenticCommerceABI,
        config.signer
      );

      const job = await commerce.getJob(jobId);

      console.log(chalk.cyan('\n💰 Funding Job:'));
      console.log(chalk.dim('Job ID:'), jobId);
      console.log(chalk.dim('Budget:'), job.budget.toString(), 'wei');
      console.log(chalk.dim('Client:'), job.client);

      console.log(chalk.cyan('\n⚠️  Note: Ensure you have approved USDC spending first:'));
      console.log(chalk.dim('  Approve:'), config.contracts.agenticCommerce);
      console.log(chalk.dim('  Amount:'), job.budget.toString());

      const tx = await commerce.fund(jobId);
      console.log(chalk.cyan('Transaction sent:'), tx.hash);

      await tx.wait();
      console.log(chalk.green('✅ Job funded successfully!'));
      console.log(chalk.cyan('Provider can now submit their deliverable.'));
    } catch (error) {
      console.error(chalk.red('❌ Error funding job:'), error.message);
      if (error.reason) console.error(chalk.red('Reason:'), error.reason);
      process.exit(1);
    }
  });

// 🎯 SUBMIT DELIVERABLE COMMAND
program
  .command('submit-deliverable')
  .description('Submit work deliverable for a job')
  .argument('<job-id>', 'Job ID')
  .argument('<deliverable-hash>', 'Hash of delivered work (IPFS CID or hash)')
  .action(async (jobId, deliverableHash, _options) => {
    try {
      initWallet();

      if (
        !config.contracts.agenticCommerce ||
        config.contracts.agenticCommerce === ethers.ZeroAddress
      ) {
        console.log(chalk.yellow('⚠️  Agentic Commerce not deployed yet.'));
        return;
      }

      const agenticCommerceABI = [
        'function submit(uint256 jobId, bytes32 deliverable) external',
        'function getJob(uint256 jobId) external view returns (tuple(uint256 id, address client, address provider, address evaluator, string description, uint256 budget, uint256 expiredAt, uint8 status, address hook, bytes32 deliverable))',
      ];

      const commerce = new ethers.Contract(
        config.contracts.agenticCommerce,
        agenticCommerceABI,
        config.signer
      );

      const deliverableBytes32 = ethers.id(deliverableHash);

      console.log(chalk.cyan('\n📦 Submitting Deliverable:'));
      console.log(chalk.dim('Job ID:'), jobId);
      console.log(chalk.dim('Deliverable Hash:'), deliverableHash);
      console.log(chalk.dim('Bytes32:', deliverableBytes32));

      const tx = await commerce.submit(jobId, deliverableBytes32);
      console.log(chalk.cyan('Transaction sent:'), tx.hash);

      await tx.wait();
      console.log(chalk.green('✅ Deliverable submitted!'));
      console.log(chalk.cyan('Waiting for evaluator approval...'));
    } catch (error) {
      console.error(chalk.red('❌ Error submitting deliverable:'), error.message);
      if (error.reason) console.error(chalk.red('Reason:'), error.reason);
      process.exit(1);
    }
  });

// 🎯 APPROVE DELIVERABLE COMMAND
program
  .command('approve-deliverable')
  .description('Approve deliverable and release payment')
  .argument('<job-id>', 'Job ID')
  .option('--reason <string>', 'Approval reason/comment')
  .action(async (jobId, options) => {
    try {
      initWallet();

      if (
        !config.contracts.agenticCommerce ||
        config.contracts.agenticCommerce === ethers.ZeroAddress
      ) {
        console.log(chalk.yellow('⚠️  Agentic Commerce not deployed yet.'));
        return;
      }

      const agenticCommerceABI = [
        'function complete(uint256 jobId, bytes32 reason) external',
        'function getJob(uint256 jobId) external view returns (tuple(uint256 id, address client, address provider, address evaluator, string description, uint256 budget, uint256 expiredAt, uint8 status, address hook, bytes32 deliverable))',
      ];

      const commerce = new ethers.Contract(
        config.contracts.agenticCommerce,
        agenticCommerceABI,
        config.signer
      );

      const reasonBytes32 = ethers.id(options.reason || 'Work approved');

      console.log(chalk.cyan('\n✅ Approving Deliverable:'));
      console.log(chalk.dim('Job ID:'), jobId);
      console.log(chalk.dim('Reason:'), options.reason || 'Work approved');

      const tx = await commerce.complete(jobId, reasonBytes32);
      console.log(chalk.cyan('Transaction sent:'), tx.hash);

      const receipt = await tx.wait();
      console.log(chalk.green('✅ Payment released!'));
      console.log(chalk.cyan('Gas used:'), receipt.gasUsed.toString());

      console.log(chalk.green('\n🎊 Job completed successfully!'));
    } catch (error) {
      console.error(chalk.red('❌ Error approving deliverable:'), error.message);
      if (error.reason) console.error(chalk.red('Reason:'), error.reason);
      process.exit(1);
    }
  });

// 🎯 REJECT DELIVERABLE COMMAND
program
  .command('reject-deliverable')
  .description('Reject deliverable and request revision')
  .argument('<job-id>', 'Job ID')
  .option('--reason <string>', 'Rejection reason')
  .action(async (jobId, options) => {
    try {
      initWallet();

      if (
        !config.contracts.agenticCommerce ||
        config.contracts.agenticCommerce === ethers.ZeroAddress
      ) {
        console.log(chalk.yellow('⚠️  Agentic Commerce not deployed yet.'));
        return;
      }

      const agenticCommerceABI = ['function reject(uint256 jobId, bytes32 reason) external'];

      const commerce = new ethers.Contract(
        config.contracts.agenticCommerce,
        agenticCommerceABI,
        config.signer
      );

      const reasonBytes32 = ethers.id(options.reason || 'Work not satisfactory');

      console.log(chalk.cyan('\n❌ Rejecting Deliverable:'));
      console.log(chalk.dim('Job ID:'), jobId);
      console.log(chalk.dim('Reason:'), options.reason || 'Work not satisfactory');

      const tx = await commerce.reject(jobId, reasonBytes32);
      console.log(chalk.cyan('Transaction sent:'), tx.hash);

      await tx.wait();
      console.log(chalk.green('✅ Deliverable rejected.'));
      console.log(chalk.cyan('Provider can resubmit once work is revised.'));
    } catch (error) {
      console.error(chalk.red('❌ Error rejecting deliverable:'), error.message);
      if (error.reason) console.error(chalk.red('Reason:'), error.reason);
      process.exit(1);
    }
  });

// 🎯 GET JOB STATUS COMMAND
program
  .command('job-status')
  .description('Get job status')
  .argument('<job-id>', 'Job ID')
  .action(async (jobId, _options) => {
    try {
      initWallet();

      if (
        !config.contracts.agenticCommerce ||
        config.contracts.agenticCommerce === ethers.ZeroAddress
      ) {
        console.log(chalk.yellow('⚠️  Agentic Commerce not deployed yet.'));
        return;
      }

      const agenticCommerceABI = [
        'function getJob(uint256 jobId) external view returns (tuple(uint256 id, address client, address provider, address evaluator, string description, uint256 budget, uint256 expiredAt, uint8 status, address hook, bytes32 deliverable))',
      ];

      const commerce = new ethers.Contract(
        config.contracts.agenticCommerce,
        agenticCommerceABI,
        config.provider
      );

      const job = await commerce.getJob(jobId);

      const statusNames = ['Open', 'Funded', 'Submitted', 'Completed', 'Rejected', 'Expired'];
      const status = statusNames[job.status] || 'Unknown';

      console.log(chalk.green('\n📊 Job Status:'));
      console.log(chalk.dim('Job ID:'), job.id.toString());
      console.log(chalk.dim('Client:'), job.client);
      console.log(chalk.dim('Provider:'), job.provider);
      console.log(chalk.dim('Evaluator:'), job.evaluator);
      console.log(chalk.dim('Description:'), job.description);
      console.log(chalk.dim('Budget:'), job.budget.toString(), 'wei');
      console.log(chalk.dim('Status:'), status);
      console.log(chalk.dim('Expires At:'), new Date(Number(job.expiredAt) * 1000).toISOString());
      if (
        job.deliverable !== '0x0000000000000000000000000000000000000000000000000000000000000000'
      ) {
        console.log(chalk.dim('Deliverable:'), job.deliverable);
      }
    } catch (error) {
      console.error(chalk.red('❌ Error getting job status:'), error.message);
      process.exit(1);
    }
  });

// 🎯 CREATE PROPOSAL COMMAND (PRD 3 - Review)
program
  .command('create-proposal')
  .description('Create a new proposal for A/B evaluation')
  .option('--title <string>', 'Proposal title')
  .option('--description <string>', 'Proposal description')
  .option('--criteria <string>', 'Evaluation criteria URI (IPFS)')
  .option('--reward <number>', 'Reward amount in wei', '0')
  .option('--deadline <number>', 'Decision deadline in days', '7')
  .action(async options => {
    try {
      initWallet();

      if (!config.contracts.agentReview || config.contracts.agentReview === ethers.ZeroAddress) {
        console.log(chalk.yellow('⚠️  Agent Review not deployed yet.'));
        console.log(chalk.cyan('Deploy first:'));
        console.log(
          chalk.cyan(
            '  forge create contracts/shared/AgentReview.sol:AgentReview --rpc-url $ETHEREUM_RPC_URL --private-key $PRIVATE_KEY --verify --etherscan-api-key $ETHERSCAN_API_KEY --chain mainnet'
          )
        );
        return;
      }

      const agentReviewABI = [
        'function createProposal(string calldata title, string calldata description, string calldata criteriaURI, uint256 reward, uint256 decisionDeadline) external payable returns (uint256 proposalId)',
        'function getProposal(uint256 proposalId) external view returns (tuple(uint256 id, address proposer, string title, string description, string criteriaURI, uint256 reward, uint8 status, uint256 createdAt, uint256 decisionDeadline, address winningEvaluator))',
      ];

      const review = new ethers.Contract(
        config.contracts.agentReview,
        agentReviewABI,
        config.signer
      );

      const title = options.title || 'Proposal A vs B';
      const description = options.description || 'Evaluate options and provide recommendation';
      const criteriaURI = options.criteria || `ipfs://${config.signer.address}/criteria`;
      const reward = BigInt(options.reward || '0');
      const deadlineDays = parseInt(options.deadline || '7');
      const decisionDeadline = Math.floor(Date.now() / 1000) + deadlineDays * 24 * 60 * 60;

      console.log(chalk.cyan('\n📋 Creating Proposal:'));
      console.log(chalk.dim('Title:'), title);
      console.log(chalk.dim('Description:'), description);
      console.log(chalk.dim('Criteria:'), criteriaURI);
      console.log(chalk.dim('Reward:'), reward.toString(), 'wei');
      console.log(chalk.dim('Deadline:'), new Date(decisionDeadline * 1000).toISOString());

      const value = reward;
      const tx = await review.createProposal(
        title,
        description,
        criteriaURI,
        reward,
        decisionDeadline,
        { value }
      );

      console.log(chalk.cyan('Transaction sent:'), tx.hash);

      const receipt = await tx.wait();
      console.log(chalk.green('✅ Proposal created!'));
      console.log(chalk.cyan('Gas used:'), receipt.gasUsed.toString());

      let proposalId;
      for (const log of receipt.logs) {
        try {
          const parsed = review.interface.parseLog(log);
          if (parsed && parsed.name === 'ProposalCreated') {
            proposalId = parsed.args.proposalId.toString();
            break;
          }
        } catch (e) {
          /* ignore */
        }
      }

      if (proposalId) {
        console.log(chalk.green('\n🎊 Proposal ID:'), proposalId);
      }
    } catch (error) {
      console.error(chalk.red('❌ Error creating proposal:'), error.message);
      if (error.reason) console.error(chalk.red('Reason:'), error.reason);
      process.exit(1);
    }
  });

// 🎯 SUBMIT EVALUATION COMMAND (PRD 3)
program
  .command('evaluate')
  .description('Submit an evaluation for a proposal')
  .argument('<proposal-id>', 'Proposal ID')
  .option('--confidence <number>', 'Confidence score (-1000 to 1000)', '0')
  .option('--reasoning <string>', 'Reasoning URI (IPFS)')
  .option('--stake <number>', 'Stake amount in wei', '1000000000000000')
  .action(async (proposalId, options) => {
    try {
      initWallet();

      if (!config.contracts.agentReview || config.contracts.agentReview === ethers.ZeroAddress) {
        console.log(chalk.yellow('⚠️  Agent Review not deployed yet.'));
        return;
      }

      const agentReviewABI = [
        'function submitEvaluation(uint256 proposalId, int256 confidenceScore, string calldata reasoningURI) external payable',
        'function getProposal(uint256 proposalId) external view returns (tuple(uint256 id, address proposer, string title, string description, string criteriaURI, uint256 reward, uint8 status, uint256 createdAt, uint256 decisionDeadline, address winningEvaluator))',
      ];

      const review = new ethers.Contract(
        config.contracts.agentReview,
        agentReviewABI,
        config.signer
      );

      const confidence = parseInt(options.confidence);
      const reasoning = options.reasoning || `ipfs://${config.signer.address}/reasoning`;
      const stake = BigInt(options.stake);

      console.log(chalk.cyan('\n🎯 Submitting Evaluation:'));
      console.log(chalk.dim('Proposal ID:'), proposalId);
      console.log(chalk.dim('Confidence:'), confidence);
      console.log(chalk.dim('Reasoning:'), reasoning);
      console.log(chalk.dim('Stake:'), stake.toString(), 'wei');

      const tx = await review.submitEvaluation(proposalId, confidence, reasoning, { value: stake });

      console.log(chalk.cyan('Transaction sent:'), tx.hash);

      await tx.wait();
      console.log(chalk.green('✅ Evaluation submitted!'));
    } catch (error) {
      console.error(chalk.red('❌ Error submitting evaluation:'), error.message);
      if (error.reason) console.error(chalk.red('Reason:'), error.reason);
      process.exit(1);
    }
  });

// 🎯 ATTEST DECISION COMMAND (PRD 3)
program
  .command('attest-decision')
  .description('Attest to a winning evaluator decision')
  .argument('<proposal-id>', 'Proposal ID')
  .argument('<winner>', 'Winning evaluator address')
  .action(async (proposalId, winner, _options) => {
    try {
      initWallet();

      if (!config.contracts.agentReview || config.contracts.agentReview === ethers.ZeroAddress) {
        console.log(chalk.yellow('⚠️  Agent Review not deployed yet.'));
        return;
      }

      const agentReviewABI = [
        'function attestDecision(uint256 proposalId, address winningEvaluator) external',
      ];

      const review = new ethers.Contract(
        config.contracts.agentReview,
        agentReviewABI,
        config.signer
      );

      console.log(chalk.cyan('\n✅ Attesting Decision:'));
      console.log(chalk.dim('Proposal ID:'), proposalId);
      console.log(chalk.dim('Winner:'), winner);

      const tx = await review.attestDecision(proposalId, winner);

      console.log(chalk.cyan('Transaction sent:'), tx.hash);

      await tx.wait();
      console.log(chalk.green('✅ Decision attested!'));
      console.log(chalk.green('Reward has been released to the winner.'));
    } catch (error) {
      console.error(chalk.red('❌ Error attesting decision:'), error.message);
      if (error.reason) console.error(chalk.red('Reason:'), error.reason);
      process.exit(1);
    }
  });

// 🎯 GET PROPOSAL STATUS COMMAND (PRD 3)
program
  .command('proposal-status')
  .description('Get proposal status')
  .argument('<proposal-id>', 'Proposal ID')
  .option('--json', 'Output as JSON')
  .action(async (proposalId, options) => {
    try {
      initWallet();

      if (!config.contracts.agentReview || config.contracts.agentReview === ethers.ZeroAddress) {
        console.log(chalk.yellow('⚠️  Agent Review not deployed yet.'));
        return;
      }

      const agentReviewABI = [
        'function getProposal(uint256 proposalId) external view returns (tuple(uint256 id, address proposer, string title, string description, string criteriaURI, uint256 reward, uint8 status, uint256 createdAt, uint256 decisionDeadline, address winningEvaluator))',
        'function getProposalEvaluations(uint256 proposalId) external view returns (address[])',
        'function getEvaluation(uint256 proposalId, address evaluator) external view returns (tuple(uint256 proposalId, address evaluator, int256 confidenceScore, string reasoningURI, uint256 stakeAmount, bool isFinal, uint256 submittedAt))',
      ];

      const review = new ethers.Contract(
        config.contracts.agentReview,
        agentReviewABI,
        config.provider
      );

      const proposal = await review.getProposal(proposalId);

      const statusNames = ['Open', 'UnderReview', 'Decided', 'Cancelled'];
      const status = statusNames[proposal.status] || 'Unknown';

      const evaluators = await review.getProposalEvaluations(proposalId);
      const evaluations = [];

      for (const evaluator of evaluators) {
        const evaluation = await review.getEvaluation(proposalId, evaluator);
        evaluations.push({
          evaluator: evaluation.evaluator,
          confidenceScore: Number(evaluation.confidenceScore),
          stakeAmount: evaluation.stakeAmount.toString(),
          isFinal: evaluation.isFinal,
          submittedAt: Number(evaluation.submittedAt),
        });
      }

      const result = {
        proposalId: proposal.id.toString(),
        title: proposal.title,
        description: proposal.description,
        proposer: proposal.proposer,
        status: status,
        reward: proposal.reward.toString(),
        createdAt: new Date(Number(proposal.createdAt) * 1000).toISOString(),
        decisionDeadline: new Date(Number(proposal.decisionDeadline) * 1000).toISOString(),
        winningEvaluator: proposal.winningEvaluator,
        evaluations: evaluations,
      };

      if (options.json) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        console.log(chalk.green('\n📊 Proposal Status:'));
        console.log(chalk.dim('Proposal ID:'), proposal.id.toString());
        console.log(chalk.dim('Title:'), proposal.title);
        console.log(chalk.dim('Proposer:'), proposal.proposer);
        console.log(chalk.dim('Status:'), status);
        console.log(chalk.dim('Reward:'), proposal.reward.toString(), 'wei');
        console.log(chalk.dim('Created:'), result.createdAt);
        console.log(chalk.dim('Deadline:'), result.decisionDeadline);
        if (proposal.winningEvaluator !== '0x0000000000000000000000000000000000000000') {
          console.log(chalk.dim('Winner:'), proposal.winningEvaluator);
        }

        console.log(chalk.cyan('\n📋 Evaluations:'), evaluators.length);

        for (const evaluation of evaluations) {
          const scoreDisplay =
            evaluation.confidenceScore >= 0
              ? `+${evaluation.confidenceScore}`
              : `${evaluation.confidenceScore}`;
          console.log(
            chalk.dim(
              `  ${evaluation.evaluator}: ${scoreDisplay}/1000 (${ethers.formatEther(evaluation.stakeAmount)} ETH staked)`
            )
          );
        }
      }
    } catch (error) {
      console.error(chalk.red('❌ Error getting proposal status:'), error.message);
      process.exit(1);
    }
  });

// 🎯 LISTEN JOBS COMMAND (Agent mode - poll for new jobs)
program
  .command('listen-jobs')
  .description('Listen for incoming jobs (polling mode for agents)')
  .option('--poll-interval <seconds>', 'Poll interval in seconds', '5')
  .option('--json', 'Output as JSON')
  .action(async options => {
    try {
      initWallet();

      if (
        !config.contracts.agenticCommerce ||
        config.contracts.agenticCommerce === ethers.ZeroAddress
      ) {
        console.log(chalk.yellow('⚠️  Agentic Commerce not deployed yet.'));
        return;
      }

      const agenticCommerceABI = [
        'function getJob(uint256 jobId) external view returns (tuple(uint256 id, address client, address provider, address evaluator, string description, uint256 budget, uint256 expiredAt, uint8 status, address hook, bytes32 deliverable))',
        'function getCurrentJobId() external view returns (uint256)',
        'function getProviderJobs(address provider) external view returns (uint256[])',
      ];

      const commerce = new ethers.Contract(
        config.contracts.agenticCommerce,
        agenticCommerceABI,
        config.provider
      );

      const pollInterval = parseInt(options.pollInterval) * 1000;
      let lastJobId = Number(await commerce.getCurrentJobId());

      console.log(chalk.green('\n🔔 Listening for jobs...'));
      console.log(chalk.dim('Provider:'), config.signer.address);
      console.log(chalk.dim('Poll Interval:'), options.pollInterval, 'seconds');
      console.log(chalk.dim('Last Job ID:', lastJobId));
      console.log(chalk.dim('Press Ctrl+C to stop\n'));

      while (true) {
        const currentJobId = Number(await commerce.getCurrentJobId());

        if (currentJobId > lastJobId) {
          for (let jobId = lastJobId + 1; jobId <= currentJobId; jobId++) {
            try {
              const job = await commerce.getJob(jobId);

              if (job.provider.toLowerCase() === config.signer.address.toLowerCase()) {
                const statusNames = [
                  'Pending',
                  'Funded',
                  'Submitted',
                  'Completed',
                  'Cancelled',
                  'Rejected',
                ];
                const jobData = {
                  jobId: jobId.toString(),
                  client: job.client,
                  provider: job.provider,
                  description: job.description,
                  budget: job.budget.toString(),
                  status: statusNames[job.status] || 'Unknown',
                  expiredAt: new Date(Number(job.expiredAt) * 1000).toISOString(),
                };

                if (options.json) {
                  console.log(JSON.stringify({ event: 'JobReceived', data: jobData }));
                } else {
                  console.log(chalk.green('\n🎉 New Job Received!'));
                  console.log(chalk.cyan('Job ID:'), jobData.jobId);
                  console.log(chalk.cyan('Client:'), jobData.client);
                  console.log(chalk.cyan('Description:'), jobData.description);
                  console.log(
                    chalk.cyan('Budget:'),
                    (parseInt(jobData.budget) / 1e6).toFixed(2),
                    'USDC'
                  );
                  console.log(chalk.cyan('Status:'), jobData.status);
                  console.log(chalk.cyan('Expires:'), jobData.expiredAt);
                }
              }
            } catch (e) {
              // Job may have been deleted or invalid
            }
          }
          lastJobId = currentJobId;
        }

        await new Promise(resolve => setTimeout(resolve, pollInterval));
      }
    } catch (error) {
      console.error(chalk.red('❌ Error listening for jobs:'), error.message);
      process.exit(1);
    }
  });

// 🎯 MONITOR REPUTATION COMMAND
program
  .command('monitor-reputation')
  .description('Monitor reputation changes for an agent')
  .argument('[agent-address]', 'Agent address (defaults to wallet address)')
  .option('--poll-interval <seconds>', 'Poll interval in seconds', '30')
  .option('--json', 'Output as JSON')
  .action(async (agentAddress, options) => {
    try {
      initWallet();

      if (
        !config.contracts.reputationRegistry ||
        config.contracts.reputationRegistry === ethers.ZeroAddress
      ) {
        console.log(chalk.yellow('⚠️  Reputation Registry not deployed yet.'));
        return;
      }

      const targetAddress = agentAddress || config.signer.address;

      const reputationRegistryABI = [
        'function getAgentReputation(address agent) external view returns (int256 averageRating, uint256 totalFeedbacks, uint256 uniqueProviders)',
      ];

      const reputationRegistry = new ethers.Contract(
        config.contracts.reputationRegistry,
        reputationRegistryABI,
        config.provider
      );

      const pollInterval = parseInt(options.pollInterval) * 1000;
      let lastFeedbacks = 0;

      console.log(chalk.green('\n📈 Monitoring Reputation...'));
      console.log(chalk.dim('Agent:'), targetAddress);
      console.log(chalk.dim('Poll Interval:'), options.pollInterval, 'seconds');
      console.log(chalk.dim('Press Ctrl+C to stop\n'));

      while (true) {
        const [averageRating, totalFeedbacks, uniqueProviders] =
          await reputationRegistry.getAgentReputation(targetAddress);

        if (totalFeedbacks > lastFeedbacks) {
          const score = parseFloat(averageRating.toString()) / 10;
          const reputationData = {
            address: targetAddress,
            averageRating: score.toFixed(1),
            totalFeedbacks: Number(totalFeedbacks),
            uniqueProviders: Number(uniqueProviders),
            updatedAt: new Date().toISOString(),
          };

          if (options.json) {
            console.log(JSON.stringify({ event: 'ReputationUpdate', data: reputationData }));
          } else {
            console.log(chalk.green('\n📊 Reputation Updated!'));
            console.log(chalk.cyan('Average Rating:'), reputationData.averageRating + '%');
            console.log(chalk.cyan('Total Feedbacks:'), reputationData.totalFeedbacks);
            console.log(chalk.cyan('Unique Providers:'), reputationData.uniqueProviders);
          }
          lastFeedbacks = Number(totalFeedbacks);
        }

        await new Promise(resolve => setTimeout(resolve, pollInterval));
      }
    } catch (error) {
      console.error(chalk.red('❌ Error monitoring reputation:'), error.message);
      process.exit(1);
    }
  });

// 🎯 GET AGENT INFO COMMAND (Quick lookup)
program
  .command('agent-info')
  .description('Get agent information including identity and reputation')
  .argument('[agent-address]', 'Agent address (defaults to wallet address)')
  .option('--json', 'Output as JSON')
  .action(async (agentAddress, options) => {
    try {
      initWallet();

      const targetAddress = agentAddress || config.signer.address;

      const identityRegistryABI = [
        'function isAgent(address agentAddress) external view returns (bool)',
        'function getAgent(uint256 agentId) external view returns (address owner, string memory agentURI, address agentWallet, bool isActive)',
        'function getCurrentAgentId() external view returns (uint256)',
      ];

      const reputationRegistryABI = [
        'function getAgentReputation(address agent) external view returns (int256 averageRating, uint256 totalFeedbacks, uint256 uniqueProviders)',
      ];

      const identityRegistry = new ethers.Contract(
        config.contracts.identityRegistry,
        identityRegistryABI,
        config.provider
      );

      const reputationRegistry = new ethers.Contract(
        config.contracts.reputationRegistry,
        reputationRegistryABI,
        config.provider
      );

      const isRegistered = await identityRegistry.isAgent(targetAddress);

      if (!isRegistered) {
        if (options.json) {
          console.log(JSON.stringify({ address: targetAddress, registered: false }));
        } else {
          console.log(chalk.yellow('⚠️  Address is not a registered agent'));
        }
        return;
      }

      let agentId;
      let agentData = null;
      for (let i = 1n; i <= (await identityRegistry.getCurrentAgentId()); i++) {
        const agent = await identityRegistry.getAgent(i);
        if (agent[0].toLowerCase() === targetAddress.toLowerCase()) {
          agentId = i;
          agentData = {
            owner: agent[0],
            agentURI: agent[1],
            agentWallet: agent[2],
            isActive: agent[3],
          };
          break;
        }
      }

      const [averageRating, totalFeedbacks, uniqueProviders] =
        await reputationRegistry.getAgentReputation(targetAddress);

      const result = {
        address: targetAddress,
        registered: true,
        agentId: agentId?.toString(),
        owner: agentData?.owner,
        agentWallet: agentData?.agentWallet,
        isActive: agentData?.isActive,
        reputation: {
          averageRating: (parseFloat(averageRating.toString()) / 10).toFixed(1),
          totalFeedbacks: Number(totalFeedbacks),
          uniqueProviders: Number(uniqueProviders),
        },
        metadataURI: agentData?.agentURI,
      };

      if (options.json) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        console.log(chalk.green('\n🔍 Agent Info:'));
        console.log(chalk.cyan('Address:'), result.address);
        console.log(chalk.cyan('Agent ID:'), result.agentId);
        console.log(chalk.cyan('Owner:'), result.owner);
        console.log(chalk.cyan('Agent Wallet:'), result.agentWallet);
        console.log(chalk.cyan('Active:'), result.isActive ? '✅' : '❌');
        console.log(chalk.cyan('\n📊 Reputation:'));
        console.log(chalk.dim('  Average Rating:'), result.reputation.averageRating + '%');
        console.log(chalk.dim('  Total Feedbacks:'), result.reputation.totalFeedbacks);
        console.log(chalk.dim('  Unique Providers:'), result.reputation.uniqueProviders);
      }
    } catch (error) {
      console.error(chalk.red('❌ Error getting agent info:'), error.message);
      process.exit(1);
    }
  });

// 🎯 BALANCE COMMAND (Quick wallet balance check)
program
  .command('balance')
  .description('Check wallet balance (ETH and USDC)')
  .argument('[agent-address]', 'Address (defaults to wallet address)')
  .option('--json', 'Output as JSON')
  .action(async (address, options) => {
    try {
      initWallet();

      const targetAddress = address || config.signer.address;

      const usdcABI = ['function balanceOf(address account) external view returns (uint256)'];

      const usdc = new ethers.Contract(config.contracts.usdc, usdcABI, config.provider);

      const ethBalance = await config.provider.getBalance(targetAddress);
      const usdcBalance = await usdc.balanceOf(targetAddress);

      const result = {
        address: targetAddress,
        eth: ethers.formatEther(ethBalance),
        usdc: (parseInt(usdcBalance.toString()) / 1e6).toFixed(2),
      };

      if (options.json) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        console.log(chalk.green('\n💰 Wallet Balance:'));
        console.log(chalk.cyan('Address:'), result.address);
        console.log(chalk.cyan('ETH:'), result.eth);
        console.log(chalk.cyan('USDC:'), result.usdc);
      }
    } catch (error) {
      console.error(chalk.red('❌ Error getting balance:'), error.message);
      process.exit(1);
    }
  });

// ============================================================================
// SKILLS COMMANDS (AgentSkillRegistry)
// ============================================================================

// 🎯 REGISTER SKILL COMMAND
program
  .command('register-skill')
  .description('Register a skill/capability for your agent')
  .requiredOption('--agent-id <number>', 'Agent ID (required)')
  .requiredOption('--name <string>', 'Skill name (required)')
  .option('--version <string>', 'Skill version', '1.0.0')
  .option('--description <string>', 'Skill description')
  .option('--endpoint <string>', 'Service endpoint URL')
  .option('--domains <string>', 'Comma-separated domains (e.g., defi,trading,analytics)')
  .action(async options => {
    try {
      initWallet();

      const skillRegistryABI = [
        'function registerSkill(uint256 agentId, string calldata name, string calldata version, string calldata description, string calldata endpoint, string[] calldata domains) external returns (uint256 skillId)',
        'function getSkill(uint256 skillId) external view returns (tuple(uint256 agentId, string name, string version, string description, string endpoint, string[] domains, bool isActive, address registeredBy, uint256 registeredAt))',
      ];

      const skillRegistry = new ethers.Contract(
        config.contracts.skillRegistry,
        skillRegistryABI,
        config.signer
      );

      const agentId = BigInt(options.agentId);
      const name = options.name;
      const version = options.version || '1.0.0';
      const description = options.description || '';
      const endpoint = options.endpoint || '';
      const domains = (options.domains || '').split(',').filter(d => d.trim());

      console.log(chalk.cyan('\n🎯 Registering Skill:'));
      console.log(chalk.dim('Agent ID:'), agentId.toString());
      console.log(chalk.dim('Name:'), name);
      console.log(chalk.dim('Version:'), version);
      console.log(chalk.dim('Description:'), description || '(none)');
      console.log(chalk.dim('Endpoint:'), endpoint || '(none)');
      console.log(chalk.dim('Domains:'), domains.length > 0 ? domains.join(', ') : '(none)');

      const tx = await skillRegistry.registerSkill(
        agentId,
        name,
        version,
        description,
        endpoint,
        domains
      );
      console.log(chalk.cyan('\n📤 Transaction sent:'), tx.hash);

      const receipt = await tx.wait();
      console.log(chalk.green('✅ Skill registered successfully!'));
      console.log(chalk.cyan('Gas used:'), receipt.gasUsed.toString());

      let skillId;
      for (const log of receipt.logs) {
        try {
          const parsed = skillRegistry.interface.parseLog(log);
          if (parsed && parsed.name === 'SkillRegistered') {
            skillId = parsed.args.skillId.toString();
            break;
          }
        } catch (e) {
          /* ignore */
        }
      }

      if (skillId) {
        console.log(chalk.green('\n🎉 Skill ID:'), skillId);
      }
    } catch (error: unknown) {
      const err = error as { message?: string; reason?: string };
      console.error(chalk.red('❌ Error registering skill:'), err.message);
      if (err.reason) console.error(chalk.red('Reason:'), err.reason);
      process.exit(1);
    }
  });

// 🎯 LIST SKILLS COMMAND
program
  .command('list-skills')
  .description('List skills for an agent')
  .requiredOption('--agent-id <number>', 'Agent ID (required)')
  .action(async options => {
    try {
      initWallet();

      const skillRegistryABI = [
        'function getAgentSkills(uint256 agentId) external view returns (uint256[] memory)',
        'function getSkill(uint256 skillId) external view returns (tuple(uint256 agentId, string name, string version, string description, string endpoint, string[] domains, bool isActive, address registeredBy, uint256 registeredAt))',
      ];

      const skillRegistry = new ethers.Contract(
        config.contracts.skillRegistry,
        skillRegistryABI,
        config.signer
      );

      const agentId = BigInt(options.agentId);
      const skillIds = await skillRegistry.getAgentSkills(agentId);

      if (skillIds.length === 0) {
        console.log(chalk.yellow('\n⚠️  No skills found for agent ID:'), options.agentId);
        return;
      }

      console.log(chalk.cyan('\n📋 Skills for Agent ID:'), options.agentId);
      console.log(chalk.dim('Total:'), skillIds.length, 'skills\n');

      for (const skillId of skillIds) {
        const skill = await skillRegistry.getSkill(skillId);
        console.log(chalk.bold(`\nSkill ID: ${skillId}`));
        console.log(chalk.dim('  Name:'), skill[1], `(${skill[2]})`);
        console.log(chalk.dim('  Description:'), skill[3] || '(none)');
        console.log(chalk.dim('  Endpoint:'), skill[4] || '(none)');
        console.log(chalk.dim('  Domains:'), skill[5].join(', ') || '(none)');
        console.log(chalk.dim('  Active:'), skill[6] ? chalk.green('Yes') : chalk.red('No'));
        console.log(chalk.dim('  Registered by:'), skill[7]);
      }
    } catch (error: unknown) {
      const err = error as { message?: string };
      console.error(chalk.red('❌ Error listing skills:'), err.message);
      process.exit(1);
    }
  });

// 🎯 DEACTIVATE SKILL COMMAND
program
  .command('deactivate-skill')
  .description('Deactivate a skill')
  .requiredOption('--skill-id <number>', 'Skill ID (required)')
  .action(async options => {
    try {
      initWallet();

      const skillRegistryABI = ['function deactivateSkill(uint256 skillId) external'];

      const skillRegistry = new ethers.Contract(
        config.contracts.skillRegistry,
        skillRegistryABI,
        config.signer
      );

      const skillId = BigInt(options.skillId);

      console.log(chalk.cyan('\n⚠️  Deactivating Skill:'));
      console.log(chalk.dim('Skill ID:'), skillId.toString());

      const tx = await skillRegistry.deactivateSkill(skillId);
      console.log(chalk.cyan('\n📤 Transaction sent:'), tx.hash);

      const receipt = await tx.wait();
      console.log(chalk.green('✅ Skill deactivated successfully!'));
      console.log(chalk.cyan('Gas used:'), receipt.gasUsed.toString());
    } catch (error: unknown) {
      const err = error as { message?: string };
      console.error(chalk.red('❌ Error deactivating skill:'), err.message);
      process.exit(1);
    }
  });

// ============================================================================
// ORACLE COMMANDS (PriceOracle)
// ============================================================================

// 🎯 GET USDC PRICE COMMAND
program
  .command('get-usdc-price')
  .description('Get current USDC price from oracle')
  .action(async () => {
    try {
      initWallet();

      const priceOracleABI = [
        'function getUSDCPrice() external view returns (uint256)',
        'function isStale() external view returns (bool)',
      ];

      const priceOracle = new ethers.Contract(
        config.contracts.priceOracle,
        priceOracleABI,
        config.provider
      );

      const price = await priceOracle.getUSDCPrice();
      const stale = await priceOracle.isStale();

      console.log(chalk.cyan('\n💵 USDC Price:'));
      console.log(chalk.bold('  Price:'), (Number(price) / 1e8).toFixed(2), 'USD');
      console.log(chalk.dim('  Raw:'), price.toString(), 'wei (8 decimals)');
      console.log(chalk.dim('  Stale:'), stale ? chalk.red('Yes') : chalk.green('No'));
    } catch (error: unknown) {
      const err = error as { message?: string };
      console.error(chalk.red('❌ Error getting price:'), err.message);
      process.exit(1);
    }
  });

// ============================================================================
// COMMIT-REVEAL COMMANDS
// ============================================================================

// 🎯 COMMIT COMMAND
program
  .command('commit')
  .description('Make a commitment (for commit-reveal)')
  .requiredOption('--hash <string>', 'Commitment hash (required)')
  .action(async options => {
    try {
      initWallet();

      const commitRevealABI = ['function commit(bytes32 commitment) external'];

      const commitReveal = new ethers.Contract(
        config.contracts.commitReveal,
        commitRevealABI,
        config.signer
      );

      const commitment = options.hash;

      console.log(chalk.cyan('\n🔐 Making Commitment:'));
      console.log(chalk.dim('Hash:'), commitment);

      const tx = await commitReveal.commit(commitment);
      console.log(chalk.cyan('\n📤 Transaction sent:'), tx.hash);

      const receipt = await tx.wait();
      console.log(chalk.green('✅ Commitment submitted!'));
      console.log(chalk.cyan('Gas used:'), receipt.gasUsed.toString());
    } catch (error: unknown) {
      const err = error as { message?: string };
      console.error(chalk.red('❌ Error committing:'), err.message);
      process.exit(1);
    }
  });

// 🎯 REVEAL COMMAND
program
  .command('reveal')
  .description('Reveal your commitment')
  .requiredOption('--data <string>', 'Data to reveal (required)')
  .requiredOption('--nonce <number>', 'Nonce (required)')
  .requiredOption('--service-id <number>', 'Service ID (required)')
  .action(async options => {
    try {
      initWallet();

      const commitRevealABI = [
        'function reveal(string calldata data, uint256 nonce, uint256 serviceId) external',
      ];

      const commitReveal = new ethers.Contract(
        config.contracts.commitReveal,
        commitRevealABI,
        config.signer
      );

      console.log(chalk.cyan('\n🔓 Revealing:'));
      console.log(chalk.dim('Data:'), options.data);
      console.log(chalk.dim('Nonce:'), options.nonce);
      console.log(chalk.dim('Service ID:'), options.serviceId);

      const tx = await commitReveal.reveal(
        options.data,
        BigInt(options.nonce),
        BigInt(options.serviceId)
      );
      console.log(chalk.cyan('\n📤 Transaction sent:'), tx.hash);

      const receipt = await tx.wait();
      console.log(chalk.green('✅ Reveal successful!'));
      console.log(chalk.cyan('Gas used:'), receipt.gasUsed.toString());
    } catch (error: unknown) {
      const err = error as { message?: string };
      console.error(chalk.red('❌ Error revealing:'), err.message);
      process.exit(1);
    }
  });

// ============================================================================
// SLASH MANAGER COMMANDS
// ============================================================================

// 🎯 CREATE SLASH PROPOSAL COMMAND
program
  .command('slash-create')
  .description('Create a slash proposal (signers only)')
  .requiredOption('--evaluator <address>', 'Evaluator address (required)')
  .requiredOption('--proposal-id <number>', 'Proposal ID to slash (required)')
  .requiredOption('--amount <number>', 'Slash amount in ETH wei (required)')
  .requiredOption('--reason <string>', 'Reason for slash (required)')
  .action(async options => {
    try {
      initWallet();

      const slashManagerABI = [
        'function createProposal(address evaluator, uint256 proposalId, uint256 amount, string calldata reason) external returns (bytes32)',
        'function isSigner(address account) external view returns (bool)',
      ];

      const slashManager = new ethers.Contract(
        config.contracts.slashManager,
        slashManagerABI,
        config.signer
      );

      const isSigner = await slashManager.isSigner(config.signer.address);
      if (!isSigner) {
        console.error(chalk.red('❌ Error: Only signers can create slash proposals'));
        console.error(chalk.cyan('Your address:'), config.signer.address);
        process.exit(1);
      }

      console.log(chalk.cyan('\n⚡ Creating Slash Proposal:'));
      console.log(chalk.dim('Evaluator:'), options.evaluator);
      console.log(chalk.dim('Proposal ID:'), options.proposalId);
      console.log(chalk.dim('Amount:'), options.amount, 'wei');
      console.log(chalk.dim('Reason:'), options.reason);

      const tx = await slashManager.createProposal(
        options.evaluator,
        BigInt(options.proposalId),
        BigInt(options.amount),
        options.reason
      );
      console.log(chalk.cyan('\n📤 Transaction sent:'), tx.hash);

      const receipt = await tx.wait();
      console.log(chalk.green('✅ Slash proposal created!'));
      console.log(chalk.cyan('Gas used:'), receipt.gasUsed.toString());
    } catch (error: unknown) {
      const err = error as { message?: string };
      console.error(chalk.red('❌ Error creating slash proposal:'), err.message);
      process.exit(1);
    }
  });

// 🎯 CONFIRM SLASH PROPOSAL COMMAND
program
  .command('slash-confirm')
  .description('Confirm a slash proposal (signers only)')
  .requiredOption('--proposal-id <string>', 'Proposal ID (required)')
  .action(async options => {
    try {
      initWallet();

      const slashManagerABI = [
        'function confirmProposal(bytes32 proposalId) external',
        'function isSigner(address account) external view returns (bool)',
      ];

      const slashManager = new ethers.Contract(
        config.contracts.slashManager,
        slashManagerABI,
        config.signer
      );

      const isSigner = await slashManager.isSigner(config.signer.address);
      if (!isSigner) {
        console.error(chalk.red('❌ Error: Only signers can confirm slash proposals'));
        process.exit(1);
      }

      console.log(chalk.cyan('\n✓ Confirming Slash Proposal:'));
      console.log(chalk.dim('Proposal ID:'), options.proposalId);

      const tx = await slashManager.confirmProposal(options.proposalId);
      console.log(chalk.cyan('\n📤 Transaction sent:'), tx.hash);

      const receipt = await tx.wait();
      console.log(chalk.green('✅ Proposal confirmed!'));
      console.log(chalk.cyan('Gas used:'), receipt.gasUsed.toString());
    } catch (error: unknown) {
      const err = error as { message?: string };
      console.error(chalk.red('❌ Error confirming:'), err.message);
      process.exit(1);
    }
  });

// 🎯 EXECUTE SLASH PROPOSAL COMMAND
program
  .command('slash-execute')
  .description('Execute a slash proposal (after confirmation)')
  .requiredOption('--proposal-id <string>', 'Proposal ID (required)')
  .action(async options => {
    try {
      initWallet();

      const slashManagerABI = [
        'function executeProposal(bytes32 proposalId) external',
        'function isSigner(address account) external view returns (bool)',
      ];

      const slashManager = new ethers.Contract(
        config.contracts.slashManager,
        slashManagerABI,
        config.signer
      );

      const isSigner = await slashManager.isSigner(config.signer.address);
      if (!isSigner) {
        console.error(chalk.red('❌ Error: Only signers can execute slash proposals'));
        process.exit(1);
      }

      console.log(chalk.cyan('\n⚡ Executing Slash Proposal:'));
      console.log(chalk.dim('Proposal ID:'), options.proposalId);

      const tx = await slashManager.executeProposal(options.proposalId);
      console.log(chalk.cyan('\n📤 Transaction sent:'), tx.hash);

      const receipt = await tx.wait();
      console.log(chalk.green('✅ Slash executed!'));
      console.log(chalk.cyan('Gas used:'), receipt.gasUsed.toString());
    } catch (error: unknown) {
      const err = error as { message?: string };
      console.error(chalk.red('❌ Error executing:'), err.message);
      process.exit(1);
    }
  });

// 🎯 CHECK SIGNER COMMAND
program
  .command('check-signer')
  .description('Check if an address is a slash manager signer')
  .option('--address <address>', 'Address to check (defaults to connected wallet)')
  .action(async options => {
    try {
      initWallet();

      const slashManagerABI = ['function isSigner(address account) external view returns (bool)'];

      const slashManager = new ethers.Contract(
        config.contracts.slashManager,
        slashManagerABI,
        config.provider
      );

      const address = options.address || config.signer.address;
      const isSigner = await slashManager.isSigner(address);

      console.log(chalk.cyan('\n🔍 Signer Check:'));
      console.log(chalk.dim('Address:'), address);
      console.log(chalk.bold('  Is Signer:'), isSigner ? chalk.green('YES ✓') : chalk.red('NO ✗'));
    } catch (error: unknown) {
      const err = error as { message?: string };
      console.error(chalk.red('❌ Error:'), err.message);
      process.exit(1);
    }
  });

// ============================================================================
// CLAIM REFUND COMMAND
// ============================================================================

program
  .command('claim-refund')
  .description('Claim refund for an expired job')
  .requiredOption('--job-id <number>', 'Job ID (required)')
  .action(async options => {
    try {
      initWallet();

      const commerceABI = [
        'function claimRefund(uint256 jobId) external',
        'function getJob(uint256 jobId) external view returns (tuple(uint256 id, address client, address provider, address evaluator, string description, uint256 budget, uint256 expiredAt, uint8 status, address hook, bytes32 deliverable))',
      ];

      const commerce = new ethers.Contract(
        config.contracts.agenticCommerce,
        commerceABI,
        config.signer
      );

      const jobId = BigInt(options.jobId);
      const job = await commerce.getJob(jobId);

      console.log(chalk.cyan('\n💰 Claiming Refund:'));
      console.log(chalk.dim('Job ID:'), jobId.toString());
      console.log(chalk.dim('Budget:'), job.budget.toString(), 'wei');
      console.log(chalk.dim('Expired at:'), new Date(Number(job.expiredAt) * 1000).toISOString());

      const tx = await commerce.claimRefund(jobId);
      console.log(chalk.cyan('\n📤 Transaction sent:'), tx.hash);

      const receipt = await tx.wait();
      console.log(chalk.green('✅ Refund claimed!'));
      console.log(chalk.cyan('Gas used:'), receipt.gasUsed.toString());
    } catch (error: unknown) {
      const err = error as { message?: string };
      console.error(chalk.red('❌ Error claiming refund:'), err.message);
      process.exit(1);
    }
  });

// ============================================================================
// V6 BIDDING COMMANDS
// ============================================================================

// 🎯 CREATE OPEN JOB COMMAND
program
  .command('create-open-job')
  .description('Create an open job for bidding (V6)')
  .option('--max-budget <number>', 'Maximum budget in USDC wei', '1000000')
  .option('--evaluator <address>', 'Evaluator address')
  .option('--description <string>', 'Job description')
  .option('--deadline <number>', 'Deadline in days', '7')
  .option('--evaluator-fee', 'Enable evaluator fee (1%)', false)
  .option('--payment-token <address>', 'Payment token address (default: USDC)')
  .action(async options => {
    try {
      initWallet();

      const commerceABI = [
        'function createOpenJob(uint256 maxBudget, address evaluator, uint256 expiredAt, string calldata description, address paymentToken, bool evaluatorFee) external returns (uint256 jobId)',
      ];

      const commerce = new ethers.Contract(
        config.contracts.agenticCommerce,
        commerceABI,
        config.signer
      );

      const maxBudget = BigInt(options.maxBudget);
      const evaluator = options.evaluator || '0x0000000000000000000000000000000000000000';
      const description = options.description || 'Open job for bidding';
      const deadlineDays = parseInt(options.deadline);
      const expiredAt = Math.floor(Date.now() / 1000) + deadlineDays * 24 * 60 * 60;
      const evaluatorFee = options.evaluatorFee || false;
      const paymentToken = options.paymentToken || config.contracts.usdc;

      console.log(chalk.cyan('\n📋 Creating Open Job (Bidding):'));
      console.log(chalk.dim('Max Budget:'), maxBudget.toString(), 'wei');
      console.log(chalk.dim('Evaluator:'), evaluator);
      console.log(chalk.dim('Description:'), description);
      console.log(chalk.dim('Deadline:'), new Date(expiredAt * 1000).toISOString());
      console.log(chalk.dim('Evaluator Fee:'), evaluatorFee ? 'Enabled' : 'Disabled');
      console.log(chalk.dim('Payment Token:'), paymentToken);

      const tx = await commerce.createOpenJob(
        maxBudget,
        evaluator,
        expiredAt,
        description,
        paymentToken,
        evaluatorFee
      );
      console.log(chalk.cyan('Transaction sent:'), tx.hash);

      const receipt = await tx.wait();
      console.log(chalk.green('✅ Open job created!'));
      console.log(chalk.cyan('Gas used:'), receipt.gasUsed.toString());

      let jobId;
      for (const log of receipt.logs) {
        try {
          const parsed = commerce.interface.parseLog(log);
          if (parsed && (parsed.name === 'OpenJobCreated' || parsed.name === 'JobCreated')) {
            jobId = parsed.args.jobId.toString();
            break;
          }
        } catch (e) {
          /* ignore */
        }
      }

      if (jobId) {
        console.log(chalk.green('\n🎉 Job ID:'), jobId);
      }
    } catch (error: unknown) {
      const err = error as { message?: string; reason?: string };
      console.error(chalk.red('❌ Error creating open job:'), err.message);
      if (err.reason) console.error(chalk.red('Reason:'), err.reason);
      process.exit(1);
    }
  });

// 🎯 COMMIT BID COMMAND
program
  .command('commit-bid')
  .description('Commit a sealed bid with stake (V6)')
  .requiredOption('--job-id <number>', 'Job ID (required)')
  .requiredOption('--amount <number>', 'Bid amount in USDC wei (required)')
  .requiredOption('--message <string>', 'Bid message (required)')
  .action(async options => {
    try {
      initWallet();

      const commerceABI = [
        'function commitBid(uint256 jobId, bytes32 commitHash) external payable',
        'function calculateStake(uint256 maxBudget) external pure returns (uint256)',
      ];

      const commerce = new ethers.Contract(
        config.contracts.agenticCommerce,
        commerceABI,
        config.signer
      );

      const jobId = BigInt(options.jobId);
      const amount = BigInt(options.amount);
      const message = options.message;

      const stake = (amount * 100n) / 10000n;
      const commitHash = ethers.solidityPackedKeccak256(
        ['uint256', 'string', 'bytes32'],
        [amount, message, ethers.randomBytes(32)]
      );

      console.log(chalk.cyan('\n🔐 Committing Bid:'));
      console.log(chalk.dim('Job ID:'), jobId.toString());
      console.log(chalk.dim('Amount:'), amount.toString(), 'wei');
      console.log(chalk.dim('Message:'), message);
      console.log(chalk.dim('Stake (1%):'), ethers.formatEther(stake), 'ETH');

      const tx = await commerce.commitBid(jobId, commitHash, { value: stake });
      console.log(chalk.cyan('Transaction sent:'), tx.hash);

      const receipt = await tx.wait();
      console.log(chalk.green('✅ Bid committed!'));
      console.log(chalk.cyan('Gas used:'), receipt.gasUsed.toString());
    } catch (error: unknown) {
      const err = error as { message?: string; reason?: string };
      console.error(chalk.red('❌ Error committing bid:'), err.message);
      if (err.reason) console.error(chalk.red('Reason:'), err.reason);
      process.exit(1);
    }
  });

// 🎯 REVEAL BID COMMAND
program
  .command('reveal-bid')
  .description('Reveal your committed bid (V6)')
  .requiredOption('--job-id <number>', 'Job ID (required)')
  .requiredOption('--amount <number>', 'Bid amount (required)')
  .requiredOption('--message <string>', 'Bid message (required)')
  .requiredOption('--salt <string>', 'Salt used in commitment (required)')
  .action(async options => {
    try {
      initWallet();

      const commerceABI = [
        'function revealBid(uint256 jobId, uint256 amount, string calldata message, bytes32 salt) external',
      ];

      const commerce = new ethers.Contract(
        config.contracts.agenticCommerce,
        commerceABI,
        config.signer
      );

      const jobId = BigInt(options.jobId);
      const amount = BigInt(options.amount);
      const message = options.message;
      const salt = (options.salt as `0x${string}`) || '0x' + '00'.repeat(32);

      console.log(chalk.cyan('\n🔓 Revealing Bid:'));
      console.log(chalk.dim('Job ID:'), jobId.toString());
      console.log(chalk.dim('Amount:'), amount.toString(), 'wei');
      console.log(chalk.dim('Message:'), message);

      const tx = await commerce.revealBid(jobId, amount, message, salt);
      console.log(chalk.cyan('Transaction sent:'), tx.hash);

      const receipt = await tx.wait();
      console.log(chalk.green('✅ Bid revealed!'));
      console.log(chalk.cyan('Gas used:'), receipt.gasUsed.toString());
    } catch (error: unknown) {
      const err = error as { message?: string; reason?: string };
      console.error(chalk.red('❌ Error revealing bid:'), err.message);
      if (err.reason) console.error(chalk.red('Reason:'), err.reason);
      process.exit(1);
    }
  });

// 🎯 ACCEPT BID COMMAND
program
  .command('accept-bid')
  .description('Accept a winning bid (V6)')
  .requiredOption('--job-id <number>', 'Job ID (required)')
  .requiredOption('--bid-id <number>', 'Bid ID to accept (required)')
  .action(async options => {
    try {
      initWallet();

      const commerceABI = ['function acceptBid(uint256 jobId, uint256 bidId) external'];

      const commerce = new ethers.Contract(
        config.contracts.agenticCommerce,
        commerceABI,
        config.signer
      );

      const jobId = BigInt(options.jobId);
      const bidId = BigInt(options.bidId);

      console.log(chalk.cyan('\n✅ Accepting Bid:'));
      console.log(chalk.dim('Job ID:'), jobId.toString());
      console.log(chalk.dim('Bid ID:'), bidId.toString());

      const tx = await commerce.acceptBid(jobId, bidId);
      console.log(chalk.cyan('Transaction sent:'), tx.hash);

      const receipt = await tx.wait();
      console.log(chalk.green('✅ Bid accepted!'));
      console.log(chalk.cyan('Gas used:'), receipt.gasUsed.toString());
    } catch (error: unknown) {
      const err = error as { message?: string; reason?: string };
      console.error(chalk.red('❌ Error accepting bid:'), err.message);
      if (err.reason) console.error(chalk.red('Reason:'), err.reason);
      process.exit(1);
    }
  });

// 🎯 WITHDRAW STAKE COMMAND
program
  .command('withdraw-stake')
  .description('Withdraw your stake from a job (V6)')
  .requiredOption('--job-id <number>', 'Job ID (required)')
  .action(async options => {
    try {
      initWallet();

      const commerceABI = ['function withdrawStake(uint256 jobId) external'];

      const commerce = new ethers.Contract(
        config.contracts.agenticCommerce,
        commerceABI,
        config.signer
      );

      const jobId = BigInt(options.jobId);

      console.log(chalk.cyan('\n💸 Withdrawing Stake:'));
      console.log(chalk.dim('Job ID:'), jobId.toString());

      const tx = await commerce.withdrawStake(jobId);
      console.log(chalk.cyan('Transaction sent:'), tx.hash);

      const receipt = await tx.wait();
      console.log(chalk.green('✅ Stake withdrawn!'));
      console.log(chalk.cyan('Gas used:'), receipt.gasUsed.toString());
    } catch (error: unknown) {
      const err = error as { message?: string; reason?: string };
      console.error(chalk.red('❌ Error withdrawing stake:'), err.message);
      if (err.reason) console.error(chalk.red('Reason:'), err.reason);
      process.exit(1);
    }
  });

// 🎯 GET MY BID COMMAND
program
  .command('get-my-bid')
  .description('Get your bid for a job (V6)')
  .requiredOption('--job-id <number>', 'Job ID (required)')
  .action(async options => {
    try {
      initWallet();

      const commerceABI = [
        'function getUserBid(uint256 jobId, address user) external view returns (tuple(address bidder, uint256 amount, string message, uint8 status, uint256 committedAt, uint256 revealedAt))',
      ];

      const commerce = new ethers.Contract(
        config.contracts.agenticCommerce,
        commerceABI,
        config.provider
      );

      const jobId = BigInt(options.jobId);
      const bid = await commerce.getUserBid(jobId, config.signer.address);

      if (bid.bidder === '0x0000000000000000000000000000000000000000') {
        console.log(chalk.yellow('\n⚠️  No bid found for this job'));
        return;
      }

      const statusNames = ['None', 'Committed', 'Revealed', 'Accepted', 'Forfeited'];

      console.log(chalk.cyan('\n📋 Your Bid:'));
      console.log(chalk.dim('Job ID:'), jobId.toString());
      console.log(chalk.dim('Bidder:'), bid.bidder);
      console.log(chalk.dim('Amount:'), bid.amount.toString(), 'wei');
      console.log(chalk.dim('Message:'), bid.message);
      console.log(chalk.dim('Status:'), statusNames[bid.status] || 'Unknown');
      console.log(
        chalk.dim('Committed At:'),
        new Date(Number(bid.committedAt) * 1000).toISOString()
      );
      if (bid.revealedAt > 0n) {
        console.log(
          chalk.dim('Revealed At:'),
          new Date(Number(bid.revealedAt) * 1000).toISOString()
        );
      }
    } catch (error: unknown) {
      const err = error as { message?: string };
      console.error(chalk.red('❌ Error getting bid:'), err.message);
      process.exit(1);
    }
  });

// 🎯 GET JOB BID COUNT COMMAND
program
  .command('get-job-bid-count')
  .description('Get number of bids on a job (V6)')
  .requiredOption('--job-id <number>', 'Job ID (required)')
  .action(async options => {
    try {
      initWallet();

      const commerceABI = ['function jobBidCount(uint256 jobId) external view returns (uint256)'];

      const commerce = new ethers.Contract(
        config.contracts.agenticCommerce,
        commerceABI,
        config.provider
      );

      const jobId = BigInt(options.jobId);
      const count = await commerce.jobBidCount(jobId);

      console.log(chalk.cyan('\n📊 Job Bid Count:'));
      console.log(chalk.dim('Job ID:'), jobId.toString());
      console.log(chalk.bold('Total Bids:'), count.toString());
    } catch (error: unknown) {
      const err = error as { message?: string };
      console.error(chalk.red('❌ Error:'), err.message);
      process.exit(1);
    }
  });

// 🎯 GET CLIENT JOB COUNT COMMAND
program
  .command('get-client-job-count')
  .description('Get job count for a client address (V6)')
  .option('--address <address>', 'Client address (defaults to connected wallet)')
  .action(async options => {
    try {
      initWallet();

      const commerceABI = [
        'function getClientJobCount(address client) external view returns (uint256)',
      ];

      const commerce = new ethers.Contract(
        config.contracts.agenticCommerce,
        commerceABI,
        config.provider
      );

      const address = options.address || config.signer.address;
      const count = await commerce.getClientJobCount(address);

      console.log(chalk.cyan('\n📊 Client Job Count:'));
      console.log(chalk.dim('Client:'), address);
      console.log(chalk.bold('Total Jobs:'), count.toString());
    } catch (error: unknown) {
      const err = error as { message?: string };
      console.error(chalk.red('❌ Error:'), err.message);
      process.exit(1);
    }
  });

// 🎯 ACTIVATE SERVICE COMMAND
program
  .command('activate-service')
  .description('Activate a previously deactivated service (V6)')
  .requiredOption('--service-id <number>', 'Service ID (required)')
  .action(async options => {
    try {
      initWallet();

      const serviceRegistryABI = ['function activateService(uint256 serviceId) external'];

      const serviceRegistry = new ethers.Contract(
        config.contracts.serviceRegistry,
        serviceRegistryABI,
        config.signer
      );

      const serviceId = BigInt(options.serviceId);

      console.log(chalk.cyan('\n✅ Activating Service:'));
      console.log(chalk.dim('Service ID:'), serviceId.toString());

      const tx = await serviceRegistry.activateService(serviceId);
      console.log(chalk.cyan('Transaction sent:'), tx.hash);

      const receipt = await tx.wait();
      console.log(chalk.green('✅ Service activated!'));
      console.log(chalk.cyan('Gas used:'), receipt.gasUsed.toString());
    } catch (error: unknown) {
      const err = error as { message?: string; reason?: string };
      console.error(chalk.red('❌ Error activating service:'), err.message);
      if (err.reason) console.error(chalk.red('Reason:'), err.reason);
      process.exit(1);
    }
  });

// 🎯 GET SERVICE COUNTER COMMAND
program
  .command('get-service-counter')
  .description('Get total service counter (V6)')
  .action(async () => {
    try {
      initWallet();

      const serviceRegistryABI = ['function getServiceCounter() external view returns (uint256)'];

      const serviceRegistry = new ethers.Contract(
        config.contracts.serviceRegistry,
        serviceRegistryABI,
        config.provider
      );

      const counter = await serviceRegistry.getServiceCounter();

      console.log(chalk.cyan('\n📊 Service Counter:'));
      console.log(chalk.bold('Total Services Created:'), counter.toString());
    } catch (error: unknown) {
      const err = error as { message?: string };
      console.error(chalk.red('❌ Error:'), err.message);
      process.exit(1);
    }
  });

// ============================================================================
// V6 REVIEW COMMANDS
// ============================================================================

// 🎯 CLAIM PROPOSAL REWARD COMMAND
program
  .command('claim-proposal-reward')
  .description('Claim reward for a winning proposal (V6)')
  .requiredOption('--proposal-id <number>', 'Proposal ID (required)')
  .action(async options => {
    try {
      initWallet();

      const reviewABI = ['function claimReward(uint256 proposalId) external'];

      const review = new ethers.Contract(config.contracts.agentReview, reviewABI, config.signer);

      const proposalId = BigInt(options.proposalId);

      console.log(chalk.cyan('\n💰 Claiming Proposal Reward:'));
      console.log(chalk.dim('Proposal ID:'), proposalId.toString());

      const tx = await review.claimReward(proposalId);
      console.log(chalk.cyan('Transaction sent:'), tx.hash);

      const receipt = await tx.wait();
      console.log(chalk.green('✅ Reward claimed!'));
      console.log(chalk.cyan('Gas used:'), receipt.gasUsed.toString());
    } catch (error: unknown) {
      const err = error as { message?: string; reason?: string };
      console.error(chalk.red('❌ Error:'), err.message);
      if (err.reason) console.error(chalk.red('Reason:'), err.reason);
      process.exit(1);
    }
  });

// 🎯 RELEASE PROPOSAL STAKE COMMAND
program
  .command('release-proposal-stake')
  .description('Release your stake for a proposal (V6)')
  .requiredOption('--proposal-id <number>', 'Proposal ID (required)')
  .action(async options => {
    try {
      initWallet();

      const reviewABI = ['function releaseStake(uint256 proposalId) external'];

      const review = new ethers.Contract(config.contracts.agentReview, reviewABI, config.signer);

      const proposalId = BigInt(options.proposalId);

      console.log(chalk.cyan('\n💸 Releasing Proposal Stake:'));
      console.log(chalk.dim('Proposal ID:'), proposalId.toString());

      const tx = await review.releaseStake(proposalId);
      console.log(chalk.cyan('Transaction sent:'), tx.hash);

      const receipt = await tx.wait();
      console.log(chalk.green('✅ Stake released!'));
      console.log(chalk.cyan('Gas used:'), receipt.gasUsed.toString());
    } catch (error: unknown) {
      const err = error as { message?: string; reason?: string };
      console.error(chalk.red('❌ Error:'), err.message);
      if (err.reason) console.error(chalk.red('Reason:'), err.reason);
      process.exit(1);
    }
  });

// 🎯 CANCEL PROPOSAL COMMAND
program
  .command('cancel-proposal')
  .description('Cancel your open proposal (V6)')
  .requiredOption('--proposal-id <number>', 'Proposal ID (required)')
  .action(async options => {
    try {
      initWallet();

      const reviewABI = ['function cancelProposal(uint256 proposalId) external'];

      const review = new ethers.Contract(config.contracts.agentReview, reviewABI, config.signer);

      const proposalId = BigInt(options.proposalId);

      console.log(chalk.cyan('\n❌ Cancelling Proposal:'));
      console.log(chalk.dim('Proposal ID:'), proposalId.toString());

      const tx = await review.cancelProposal(proposalId);
      console.log(chalk.cyan('Transaction sent:'), tx.hash);

      const receipt = await tx.wait();
      console.log(chalk.green('✅ Proposal cancelled!'));
      console.log(chalk.cyan('Gas used:'), receipt.gasUsed.toString());
    } catch (error: unknown) {
      const err = error as { message?: string; reason?: string };
      console.error(chalk.red('❌ Error:'), err.message);
      if (err.reason) console.error(chalk.red('Reason:'), err.reason);
      process.exit(1);
    }
  });

// 🎯 SLASH EVALUATOR COMMAND
program
  .command('slash-evaluator')
  .description('Slash an evaluator for malicious behavior (V6)')
  .requiredOption('--evaluator <address>', 'Evaluator address (required)')
  .requiredOption('--proposal-id <number>', 'Proposal ID (required)')
  .requiredOption('--reason <string>', 'Reason for slash (required)')
  .action(async options => {
    try {
      initWallet();

      const reviewABI = [
        'function slashEvaluator(address evaluator, uint256 proposalId, string calldata reason) external',
      ];

      const review = new ethers.Contract(config.contracts.agentReview, reviewABI, config.signer);

      console.log(chalk.cyan('\n⚡ Slashing Evaluator:'));
      console.log(chalk.dim('Evaluator:'), options.evaluator);
      console.log(chalk.dim('Proposal ID:'), options.proposalId);
      console.log(chalk.dim('Reason:'), options.reason);

      const tx = await review.slashEvaluator(
        options.evaluator,
        BigInt(options.proposalId),
        options.reason
      );
      console.log(chalk.cyan('Transaction sent:'), tx.hash);

      const receipt = await tx.wait();
      console.log(chalk.green('✅ Evaluator slashed!'));
      console.log(chalk.cyan('Gas used:'), receipt.gasUsed.toString());
    } catch (error: unknown) {
      const err = error as { message?: string; reason?: string };
      console.error(chalk.red('❌ Error:'), err.message);
      if (err.reason) console.error(chalk.red('Reason:'), err.reason);
      process.exit(1);
    }
  });

// ============================================================================
// V6 SKILLS COMMANDS
// ============================================================================

// 🎯 FIND SKILLS BY DOMAIN COMMAND
program
  .command('find-skills-by-domain')
  .description('Find skills by domain (V6)')
  .requiredOption('--domain <string>', 'Domain to search (required)')
  .action(async options => {
    try {
      initWallet();

      const skillRegistryABI = [
        'function findSkillsByDomain(string calldata domain) external view returns (uint256[] memory)',
        'function getSkill(uint256 skillId) external view returns (tuple(uint256 agentId, string name, string version, string description, string endpoint, string[] domains, bool isActive, address registeredBy, uint256 registeredAt))',
      ];

      const skillRegistry = new ethers.Contract(
        config.contracts.skillRegistry,
        skillRegistryABI,
        config.provider
      );

      const domain = options.domain;
      const skillIds = await skillRegistry.findSkillsByDomain(domain);

      console.log(chalk.cyan('\n🔍 Skills for Domain:'), domain);
      console.log(chalk.dim('Total:'), skillIds.length, 'skills\n');

      for (const skillId of skillIds) {
        const skill = await skillRegistry.getSkill(skillId);
        console.log(chalk.bold(`\nSkill ID: ${skillId}`));
        console.log(chalk.dim('  Agent ID:'), skill[0].toString());
        console.log(chalk.dim('  Name:'), skill[1], `(${skill[2]})`);
        console.log(chalk.dim('  Description:'), skill[3] || '(none)');
        console.log(chalk.dim('  Endpoint:'), skill[4] || '(none)');
        console.log(chalk.dim('  Domains:'), skill[5].join(', '));
        console.log(chalk.dim('  Active:'), skill[6] ? chalk.green('Yes') : chalk.red('No'));
      }
    } catch (error: unknown) {
      const err = error as { message?: string };
      console.error(chalk.red('❌ Error:'), err.message);
      process.exit(1);
    }
  });

// 🎯 GET TOTAL SKILL COUNT COMMAND
program
  .command('get-total-skill-count')
  .description('Get total skill count (V6)')
  .action(async () => {
    try {
      initWallet();

      const skillRegistryABI = ['function getTotalSkillCount() external view returns (uint256)'];

      const skillRegistry = new ethers.Contract(
        config.contracts.skillRegistry,
        skillRegistryABI,
        config.provider
      );

      const count = await skillRegistry.getTotalSkillCount();

      console.log(chalk.cyan('\n📊 Total Skill Count:'));
      console.log(chalk.bold('Total Skills:'), count.toString());
    } catch (error: unknown) {
      const err = error as { message?: string };
      console.error(chalk.red('❌ Error:'), err.message);
      process.exit(1);
    }
  });

// 🎯 UPDATE SKILL COMMAND
program
  .command('update-skill')
  .description('Update an existing skill (V6)')
  .requiredOption('--skill-id <number>', 'Skill ID (required)')
  .requiredOption('--name <string>', 'Skill name (required)')
  .option('--version <string>', 'Skill version', '1.0.0')
  .option('--description <string>', 'Skill description')
  .option('--endpoint <string>', 'Service endpoint URL')
  .option('--domains <string>', 'Comma-separated domains')
  .action(async options => {
    try {
      initWallet();

      const skillRegistryABI = [
        'function updateSkill(uint256 skillId, string calldata name, string calldata version, string calldata description, string calldata endpoint, string[] calldata domains) external',
      ];

      const skillRegistry = new ethers.Contract(
        config.contracts.skillRegistry,
        skillRegistryABI,
        config.signer
      );

      const skillId = BigInt(options.skillId);
      const name = options.name;
      const version = options.version || '1.0.0';
      const description = options.description || '';
      const endpoint = options.endpoint || '';
      const domains = (options.domains || '').split(',').filter(d => d.trim());

      console.log(chalk.cyan('\n✏️  Updating Skill:'));
      console.log(chalk.dim('Skill ID:'), skillId.toString());
      console.log(chalk.dim('Name:'), name);
      console.log(chalk.dim('Version:'), version);
      console.log(chalk.dim('Description:'), description || '(none)');
      console.log(chalk.dim('Endpoint:'), endpoint || '(none)');
      console.log(chalk.dim('Domains:'), domains.length > 0 ? domains.join(', ') : '(none)');

      const tx = await skillRegistry.updateSkill(
        skillId,
        name,
        version,
        description,
        endpoint,
        domains
      );
      console.log(chalk.cyan('Transaction sent:'), tx.hash);

      const receipt = await tx.wait();
      console.log(chalk.green('✅ Skill updated!'));
      console.log(chalk.cyan('Gas used:'), receipt.gasUsed.toString());
    } catch (error: unknown) {
      const err = error as { message?: string; reason?: string };
      console.error(chalk.red('❌ Error:'), err.message);
      if (err.reason) console.error(chalk.red('Reason:'), err.reason);
      process.exit(1);
    }
  });

// =============================================================================
// BIDDING SYSTEM COMMANDS (Phase 11 - Standalone Bidding)
// =============================================================================

const BIDDING_SYSTEM_ABI = [
  'function createBiddingSession(address evaluator, uint256 maxBudget, uint256 deadline, bytes calldata metadata, uint256 serviceId) external payable returns (uint256 sessionId)',
  'function commitBid(uint256 sessionId, bytes32 commitHash) external payable',
  'function revealBid(uint256 sessionId, uint256 amount, string calldata message, bytes32 salt) external',
  'function acceptBid(uint256 sessionId, uint256 bidId) external',
  'function withdrawStake(uint256 sessionId) external',
  'function claimStake(uint256 sessionId) external',
  'function createJobAndFund(uint256 sessionId, uint256 jobExpiredAt, string calldata description) external payable returns (uint256 jobId)',
  'function cancelSession(uint256 sessionId) external',
  'function getSession(uint256 sessionId) external view returns (tuple(uint256 id, address creator, address evaluator, uint256 maxBudget, uint256 deadline, uint256 revealWindowEnd, bytes metadata, uint256 serviceId, uint256 jobId, address winner, uint256 winningBidId, bool jobCreated, uint8 status))',
  'function getUserBid(uint256 sessionId, address user) external view returns (tuple(uint256 bidId, address bidder, uint256 proposedAmount, uint256 stake, string message, bytes32 commitHash, bool revealed, bool accepted, bool stakeWithdrawn, uint256 timestamp))',
  'function sessionCounter() external view returns (uint256)',
  'function calculateStake(uint256 maxBudget) external pure returns (uint256)',
] as const;

program
  .command('create-bidding-session')
  .description('Create a new bidding session')
  .requiredOption('--evaluator <address>', 'Evaluator address')
  .requiredOption('--max-budget <amount>', 'Maximum budget in ETH (e.g., 5)', parseFloat)
  .requiredOption('--deadline <timestamp>', 'Deadline timestamp (Unix epoch)', parseInt)
  .option('--metadata <string>', 'IPFS or data URI for job metadata')
  .option('--service-id <id>', 'Linked service ID', parseInt)
  .action(async options => {
    try {
      initWallet();

      if (!config.contracts.biddingSystem) {
        console.error(chalk.red('❌ BiddingSystem not configured'));
        process.exit(1);
      }

      const contract = new ethers.Contract(
        config.contracts.biddingSystem,
        BIDDING_SYSTEM_ABI,
        config.signer
      );
      const maxBudget = ethers.parseEther(options.maxBudget.toString());
      const stake = (maxBudget * 100n) / 10000n; // 1% stake

      console.log(chalk.cyan('Creating bidding session...'));
      console.log(chalk.dim('  Evaluator:'), options.evaluator);
      console.log(chalk.dim('  Max Budget:'), options.maxBudget, 'ETH');
      console.log(chalk.dim('  Stake:'), ethers.formatEther(stake), 'ETH');
      console.log(chalk.dim('  Deadline:'), new Date(options.deadline * 1000).toISOString());

      const tx = await contract.createBiddingSession(
        options.evaluator,
        maxBudget,
        options.deadline,
        options.metadata || '0x',
        options.serviceId || 0,
        { value: stake }
      );

      console.log(chalk.cyan('Transaction sent:'), tx.hash);
      const receipt = await tx.wait();

      // Parse session ID from event
      const iface = contract.interface;
      const log = receipt.logs.find(l => {
        try {
          const parsed = iface.parseLog(l);
          return parsed?.name === 'BiddingSessionCreated';
        } catch {
          return false;
        }
      });

      if (log) {
        const parsed = iface.parseLog(log);
        const sessionId = parsed?.args[0];
        console.log(chalk.green('✅ Bidding session created!'));
        console.log(chalk.cyan('Session ID:'), sessionId.toString());
      } else {
        console.log(chalk.green('✅ Bidding session created!'));
      }
      console.log(chalk.cyan('Gas used:'), receipt.gasUsed.toString());
    } catch (error: unknown) {
      const err = error as { message?: string; reason?: string };
      console.error(chalk.red('❌ Error:'), err.message);
      if (err.reason) console.error(chalk.red('Reason:'), err.reason);
      process.exit(1);
    }
  });

program
  .command('commit-bidding')
  .description('Commit a sealed bid to a bidding session')
  .requiredOption('--session <id>', 'Session ID', parseInt)
  .requiredOption('--amount <amount>', 'Bid amount in ETH', parseFloat)
  .requiredOption('--message <string>', 'Bid message/proposal')
  .action(async options => {
    try {
      initWallet();

      if (!config.contracts.biddingSystem) {
        console.error(chalk.red('❌ BiddingSystem not configured'));
        process.exit(1);
      }

      const contract = new ethers.Contract(
        config.contracts.biddingSystem,
        BIDDING_SYSTEM_ABI,
        config.signer
      );
      const amount = ethers.parseEther(options.amount.toString());
      const stake = (amount * 100n) / 10000n; // 1% stake
      const salt = ethers.randomBytes(32);
      const commitHash = ethers.keccak256(
        ethers.AbiCoder.defaultAbiCoder().encode(
          ['uint256', 'string', 'bytes32'],
          [amount, options.message, salt]
        )
      );

      console.log(chalk.cyan('Committing bid...'));
      console.log(chalk.dim('  Session ID:'), options.session);
      console.log(chalk.dim('  Amount:'), options.amount, 'ETH');
      console.log(chalk.dim('  Stake:'), ethers.formatEther(stake), 'ETH');
      console.log(chalk.dim('  Commit Hash:'), commitHash);
      console.log(chalk.yellow('  ⚠️  Save your salt for reveal:'), salt.toString());

      const tx = await contract.commitBid(options.session, commitHash, { value: stake });

      console.log(chalk.cyan('Transaction sent:'), tx.hash);
      const receipt = await tx.wait();
      console.log(chalk.green('✅ Bid committed!'));
      console.log(chalk.cyan('Gas used:'), receipt.gasUsed.toString());
    } catch (error: unknown) {
      const err = error as { message?: string; reason?: string };
      console.error(chalk.red('❌ Error:'), err.message);
      if (err.reason) console.error(chalk.red('Reason:'), err.reason);
      process.exit(1);
    }
  });

program
  .command('reveal-bidding')
  .description('Reveal your committed bid')
  .requiredOption('--session <id>', 'Session ID', parseInt)
  .requiredOption('--amount <amount>', 'Bid amount in ETH', parseFloat)
  .requiredOption('--message <string>', 'Bid message/proposal')
  .requiredOption('--salt <hex>', 'Salt used in commit (hex string)')
  .action(async options => {
    try {
      initWallet();

      if (!config.contracts.biddingSystem) {
        console.error(chalk.red('❌ BiddingSystem not configured'));
        process.exit(1);
      }

      const contract = new ethers.Contract(
        config.contracts.biddingSystem,
        BIDDING_SYSTEM_ABI,
        config.signer
      );
      const amount = ethers.parseEther(options.amount.toString());
      const salt = options.salt.startsWith('0x') ? options.salt : `0x${options.salt}`;

      console.log(chalk.cyan('Revealing bid...'));
      console.log(chalk.dim('  Session ID:'), options.session);
      console.log(chalk.dim('  Amount:'), options.amount, 'ETH');
      console.log(chalk.dim('  Message:'), options.message);

      const tx = await contract.revealBid(options.session, amount, options.message, salt);

      console.log(chalk.cyan('Transaction sent:'), tx.hash);
      const receipt = await tx.wait();
      console.log(chalk.green('✅ Bid revealed!'));
      console.log(chalk.cyan('Gas used:'), receipt.gasUsed.toString());
    } catch (error: unknown) {
      const err = error as { message?: string; reason?: string };
      console.error(chalk.red('❌ Error:'), err.message);
      if (err.reason) console.error(chalk.red('Reason:'), err.reason);
      process.exit(1);
    }
  });

program
  .command('accept-bidding')
  .description('Accept a winning bid (session creator only)')
  .requiredOption('--session <id>', 'Session ID', parseInt)
  .requiredOption('--bid-id <id>', 'Bid ID to accept', parseInt)
  .action(async options => {
    try {
      initWallet();

      if (!config.contracts.biddingSystem) {
        console.error(chalk.red('❌ BiddingSystem not configured'));
        process.exit(1);
      }

      const contract = new ethers.Contract(
        config.contracts.biddingSystem,
        BIDDING_SYSTEM_ABI,
        config.signer
      );

      console.log(chalk.cyan('Accepting bid...'));
      console.log(chalk.dim('  Session ID:'), options.session);
      console.log(chalk.dim('  Bid ID:'), options.bidId);

      const tx = await contract.acceptBid(options.session, options.bidId);

      console.log(chalk.cyan('Transaction sent:'), tx.hash);
      const receipt = await tx.wait();
      console.log(chalk.green('✅ Bid accepted! Winner can now claim stake.'));
      console.log(chalk.cyan('Gas used:'), receipt.gasUsed.toString());
    } catch (error: unknown) {
      const err = error as { message?: string; reason?: string };
      console.error(chalk.red('❌ Error:'), err.message);
      if (err.reason) console.error(chalk.red('Reason:'), err.reason);
      process.exit(1);
    }
  });

program
  .command('get-bidding-session')
  .description('Get bidding session details')
  .requiredOption('--session <id>', 'Session ID', parseInt)
  .action(async options => {
    try {
      initWallet();

      if (!config.contracts.biddingSystem) {
        console.error(chalk.red('❌ BiddingSystem not configured'));
        process.exit(1);
      }

      const contract = new ethers.Contract(
        config.contracts.biddingSystem,
        BIDDING_SYSTEM_ABI,
        config.provider
      );

      const session = await contract.getSession(options.session);

      const statusNames = [
        'Active',
        'BiddingClosed',
        'WinnerSelected',
        'JobCreated',
        'Completed',
        'Cancelled',
      ];

      console.log(chalk.bold('\n📋 Bidding Session Details'));
      console.log(chalk.dim('  Session ID:'), options.session);
      console.log(chalk.dim('  Creator:'), session[1]);
      console.log(chalk.dim('  Evaluator:'), session[2]);
      console.log(chalk.dim('  Max Budget:'), ethers.formatEther(session[3]), 'ETH');
      console.log(chalk.dim('  Deadline:'), new Date(Number(session[4]) * 1000).toISOString());
      console.log(
        chalk.dim('  Reveal Window End:'),
        new Date(Number(session[5]) * 1000).toISOString()
      );
      console.log(chalk.dim('  Winner:'), session[9] || 'None');
      console.log(chalk.dim('  Status:'), statusNames[Number(session[12])] || 'Unknown');
      console.log(chalk.dim('  Job Created:'), session[11]);
    } catch (error: unknown) {
      const err = error as { message?: string; reason?: string };
      console.error(chalk.red('❌ Error:'), err.message);
      if (err.reason) console.error(chalk.red('Reason:'), err.reason);
      process.exit(1);
    }
  });

program
  .command('withdraw-bidding-stake')
  .description('Withdraw your stake from a bidding session (losers only)')
  .requiredOption('--session <id>', 'Session ID', parseInt)
  .action(async options => {
    try {
      initWallet();

      if (!config.contracts.biddingSystem) {
        console.error(chalk.red('❌ BiddingSystem not configured'));
        process.exit(1);
      }

      const contract = new ethers.Contract(
        config.contracts.biddingSystem,
        BIDDING_SYSTEM_ABI,
        config.signer
      );

      console.log(chalk.cyan('Withdrawing stake...'));
      console.log(chalk.dim('  Session ID:'), options.session);

      const tx = await contract.withdrawStake(options.session);

      console.log(chalk.cyan('Transaction sent:'), tx.hash);
      const receipt = await tx.wait();
      console.log(chalk.green('✅ Stake withdrawn!'));
      console.log(chalk.cyan('Gas used:'), receipt.gasUsed.toString());
    } catch (error: unknown) {
      const err = error as { message?: string; reason?: string };
      console.error(chalk.red('❌ Error:'), err.message);
      if (err.reason) console.error(chalk.red('Reason:'), err.reason);
      process.exit(1);
    }
  });

// 🎯 HELP COMMAND
program
  .command('help')
  .description('Show help information')
  .action(() => {
    console.log(chalk.bold('\n🌴 Kokonut Agent Economy Stack CLI'));
    console.log(chalk.dim('Version: 0.1.0 | Kokonut Agent Economy Stack'));
    console.log(chalk.dim('Environment:'), config.network);
    console.log(chalk.dim('RPC URL:'), config.rpcUrl);
    console.log('\n' + '='.repeat(80));
    console.log('\n📚 Commands:');
    console.log(
      chalk.cyan('  register-agent') + '       Register a new agent with ERC-8004 identity'
    );
    console.log(chalk.cyan('  resolve-agent') + '         Resolve agent identity from address');
    console.log(chalk.cyan('  verify-agent') + '         Verify if address is a registered agent');
    console.log(chalk.cyan('  list-agents') + '           List all registered agents');
    console.log(chalk.cyan('  add-reputation') + '        Submit feedback/reputation for an agent');
    console.log(chalk.cyan('  get-reputation') + '         Get agent reputation');
    console.log(chalk.cyan('  -- Marketplace (PRD 2) --'));
    console.log(chalk.cyan('  create-service') + '         Create a new service listing');
    console.log(chalk.cyan('  list-services') + '          List all available services');
    console.log(chalk.cyan('  buy-service <id>') + '       Purchase a service and create a job');
    console.log(chalk.cyan('  fund-job <id>') + '          Fund an existing job');
    console.log(chalk.cyan('  submit-deliverable <id>') + ' Submit work deliverable');
    console.log(chalk.cyan('  approve-deliverable <id>') + ' Approve and release payment');
    console.log(chalk.cyan('  reject-deliverable <id>') + ' Reject and request revision');
    console.log(chalk.cyan('  job-status <id>') + '         Get job status');
    console.log(chalk.cyan('  -- Review (PRD 3) --'));
    console.log(chalk.cyan('  create-proposal') + '        Create a proposal for A/B evaluation');
    console.log(
      chalk.cyan('  evaluate <id>') + '          Submit evaluation with confidence score'
    );
    console.log(chalk.cyan('  attest-decision <id>') + '   Attest to winning evaluator');
    console.log(chalk.cyan('  proposal-status <id>') + '    Get proposal and evaluation status');
    console.log(chalk.cyan('  -- V6 Bidding Commands --'));
    console.log(chalk.cyan('  create-open-job') + '         Create an open job for bidding');
    console.log(chalk.cyan('  commit-bid') + '             Commit a sealed bid with stake');
    console.log(chalk.cyan('  reveal-bid') + '             Reveal your committed bid');
    console.log(chalk.cyan('  accept-bid') + '             Accept a winning bid');
    console.log(chalk.cyan('  withdraw-stake') + '         Withdraw your stake from a job');
    console.log(chalk.cyan('  get-my-bid') + '             Get your bid for a job');
    console.log(chalk.cyan('  get-job-bid-count') + '      Get number of bids on a job');
    console.log(chalk.cyan('  get-client-job-count') + '   Get job count for a client');
    console.log(chalk.cyan('  -- BiddingSystem (Phase 11) --'));
    console.log(chalk.cyan('  create-bidding-session') + '  Create a new bidding session');
    console.log(chalk.cyan('  commit-bidding') + '         Commit a sealed bid');
    console.log(chalk.cyan('  reveal-bidding') + '         Reveal your committed bid');
    console.log(chalk.cyan('  accept-bidding') + '         Accept a winning bid');
    console.log(chalk.cyan('  get-bidding-session') + '    Get session details');
    console.log(chalk.cyan('  withdraw-bidding-stake') + '  Withdraw your stake');
    console.log(chalk.cyan('  activate-service') + '       Activate a deactivated service');
    console.log(chalk.cyan('  get-service-counter') + '   Get total service counter');
    console.log(chalk.cyan('  claim-proposal-reward') + '  Claim reward for a winning proposal');
    console.log(chalk.cyan('  release-proposal-stake') + ' Release your stake for a proposal');
    console.log(chalk.cyan('  cancel-proposal') + '        Cancel your open proposal');
    console.log(
      chalk.cyan('  slash-evaluator') + '       Slash an evaluator for malicious behavior'
    );
    console.log(chalk.cyan('  find-skills-by-domain') + '  Find skills by domain');
    console.log(chalk.cyan('  get-total-skill-count') + '  Get total skill count');
    console.log(chalk.cyan('  update-skill') + '           Update an existing skill');
    console.log(chalk.cyan('  help') + '                   Show this help information');
    console.log('\n' + '='.repeat(80));
    console.log('\n🔧 Environment Variables:');
    console.log(chalk.dim('  PRIVATE_KEY     Your wallet private key'));
    console.log(
      chalk.dim('  ETHEREUM_RPC_URL    Ethereum RPC URL (default: https://eth.llamarpc.com)')
    );
    console.log(chalk.dim('  NETWORK         Network name (ethereum, mainnet, sepolia)'));
    console.log('\n📁 Configuration:');
    console.log(
      chalk.dim('  contracts.identityRegistry  Identity Registry address (after deployment)')
    );
    console.log(
      chalk.dim('  contracts.reputationRegistry  Reputation Registry address (after deployment)')
    );
    console.log(
      chalk.dim('  contracts.validationRegistry  Validation Registry address (after deployment)')
    );
    console.log(
      chalk.dim('  contracts.serviceRegistry  Service Registry address (after deployment)')
    );
    console.log(
      chalk.dim('  contracts.agenticCommerce  Agentic Commerce address (after deployment)')
    );
    console.log(chalk.dim('  contracts.agentReview  Agent Review address (after deployment)'));
    console.log('\n🥥 Built by Wasabi @ Syntropic Agent');
  });

// Parse command line arguments
program.parse(process.argv);

// If no command provided, show help
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
