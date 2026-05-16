#!/usr/bin/env tsx
/**
 * Kokonut Agent CLI - Command Line Interface
 */

import { Command } from 'commander';
import {
  parseAbi,
  http,
  createPublicClient,
  createWalletClient,
  formatEther as viemFormatEther,
  parseEther as viemParseEther,
  keccak256 as viemKeccak256,
  encodePacked as viemEncodePacked,
  toBytes as viemToBytes,
  zeroAddress,
  zeroHash,
  getContract,
  decodeEventLog,
  encodeAbiParameters as viemEncodeAbiParameters,
  Address,
} from 'viem';
import { mainnet, sepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { OWSStorage } from './lib/storage/ows-storage.js';
import chalk from 'chalk';
import * as dotenv from 'dotenv';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { randomBytes } from 'crypto';
import * as readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const require = createRequire(import.meta.url);
// Resolve config path relative to project root (works for both source and built CLI)
// When built, __dirname = cli/dist/, so we need ../../config from root
// When running via tsx, __dirname = cli/, so we need ../config from root
const isBuilt = __dirname.includes('/dist') || __dirname.includes('\\dist');
const configPath = isBuilt
  ? join(__dirname, '../../config/networks.js')
  : join(__dirname, '../config/networks.js');
const { NETWORKS } = require(configPath);
const ZeroAddress = zeroAddress;

type NetworkName = 'sepolia' | 'mainnet';

// Load environment variables
dotenv.config();

// viem clients
let publicClient: ReturnType<typeof createPublicClient> | null = null;
let walletClient: ReturnType<typeof createWalletClient> | null = null;
let account: ReturnType<typeof privateKeyToAccount> | null = null;
const ows = new OWSStorage();

// Configuration
const config: {
  network: NetworkName;
  readonly networkConfig: any;
  rpcUrl: string;
  signerAddress: Address;
  readonly contracts: any;
} = {
  network: (process.env.NETWORK as NetworkName) || 'sepolia',
  get networkConfig() {
    return NETWORKS[this.network];
  },
  rpcUrl: '',
  signerAddress: zeroAddress,

  get contracts() {
    return this.networkConfig.contracts;
  },
};

// Initialize provider and signer
function initWallet(customPrivateKey?: string, walletId?: string, passphrase?: string) {
  let privateKey: `0x${string}` | undefined = (customPrivateKey ||
    process.env.PRIVATE_KEY) as `0x${string}`;

  // If walletId is provided, attempt to load from OWS storage
  if (walletId) {
    const wallet = ows.getWallet(walletId);
    if (!wallet) {
      console.error(chalk.red(`❌ OWS Wallet ${walletId} not found.`));
      process.exit(1);
    }

    if (!passphrase) {
      console.error(chalk.red(`❌ Passphrase required for OWS wallet ${walletId}.`));
      process.exit(1);
    }

    try {
      privateKey = ows.getPrivateKey(walletId, passphrase) as `0x${string}`;
    } catch (e) {
      console.error(chalk.red(`❌ Incorrect passphrase for wallet ${walletId}.`));
      process.exit(1);
    }
  }

  if (!privateKey) {
    console.error(
      chalk.red(
        '❌ Private key not found. Please set PRIVATE_KEY, or use --wallet and --passphrase.'
      )
    );
    process.exit(1);
  }

  config.rpcUrl = config.networkConfig.rpcUrl;

  account = privateKeyToAccount(privateKey);
  const chain = config.networkConfig.chainId === 11155111 ? sepolia : mainnet;

  publicClient = createPublicClient({
    transport: http(config.rpcUrl),
    chain,
  });

  walletClient = createWalletClient({
    account,
    transport: http(config.rpcUrl),
    chain,
  });

  config.signerAddress = account.address;

  console.log(chalk.green('✅ Wallet initialized:'), account.address);
  console.log(
    chalk.cyan('Network:'),
    config.networkConfig.name,
    `(chainId: ${config.networkConfig.chainId})`
  );
}

async function waitForTransactionReceipt(hash: `0x${string}`) {
  if (!publicClient) {
    throw new Error('Public client not initialized');
  }

  return publicClient.waitForTransactionReceipt({ hash });
}

function parseLog(args: { log: any; abi: any }): any {
  return decodeEventLog({
    abi: args.abi,
    data: args.log.data,
    topics: args.log.topics as any,
  }) as any;
}

// Create CLI program
const program = new Command();

/**
 * Helper to get a contract instance
 */
function getContractInstance(address: Address, abi: any) {
  return getContract({
    address,
    abi,
    client: {
      public: publicClient!,
      wallet: walletClient!,
    },
  } as any) as any;
}

program
  .name('kokonut')
  .description('Kokonut Agent Economy Stack CLI - Agent-friendly blockchain interactions')
  .version('0.1.0')
  .option('-n, --network <network>', 'Network to use (sepolia|mainnet)', 'sepolia')
  .option('-w, --wallet <id>', 'OWS Wallet ID to use for transactions')
  .option('-p, --passphrase <string>', 'Passphrase for the OWS wallet')
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

// 🔧 INIT COMMAND - Configuration wizard

function createInterface() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
}

async function promptQuestion(rl: readline.Interface, question: string): Promise<string> {
  return new Promise(resolve => {
    rl.question(question, answer => resolve(answer.trim()));
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🌴  COCONUT PALM ASCII ART & ONBOARDING UX
// ═══════════════════════════════════════════════════════════════════════════════

const COCONUT_PALM = `
           |
          /|\
         / | \
        /  |  \
       /   |   \
      /    |    \
     /_____|_____\
        \\ | /
         \\|/
          |
         / \
        /   \
       /_____\
`;

const KOKONUT_BANNER = `
 _  __           _                     _   
| |/ /___   ___ | | ___   _ _   _ ___ | |_ 
| ' // _ \\ / _ \\| |/ / | | | | | / _ \\| __|
| . \\ (_) | (_) |   <| |_| | |_| | (_) | |_ 
|_|\\_\\___/ \\___/|_|\\_\\__, |\\__, |\\___/ \\__|
                        |___/ |___/         
`;

async function typewriter(text: string, delay = 15, newline = true) {
  for (const char of text) {
    process.stdout.write(char);
    await new Promise(r => setTimeout(r, delay));
  }
  if (newline) process.stdout.write('\n');
}

async function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms));
}

function clearScreen() {
  process.stdout.write('\x1B[2J\x1B[0f');
}

program
  .command('init')
  .description('Interactive configuration wizard for first-time setup')
  .action(async () => {
    // Guard: init requires an interactive terminal
    if (!process.stdin.isTTY) {
      console.log(chalk.cyan(COCONUT_PALM));
      console.log(chalk.cyan.bold(KOKONUT_BANNER));
      console.log('');
      console.log(chalk.yellow('⚠️  kokonut init requires an interactive terminal.'));
      console.log(chalk.dim('To set up non-interactively, create a .env.kokonut file:'));
      console.log('');
      console.log(chalk.dim('  cat > .env.kokonut << EOF'));
      console.log(chalk.dim('  NETWORK=sepolia'));
      console.log(chalk.dim('  PRIVATE_KEY=0x...'));
      console.log(chalk.dim('  EOF'));
      console.log('');
      console.log(chalk.dim('Then run: source .env.kokonut'));
      process.exit(0);
    }

    clearScreen();

    // ── Stage 1: The Reveal ───────────────────────────────────────────────
    await typewriter(COCONUT_PALM, 1, false);
    await sleep(400);

    await typewriter(chalk.cyan.bold(KOKONUT_BANNER), 2, false);
    await sleep(200);

    await typewriter(chalk.dim('┌─────────────────────────────────────────────────────────┐'), 5);
    await typewriter(chalk.dim('│  ') + chalk.cyan('Kokonut Agent Economy Stack CLI') + chalk.dim('                          │'), 5);
    await typewriter(chalk.dim('│  ') + chalk.green('Onchain Economy for AI Agents') + chalk.dim('                            │'), 5);
    await typewriter(chalk.dim('│  ') + chalk.yellow('Version 0.1.0  •  Sepolia Testnet') + chalk.dim('                      │'), 5);
    await typewriter(chalk.dim('└─────────────────────────────────────────────────────────┘'), 5);
    console.log('');
    await sleep(300);

    await typewriter(chalk.dim('Welcome, agent. Let\'s get you connected to the onchain economy...\n'), 20);
    await sleep(400);

    // ── Stage 2: The Wizard ───────────────────────────────────────────────
    const rl = createInterface();
    const steps = 3;
    let currentStep = 1;

    try {
      // Step 1: Network
      console.log(chalk.cyan(`┌─ Step [${currentStep}/${steps}] ─────────────────────────────────────────┐`));
      console.log(chalk.cyan('│  ') + chalk.bold('Select your network') + chalk.cyan('                                │'));
      console.log(chalk.cyan('│') + chalk.dim('                                                     │'));
      console.log(chalk.cyan('│') + '  [1] Sepolia Testnet  (recommended for agents)   ' + chalk.cyan('│'));
      console.log(chalk.cyan('│') + '  [2] Ethereum Mainnet  (production economy)       ' + chalk.cyan('│'));
      console.log(chalk.cyan('└─────────────────────────────────────────────────────────┘'));

      const networkChoice = await promptQuestion(rl, chalk.dim('  → Enter choice (1-2) [1]: '));
      const network = networkChoice === '2' ? 'mainnet' : 'sepolia';
      console.log(chalk.green(`  ✓ Network: ${network}\n`));
      currentStep++;
      await sleep(200);

      // Step 2: Wallet
      console.log(chalk.cyan(`┌─ Step [${currentStep}/${steps}] ─────────────────────────────────────────┐`));
      console.log(chalk.cyan('│  ') + chalk.bold('Configure your wallet') + chalk.cyan('                              │'));
      console.log(chalk.cyan('│') + chalk.dim('                                                     │'));
      console.log(chalk.cyan('│') + chalk.dim('  Your private key never leaves this machine.       │'));
      console.log(chalk.cyan('│') + chalk.dim('  It will be stored in a local .env.kokonut file.   │'));
      console.log(chalk.cyan('└─────────────────────────────────────────────────────────┘'));

      const privateKey = await promptQuestion(rl, chalk.dim('  → Enter private key (0x...): '));

      if (!privateKey.startsWith('0x') || privateKey.length !== 66) {
        console.log(chalk.red('\n  ✗ Invalid private key format. Expected 64 hex chars prefixed with 0x.\n'));
        rl.close();
        process.exit(1);
      }

      let walletAddress: string;
      try {
        const wallet = privateKeyToAccount(privateKey as `0x${string}`);
        walletAddress = wallet.address;
        console.log(chalk.green(`  ✓ Wallet: ${walletAddress}\n`));
      } catch (e) {
        console.log(chalk.red('\n  ✗ Could not derive wallet from private key.\n'));
        rl.close();
        process.exit(1);
      }
      currentStep++;
      await sleep(200);

      // Step 3: RPC (optional)
      console.log(chalk.cyan(`┌─ Step [${currentStep}/${steps}] ─────────────────────────────────────────┐`));
      console.log(chalk.cyan('│  ') + chalk.bold('Advanced: Custom RPC (optional)') + chalk.cyan('                  │'));
      console.log(chalk.cyan('│') + chalk.dim('                                                     │'));
      console.log(chalk.cyan('│') + chalk.dim('  Press Enter to use the default public RPC.        │'));
      console.log(chalk.cyan('│') + chalk.dim('  Or enter your own Infura/Alchemy/QuickNode URL.   │'));
      console.log(chalk.cyan('└─────────────────────────────────────────────────────────┘'));

      const customRpc = await promptQuestion(rl, chalk.dim('  → Custom RPC (optional): '));
      if (customRpc) {
        console.log(chalk.green(`  ✓ Custom RPC configured\n`));
      } else {
        console.log(chalk.dim(`  → Using default ${network} RPC\n`));
      }
      await sleep(200);

      // ── Stage 3: The Commit ───────────────────────────────────────────────
      console.log(chalk.dim('─'.repeat(59)));
      await typewriter(chalk.cyan.bold('  Writing configuration...'), 30);

      const envContent = `# Kokonut CLI Configuration
# Generated by 'kokonut init'

NETWORK=${network}
PRIVATE_KEY=${privateKey}
${customRpc ? `RPC_URL=${customRpc}` : '# RPC_URL=custom_rpc_here'}

# Optional: Etherscan API key for contract verification
# ETHERSCAN_API_KEY=your_api_key_here
`;

      const fs = require('fs');
      const envPath = join(process.cwd(), '.env.kokonut');
      fs.writeFileSync(envPath, envContent);

      await sleep(300);
      console.log(chalk.green('  ✓ Saved to .env.kokonut'));
      console.log(chalk.dim('─'.repeat(59)));
      await sleep(200);

      // ── Stage 4: The Celebration ──────────────────────────────────────────
      console.log('');
      await typewriter(chalk.green.bold('  🎉  Setup complete!  🎉'), 20);
      console.log('');

      console.log(chalk.cyan('  Your Agent Wallet'));
      console.log(chalk.dim('  ───────────────────────────────────────────────────'));
      console.log(`  ${chalk.dim('Address:')} ${chalk.white(walletAddress)}`);
      console.log(`  ${chalk.dim('Network:')} ${chalk.white(network === 'sepolia' ? 'Sepolia Testnet' : 'Ethereum Mainnet')}`);
      console.log(`  ${chalk.dim('RPC:')}     ${chalk.white(customRpc || `Default ${network} RPC`)}`);
      console.log(chalk.dim('  ───────────────────────────────────────────────────'));
      console.log('');

      console.log(chalk.cyan('  Quick Start Commands'));
      console.log(chalk.dim('  ───────────────────────────────────────────────────'));
      console.log(`  ${chalk.dim('$')} ${chalk.yellow('source .env.kokonut')}`);
      console.log(`  ${chalk.dim('$')} ${chalk.yellow('pnpm run cli -- help')}`);
      console.log(`  ${chalk.dim('$')} ${chalk.yellow('pnpm run cli -- register-agent --name "MyAgent"')}`);
      console.log(chalk.dim('  ───────────────────────────────────────────────────'));
      console.log('');

      await typewriter(chalk.dim('  Welcome to the Kokonut Agent Economy. '), 15, false);
      await typewriter(chalk.green('Your palm is planted.'), 25);
      console.log('');
    } catch (error) {
      console.error(chalk.red('\n  ✗ Setup failed:'), error);
      process.exit(1);
    } finally {
      rl.close();
    }
  });

// 🛡️ OWS WALLET COMMANDS

/**
 * Helper to prompt for passphrase without echoing
 */
async function promptPassphrase(rl: readline.Interface, question: string): Promise<string> {
  return new Promise(resolve => {
    const stdin = process.stdin as any;
    process.stdout.write(question);
    stdin.resume();
    stdin.setRawMode(true);
    let passphrase = '';

    const onData = (char: string) => {
      char = char.toString();
      switch (char) {
        case '\n':
        case '\r':
        case '\u0004':
          stdin.setRawMode(false);
          stdin.pause();
          stdin.removeListener('data', onData);
          process.stdout.write('\n');
          resolve(passphrase);
          break;
        case '\u0003':
          process.exit();
          break;
        default:
          passphrase += char;
          process.stdout.write('*');
          break;
      }
    };

    stdin.on('data', onData);
  });
}

program
  .command('wallet-create')
  .description('Create a new secure OWS wallet')
  .argument('<name>', 'Wallet name')
  .action(async name => {
    const rl = createInterface();
    try {
      const passphrase = await promptPassphrase(
        rl,
        'Enter a master passphrase to encrypt this wallet: '
      );
      const confirm = await promptPassphrase(rl, 'Confirm master passphrase: ');

      if (passphrase !== confirm) {
        console.error(chalk.red('❌ Passphrases do not match.'));
        return;
      }

      console.log(chalk.cyan('\n✨ Creating new wallet...'));
      const id = `wallet_${Date.now()}`;

      // In a real OWS implementation, this would call @open-wallet-standard/core
      // For this implementation, we generate a new private key and store it encrypted
      const privateKey = `0x${randomBytes(32).toString('hex')}` as `0x${string}`;
      const tempAccount = privateKeyToAccount(privateKey);

      ows.saveWallet(id, name, tempAccount.address, privateKey, passphrase);

      console.log(chalk.green('\n✅ Wallet created successfully!'));
      console.log(chalk.cyan('Name:'), name);
      console.log(chalk.cyan('Address:'), tempAccount.address);
      console.log(chalk.cyan('ID:'), id);
      console.log(chalk.dim('\nThis wallet is encrypted and stored locally.'));
    } finally {
      rl.close();
    }
  });

program
  .command('wallet-list')
  .description('List all locally stored OWS wallets')
  .action(() => {
    const wallets = ows.listWallets();
    if (wallets.length === 0) {
      console.log(chalk.yellow('No wallets found. Create one with `wallet-create`.'));
      return;
    }

    console.log(chalk.bold('\n💳 Registered OWS Wallets:\n'));
    wallets.forEach(w => {
      console.log(chalk.cyan(`[${w.id}] `) + chalk.white(w.name));
      console.log(chalk.dim(`  Address: ${w.address}`));
      console.log(chalk.dim(`  Created: ${w.createdAt}`));
      console.log('');
    });
  });

program
  .command('wallet-import')
  .description('Import an existing private key into OWS storage')
  .argument('<name>', 'Wallet name')
  .argument('<private-key>', 'Private key (0x...)')
  .action(async (name, pk) => {
    const rl = createInterface();
    try {
      if (!pk.startsWith('0x') || pk.length !== 66) {
        console.error(chalk.red('❌ Invalid private key format.'));
        return;
      }

      const passphrase = await promptPassphrase(
        rl,
        'Enter a master passphrase to encrypt this wallet: '
      );
      const id = `wallet_${Date.now()}`;
      const tempAccount = privateKeyToAccount(pk as `0x${string}`);

      ows.saveWallet(id, name, tempAccount.address, pk, passphrase);

      console.log(chalk.green('\n✅ Wallet imported successfully!'));
      console.log(chalk.cyan('Address:'), tempAccount.address);
    } finally {
      rl.close();
    }
  });

program
  .command('wallet-delete')
  .description('Delete a locally stored OWS wallet')
  .argument('<id>', 'Wallet ID')
  .action(id => {
    if (ows.deleteWallet(id)) {
      console.log(chalk.green(`✅ Wallet ${id} deleted.`));
    } else {
      console.error(chalk.red(`❌ Wallet ${id} not found.`));
    }
  });

program
  .command('wallet-show')
  .description('Show wallet details (without private key)')
  .argument('<id>', 'Wallet ID')
  .action(id => {
    const wallets = ows.listWallets();
    const wallet = wallets.find(w => w.id === id);
    if (!wallet) {
      console.error(chalk.red(`❌ Wallet ${id} not found.`));
      return;
    }
    console.log(chalk.bold(`\n💳 Wallet Details: ${wallet.name}`));
    console.log(chalk.cyan('ID:'), wallet.id);
    console.log(chalk.cyan('Address:'), wallet.address);
    console.log(chalk.cyan('Created:'), wallet.createdAt);
  });

program
  .command('policy-list')
  .description('List all active OWS policies (Mock)')
  .action(() => {
    console.log(chalk.bold('\n🛡️  Active OWS Policies:'));
    console.log(
      chalk.dim('No specific Kokonut policies pre-defined. Use policy-add to create one.')
    );
  });

program
  .command('policy-add')
  .description('Add a new spend policy to a wallet (Mock)')
  .argument('<wallet-id>', 'Wallet ID')
  .argument('<limit>', 'Spend limit in USDC')
  .action((id, limit) => {
    console.log(
      chalk.green(`✅ Policy added to wallet ${id}: Limit ${limit} USDC per transaction.`)
    );
  });

program
  .command('policy-remove')
  .description('Remove a spend policy (Mock)')
  .argument('<policy-id>', 'Policy ID')
  .action(id => {
    console.log(chalk.green(`✅ Policy ${id} removed.`));
  });

program
  .command('policy-show')
  .description('Show policy details (Mock)')
  .argument('<policy-id>', 'Policy ID')
  .action(id => {
    console.log(chalk.bold(`\n🛡️  Policy Details: ${id}`));
    console.log(chalk.dim('Type: SpendLimit'));
    console.log(chalk.dim('Value: 100 USDC'));
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
      const opts = program.opts();
      initWallet(undefined, opts.wallet, opts.passphrase);

      if (!config.contracts.identityRegistry || config.contracts.identityRegistry === ZeroAddress) {
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
      const identityRegistryABI = parseAbi([
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
      ]);

      const identityRegistry = getContract({
        address: config.contracts.identityRegistry,
        abi: identityRegistryABI,
        client: {
          public: publicClient!,
          wallet: walletClient!,
        },
      } as any) as any;

      // Prepare agent data
      const agentName = options.name || `Agent_${config.signerAddress.slice(2, 10)}`;
      const capabilities = options.capabilities
        ? options.capabilities.split(',')
        : ['coordination'];
      const skills = options.skills ? options.skills.split(',') : ['hermes-agent'];

      console.log(chalk.cyan('\n🌴 Creating Agent Identity...'));
      console.log(chalk.dim('Agent Name:'), agentName);
      console.log(chalk.dim('Wallet:'), config.signerAddress);
      console.log(chalk.dim('Capabilities:'), capabilities.join(', '));
      console.log(chalk.dim('Skills:'), skills.join(', '));

      // Prepare metadata
      const metadata = {
        agentId: `eip155:8453:${config.signerAddress}`,
        name: agentName,
        description: 'AI agent for onchain economy coordination',
        owner: config.signerAddress,
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
      const tx = await identityRegistry.write.register(metadataURI);
      console.log(chalk.cyan('Transaction sent:'), tx);

      const receipt = await waitForTransactionReceipt(tx);
      console.log(chalk.green('✅ Agent registered successfully!'));
      console.log(chalk.cyan('Gas used:'), receipt.gasUsed.toString());

      // Get event data
      let agentId;
      for (const log of receipt.logs) {
        try {
          const parsed = parseLog({ log, abi: identityRegistryABI });
          if (parsed && parsed.eventName === 'Registered') {
            agentId = (parsed.args as { agentId: bigint }).agentId.toString();
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
        const agent = await identityRegistry.read.getAgent([BigInt(agentId)]);
        console.log('\n' + chalk.cyan('🔍 Verification:'));
        console.log(chalk.dim('Owner:'), agent[0]);
        console.log(chalk.dim('URI:'), agent[1].substring(0, 50) + '...');
        console.log(chalk.dim('Wallet:'), agent[2]);
        console.log(chalk.dim('Active:'), agent[3]);
      }
    } catch (error) {
      console.error(chalk.red('❌ Error registering agent:'), (error as Error).message || error);
    }
  });

// 🎯 RESOLVE AGENT COMMAND
program
  .command('resolve-agent')
  .description('Resolve agent identity from wallet address')
  .argument('<address>', 'Agent wallet address')
  .action(async target => {
    try {
      const opts = program.opts();
      initWallet(undefined, opts.wallet, opts.passphrase);

      if (!config.contracts.identityRegistry || config.contracts.identityRegistry === ZeroAddress) {
        console.log(chalk.yellow('⚠️  Identity Registry not deployed yet.'));
        return;
      }

      const identityRegistryABI = parseAbi([
        'function resolveAgent(address agentAddress) external view returns (uint256 tokenId, string memory did)',
        'function getAgent(uint256 tokenId) external view returns (address owner, string memory did, string memory metadataURI)',
        'function isAgent(address agentAddress) external view returns (bool)',
      ]);

      const identityRegistry = getContract({
        address: config.contracts.identityRegistry,
        abi: identityRegistryABI,
        client: publicClient!,
      } as any) as any;

      const address = target;

      if (!(await identityRegistry.read.isAgent([address]))) {
        console.log(chalk.yellow('⚠️  Address is not a registered agent'));
        return;
      }

      const result = await identityRegistry.read.resolveAgent([address]);
      const tokenId = result[0].toString();
      const did = result[1];

      // Get full agent info
      const agent = await identityRegistry.read.getAgent([BigInt(tokenId)]);

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
  .option('--batch-size <number>', 'Batch size for fetching agents (default: 50)', '50')
  .action(async options => {
    try {
      const opts = program.opts();
      initWallet(undefined, opts.wallet, opts.passphrase);

      if (!config.contracts.identityRegistry || config.contracts.identityRegistry === ZeroAddress) {
        console.log(chalk.yellow('⚠️  Identity Registry not deployed yet.'));
        return;
      }

      const identityRegistryABI = parseAbi([
        'function getAgentCount() external view returns (uint256)',
        'function getCurrentTokenId() external view returns (uint256)',
        'function getAgent(uint256 tokenId) external view returns (address owner, string memory did, string memory metadataURI)',
        'function isAgent(address agentAddress) external view returns (bool)',
      ]);

      const identityRegistry = getContract({
        address: config.contracts.identityRegistry,
        abi: identityRegistryABI,
        client: publicClient!,
      } as any) as any;

      const count = await identityRegistry.read.getAgentCount();
      console.log(chalk.green(`\n📊 Total Agents: ${count.toString()}`));

      if (count === 0n) {
        console.log(chalk.dim('No agents registered yet.'));
        return;
      }

      const batchSize = parseInt(options.batchSize) || 50;
      const agents = [];

      // Batch the RPC calls to avoid N+1 pattern
      for (let i = 1n; i <= count; i += BigInt(batchSize)) {
        const batchEnd = BigInt(Math.min(Number(i) + batchSize, Number(count) + 1));
        const batchPromises = [];

        for (let j = i; j < batchEnd; j++) {
          batchPromises.push(
            identityRegistry.read.getAgent([j]).then(agent => ({
              tokenId: j.toString(),
              owner: agent[0],
              did: agent[1],
              metadataURI: agent[2],
            }))
          );
        }

        const batchResults = await Promise.all(batchPromises);
        agents.push(...batchResults);

        // Progress indicator for large lists
        if (count > 100n) {
          const progress = Math.min(Number(i) + batchSize - 1, Number(count));
          process.stdout.write(`\r${chalk.dim(`Fetching agents... ${progress}/${count}`)}`);
        }
      }

      if (count > 100n) {
        console.log(); // New line after progress
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
  .option('--ows-wallet <id>', 'OWS Wallet ID to use')
  .action(async (agentTarget, options) => {
    const rl = createInterface();
    try {
      if (options.owsWallet) {
        const passphrase = await promptPassphrase(rl, 'Enter wallet passphrase: ');
        const pk = ows.getPrivateKey(options.owsWallet, passphrase);
        initWallet(pk);
      } else {
        initWallet();
      }

      if (
        !config.contracts.reputationRegistry ||
        config.contracts.reputationRegistry === ZeroAddress
      ) {
        console.log(chalk.yellow('⚠️  Reputation Registry not deployed yet.'));
        return;
      }

      const reputationRegistryABI = parseAbi([
        'function submitFeedback(address agent, uint256 taskId, int256 rating, string metadataURI) external returns (uint256 feedbackId)',
        'event FeedbackSubmitted(uint256 indexed feedbackId, address indexed agent, address indexed provider, int256 rating)',
      ]);

      const reputationRegistry = getContractInstance(
        config.contracts.reputationRegistry,
        reputationRegistryABI
      );

      const agentAddress = agentTarget as Address;

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
        feedbackProvider: config.signerAddress,
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

      const taskId = options.taskId ? BigInt(options.taskId) : 1n;
      const rating = BigInt(options.rating);

      console.log('\n' + chalk.cyan('📝 Submitting feedback...'));
      const hash = await reputationRegistry.write.submitFeedback([
        agentAddress,
        taskId,
        rating,
        metadataCID,
      ]);

      console.log(chalk.cyan('Transaction sent:'), hash);

      const receipt = await waitForTransactionReceipt(hash);
      console.log(chalk.green('✅ Feedback submitted successfully!'));
      console.log(chalk.cyan('Gas used:'), receipt.gasUsed.toString());

      // Get feedback ID from events
      let feedbackId;
      for (const log of receipt.logs) {
        try {
          const parsed = parseLog({ log, abi: reputationRegistryABI });
          if (parsed && parsed.eventName === 'FeedbackSubmitted') {
            feedbackId = (parsed.args as any).feedbackId.toString();
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
    } finally {
      rl.close();
    }
  });

// 🎯 GET REPUTATION COMMAND
program
  .command('get-reputation')
  .description('Get agent reputation')
  .argument('<agent-address>', 'Agent wallet address')
  .action(async agentTarget => {
    try {
      const opts = program.opts();
      initWallet(undefined, opts.wallet, opts.passphrase);

      if (
        !config.contracts.reputationRegistry ||
        config.contracts.reputationRegistry === ZeroAddress
      ) {
        console.log(chalk.yellow('⚠️  Reputation Registry not deployed yet.'));
        return;
      }

      const reputationRegistryABI = parseAbi([
        'function getAgentReputation(address agent) external view returns (int256 averageRating, uint256 totalFeedbacks, uint256 uniqueProviders)',
      ]);

      const reputationRegistry = getContractInstance(
        config.contracts.reputationRegistry,
        reputationRegistryABI
      );

      const agentAddress = agentTarget as Address;

      const [averageRating, totalFeedbacks, uniqueProviders] =
        await reputationRegistry.read.getAgentReputation([agentAddress]);

      console.log(chalk.green('\n📊 Agent Reputation:'));
      console.log(chalk.cyan('Address:'), agentAddress);
      console.log(chalk.cyan('Average Rating:'), averageRating.toString(), '/ 1000');
      console.log(chalk.cyan('Total Feedbacks:'), totalFeedbacks.toString());
      console.log(chalk.cyan('Unique Providers:'), uniqueProviders.toString());

      // Convert to percentage
      const percentage = Number(averageRating) / 10;
      console.log(chalk.cyan('Score:'), percentage.toFixed(1) + '%');
    } catch (error) {
      console.error(chalk.red('❌ Error getting reputation:'), (error as Error).message);
    }
  });

// 🎯 VERIFY AGENT COMMAND (Verify agent registration)
program
  .command('verify-agent')
  .description('Verify if an address is a registered agent')
  .argument('<address>', 'Agent wallet address')
  .action(async targetAddress => {
    try {
      const opts = program.opts();
      initWallet(undefined, opts.wallet, opts.passphrase);

      if (!config.contracts.identityRegistry || config.contracts.identityRegistry === ZeroAddress) {
        console.log(chalk.yellow('⚠️  Identity Registry not deployed yet.'));
        return;
      }

      const identityRegistryABI = parseAbi([
        'function isAgent(address agentAddress) external view returns (bool)',
        'function getAgentCount() external view returns (uint256)',
      ]);

      const identityRegistry = getContractInstance(
        config.contracts.identityRegistry,
        identityRegistryABI
      );

      const isRegistered = await identityRegistry.read.isAgent([targetAddress as Address]);
      const agentCount = await identityRegistry.read.getAgentCount();

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
        console.log(chalk.cyan('  pnpm run cli -- register-agent --name "YourAgent"'));
      }
    } catch (error) {
      console.error(chalk.red('❌ Error verifying agent:'), error.message);
    }
  });

// 🎯 CREATE SERVICE COMMAND
program
  .command('create-service')
  .description('Create a new service listing')
  .option('--agent-id <number>', 'Agent ID (required)')
  .option('--name <string>', 'Service name')
  .option('--description <string>', 'Service description')
  .option('--price <number>', 'Service price in USDC (6 decimals)', '1000000') // 1 USDC = 1e6
  .option('--metadata <string>', 'Metadata URI (IPFS)')
  .action(async options => {
    try {
      const opts = program.opts();
      initWallet(undefined, opts.wallet, opts.passphrase);

      if (!options.agentId) {
        console.log(chalk.red('❌ --agent-id is required. Use --agent-id <number>'));
        return;
      }

      if (!config.contracts.serviceRegistry || config.contracts.serviceRegistry === ZeroAddress) {
        console.log(chalk.yellow('⚠️  Service Registry not deployed yet.'));
        return;
      }

      const serviceRegistryABI = parseAbi([
        'function createService(uint256 agentId, string name, string description, string metadataURI, uint256 price, address paymentToken) external returns (uint256 serviceId)',
        'event ServiceCreated(uint256 indexed serviceId, address indexed provider, uint256 agentId, string name, uint256 price)',
      ]);

      const serviceRegistry = getContractInstance(
        config.contracts.serviceRegistry,
        serviceRegistryABI
      );

      const agentId = BigInt(options.agentId);
      const name = options.name || 'Agent Service';
      const description = options.description || 'AI agent service';
      const metadataURI = options.metadata || `ipfs://${config.signerAddress}`;
      const price = BigInt(options.price || '1000000');
      const paymentToken = config.contracts.usdc;

      console.log(chalk.cyan('\n🛠️  Creating Service:'));
      console.log(chalk.dim('Agent ID:'), agentId.toString());
      console.log(chalk.dim('Name:'), name);
      console.log(chalk.dim('Description:'), description);
      console.log(chalk.dim('Price:'), price.toString(), 'wei');
      console.log(chalk.dim('Payment Token:'), paymentToken);

      const hash = await serviceRegistry.write.createService([
        agentId,
        name,
        description,
        metadataURI,
        price,
        paymentToken as Address,
      ]);

      console.log(chalk.cyan('Transaction sent:'), hash);

      const receipt = await waitForTransactionReceipt(hash);
      console.log(chalk.green('✅ Service created successfully!'));
      console.log(chalk.cyan('Gas used:'), receipt.gasUsed.toString());

      let serviceId;
      for (const log of receipt.logs) {
        try {
          const parsed = parseLog({ log, abi: serviceRegistryABI });
          if (parsed && parsed.eventName === 'ServiceCreated') {
            serviceId = (parsed.args as any).serviceId.toString();
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
      const opts = program.opts();
      initWallet(undefined, opts.wallet, opts.passphrase);

      if (!config.contracts.serviceRegistry || config.contracts.serviceRegistry === ZeroAddress) {
        console.log(chalk.yellow('⚠️  Service Registry not deployed yet.'));
        return;
      }

      const serviceRegistryABI = parseAbi([
        'function getServices(uint256 start, uint256 count) external view returns (uint256[] memory)',
        'function getService(uint256 serviceId) external view returns ((uint256 id, address provider, uint256 agentId, string name, string description, string metadataURI, uint256 price, address paymentToken, bool isActive, uint256 createdAt))',
      ]);

      const serviceRegistry = getContractInstance(
        config.contracts.serviceRegistry,
        serviceRegistryABI
      );

      const start = BigInt(options.start);
      const count = BigInt(options.count);

      const serviceIds = await serviceRegistry.read.getServices([start, count]);

      console.log(chalk.green(`\n📋 Available Services (${serviceIds.length} shown):`));

      const services = [];
      for (const id of serviceIds) {
        try {
          const service = await serviceRegistry.read.getService([id]);
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
    }
  });

// 🎯 BUY SERVICE COMMAND
program
  .command('buy-service')
  .description('Purchase a service and create a job')
  .argument('<service-id>', 'Service ID to purchase')
  .option('--evaluator <address>', 'Evaluator address for job approval')
  .option('--expiry <number>', 'Job expiry in days', '7')
  .option('--fund-now', 'Fund the job immediately')
  .action(async (serviceId, options) => {
    try {
      const opts = program.opts();
      initWallet(undefined, opts.wallet, opts.passphrase);

      if (!config.contracts.agenticCommerce || config.contracts.agenticCommerce === ZeroAddress) {
        console.log(chalk.yellow('⚠️  Agentic Commerce not deployed yet.'));
        return;
      }

      const serviceRegistryABI = parseAbi([
        'function getService(uint256 serviceId) external view returns ((uint256 id, address provider, uint256 agentId, string name, string description, string metadataURI, uint256 price, address paymentToken, bool isActive, uint256 createdAt))',
      ]);

      const agenticCommerceABI = parseAbi([
        'function createJob(address provider, uint256 budget, address paymentToken, uint256 serviceId, uint256 expiredAt, string description, address evaluator, address hook, bool evaluatorFee, bool clientReview, bool fundNow, uint256 fundAmount) external payable returns (uint256 jobId)',
        'event JobCreated(uint256 indexed jobId, address indexed client, address indexed provider, address evaluator, uint256 serviceId, uint256 expiredAt, bool evaluatorFee, bool clientReview, bool randomEvaluator)',
      ]);

      const serviceRegistry = getContractInstance(
        config.contracts.serviceRegistry,
        serviceRegistryABI
      );
      const commerce = getContractInstance(config.contracts.agenticCommerce, agenticCommerceABI);

      const sid = BigInt(serviceId);
      const service = await serviceRegistry.read.getService([sid]);

      if (!service.isActive) {
        console.log(chalk.red('❌ Service is not active'));
        return;
      }

      console.log(chalk.cyan('\n🛒 Purchasing Service:'));
      console.log(chalk.dim('Service ID:'), serviceId);
      console.log(chalk.dim('Name:'), service.name);
      console.log(chalk.dim('Provider:'), service.provider);
      console.log(chalk.dim('Price:'), service.price.toString(), 'wei');

      const evaluator = (options.evaluator as Address) || zeroAddress;
      const expiryDays = parseInt(options.expiry);
      const expiredAt = BigInt(Math.floor(Date.now() / 1000) + expiryDays * 24 * 60 * 60);
      const fundNow = !!options.fundNow;

      console.log(chalk.cyan('\n📝 Creating Job...'));

      const fundAmount = fundNow ? service.price : 0n;

      const jobHash = await commerce.write.createJob([
        service.provider as Address,
        service.price,
        service.paymentToken as Address,
        sid,
        expiredAt,
        `Purchase: ${service.name}`,
        evaluator,
        zeroAddress,
        true,
        true,
        fundNow,
        fundAmount,
      ], { value: fundNow && service.paymentToken === zeroAddress ? service.price : 0n });
      await waitForTransactionReceipt(jobHash);

      console.log(chalk.green('✅ Budget set!'));
      console.log(chalk.cyan('Now approve USDC and fund the job:'));
      console.log(chalk.dim(`  pnpm run cli -- fund-job ${jobId}`));
    } catch (error) {
      console.error(chalk.red('❌ Error buying service:'), error.message);
    }
  });

// 🎯 FUND JOB COMMAND
program
  .command('fund-job')
  .description('Fund an existing job with payment')
  .argument('<job-id>', 'Job ID to fund')
  .action(async (jobId, _options) => {
    try {
      const opts = program.opts();
      initWallet(undefined, opts.wallet, opts.passphrase);

      if (!config.contracts.agenticCommerce || config.contracts.agenticCommerce === ZeroAddress) {
        console.log(chalk.yellow('⚠️  Agentic Commerce not deployed yet.'));
        return;
      }

      const agenticCommerceABI = parseAbi([
        'function fund(uint256 jobId, uint256 expectedBudget) external payable',
        'function getJob(uint256 jobId) external view returns ((uint256 id, address client, address provider, address evaluator, string description, uint256 budget, uint256 expiredAt, uint8 status, address hook, bytes32 deliverable))',
      ]);

      const commerce = getContractInstance(config.contracts.agenticCommerce, agenticCommerceABI);

      const job = await commerce.read.getJob([BigInt(jobId)]);

      console.log(chalk.cyan('\n💰 Funding Job:'));
      console.log(chalk.dim('Job ID:'), jobId);
      console.log(chalk.dim('Budget:'), job.budget.toString(), 'wei');
      console.log(chalk.dim('Client:'), job.client);

      console.log(chalk.cyan('\n⚠️  Note: Ensure you have approved USDC spending first:'));
      console.log(chalk.dim('  Approve:'), config.contracts.agenticCommerce);
      console.log(chalk.dim('  Amount:'), job.budget.toString());

      // Pass expectedBudget to protect against front-running
      const hash = await commerce.write.fund([BigInt(jobId), job.budget]);
      console.log(chalk.cyan('Transaction sent:'), hash);

      await waitForTransactionReceipt(hash);
      console.log(chalk.green('✅ Job funded successfully!'));
      console.log(chalk.cyan('Provider can now submit their deliverable.'));
    } catch (error) {
      console.error(chalk.red('❌ Error funding job:'), error.message);
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
      const opts = program.opts();
      initWallet(undefined, opts.wallet, opts.passphrase);

      if (!config.contracts.agenticCommerce || config.contracts.agenticCommerce === ZeroAddress) {
        console.log(chalk.yellow('⚠️  Agentic Commerce not deployed yet.'));
        return;
      }

      const agenticCommerceABI = parseAbi([
        'function submit(uint256 jobId, bytes32 deliverable) external',
      ]);

      const commerce = getContractInstance(config.contracts.agenticCommerce, agenticCommerceABI);

      // Using keccak256 as a substitute for ethers.id
      const deliverableBytes32 = viemKeccak256(viemToBytes(deliverableHash));

      console.log(chalk.cyan('\n📦 Submitting Deliverable:'));
      console.log(chalk.dim('Job ID:'), jobId);
      console.log(chalk.dim('Deliverable Hash:'), deliverableHash);
      console.log(chalk.dim('Bytes32:', deliverableBytes32));

      const hash = await commerce.write.submit([BigInt(jobId), deliverableBytes32]);
      console.log(chalk.cyan('Transaction sent:'), hash);

      await waitForTransactionReceipt(hash);
      console.log(chalk.green('✅ Deliverable submitted!'));
      console.log(chalk.cyan('Waiting for evaluator approval...'));
    } catch (error) {
      console.error(chalk.red('❌ Error submitting deliverable:'), error.message);
    }
  });

// 🎯 APPROVE DELIVERABLE COMMAND
program
  .command('approve-deliverable')
  .description('Approve deliverable and release payment (evaluator)')
  .argument('<job-id>', 'Job ID')
  .option('--reason <string>', 'Approval reason/comment')
  .action(async (jobId, options) => {
    try {
      const opts = program.opts();
      initWallet(undefined, opts.wallet, opts.passphrase);

      if (!config.contracts.agenticCommerce || config.contracts.agenticCommerce === ZeroAddress) {
        console.log(chalk.yellow('⚠️  Agentic Commerce not deployed yet.'));
        return;
      }

      const agenticCommerceABI = parseAbi([
        'function finalizeByEvaluator(uint256 jobId, bytes32 reason) external',
      ]);

      const commerce = getContractInstance(config.contracts.agenticCommerce, agenticCommerceABI);

      const reasonBytes32 = viemKeccak256(viemToBytes(options.reason || 'Work approved'));

      console.log(chalk.cyan('\n✅ Finalizing (Evaluator):'));
      console.log(chalk.dim('Job ID:'), jobId);
      console.log(chalk.dim('Reason:'), options.reason || 'Work approved');

      const hash = await commerce.write.finalizeByEvaluator([BigInt(jobId), reasonBytes32]);
      console.log(chalk.cyan('Transaction sent:'), hash);

      const receipt = await waitForTransactionReceipt(hash);
      console.log(chalk.green('✅ Payment released!'));
      console.log(chalk.cyan('Gas used:'), receipt.gasUsed.toString());

      console.log(chalk.green('\n🎊 Job completed successfully!'));
    } catch (error) {
      console.error(chalk.red('❌ Error finalizing:'), error.message);
    }
  });

// 🎯 APPROVE BY CLIENT COMMAND
program
  .command('approve-by-client')
  .description('Client approves delivery (moves job to pending evaluator finalization)')
  .argument('<job-id>', 'Job ID')
  .action(async (jobId) => {
    try {
      const opts = program.opts();
      initWallet(undefined, opts.wallet, opts.passphrase);

      if (!config.contracts.agenticCommerce || config.contracts.agenticCommerce === ZeroAddress) {
        console.log(chalk.yellow('⚠️  Agentic Commerce not deployed yet.'));
        return;
      }

      const agenticCommerceABI = parseAbi([
        'function approveByClient(uint256 jobId) external',
      ]);

      const commerce = getContractInstance(config.contracts.agenticCommerce, agenticCommerceABI);

      console.log(chalk.cyan('\n👤 Approving as Client:'));
      console.log(chalk.dim('Job ID:'), jobId);

      const hash = await commerce.write.approveByClient([BigInt(jobId)]);
      console.log(chalk.cyan('Transaction sent:'), hash);

      const receipt = await waitForTransactionReceipt(hash);
      console.log(chalk.green('✅ Client approved!'));
      console.log(chalk.cyan('Gas used:'), receipt.gasUsed.toString());
    } catch (error) {
      console.error(chalk.red('❌ Error approving as client:'), error.message);
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
      const opts = program.opts();
      initWallet(undefined, opts.wallet, opts.passphrase);

      if (!config.contracts.agenticCommerce || config.contracts.agenticCommerce === ZeroAddress) {
        console.log(chalk.yellow('⚠️  Agentic Commerce not deployed yet.'));
        return;
      }

      const agenticCommerceABI = parseAbi([
        'function reject(uint256 jobId, bytes32 reason) external',
      ]);

      const commerce = getContractInstance(config.contracts.agenticCommerce, agenticCommerceABI);

      const reasonBytes32 = viemKeccak256(viemToBytes(options.reason || 'Work not satisfactory'));

      console.log(chalk.cyan('\n❌ Rejecting Deliverable:'));
      console.log(chalk.dim('Job ID:'), jobId);
      console.log(chalk.dim('Reason:'), options.reason || 'Work not satisfactory');

      const hash = await commerce.write.reject([BigInt(jobId), reasonBytes32]);
      console.log(chalk.cyan('Transaction sent:'), hash);

      await waitForTransactionReceipt(hash);
      console.log(chalk.green('✅ Deliverable rejected.'));
      console.log(chalk.cyan('Provider can resubmit once work is revised.'));
    } catch (error) {
      console.error(chalk.red('❌ Error rejecting deliverable:'), error.message);
    }
  });

// 🎯 GET JOB STATUS COMMAND
program
  .command('job-status')
  .description('Get job status')
  .argument('<job-id>', 'Job ID')
  .action(async (jobId, _options) => {
    try {
      const opts = program.opts();
      initWallet(undefined, opts.wallet, opts.passphrase);

      if (!config.contracts.agenticCommerce || config.contracts.agenticCommerce === ZeroAddress) {
        console.log(chalk.yellow('⚠️  Agentic Commerce not deployed yet.'));
        return;
      }

      const agenticCommerceABI = parseAbi([
        'function getJob(uint256 jobId) external view returns ((uint256 id, address client, address provider, address evaluator, string description, uint256 budget, uint256 expiredAt, uint8 status, address hook, bytes32 deliverable))',
      ]);

      const commerce = getContractInstance(config.contracts.agenticCommerce, agenticCommerceABI);

      const job = await commerce.read.getJob([BigInt(jobId)]);

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
      const opts = program.opts();
      initWallet(undefined, opts.wallet, opts.passphrase);

      if (!config.contracts.agentReview || config.contracts.agentReview === ZeroAddress) {
        console.log(chalk.yellow('⚠️  Agent Review not deployed yet.'));
        return;
      }

      const agentReviewABI = parseAbi([
        'function createProposal(string title, string description, string criteriaURI, uint256 reward, uint256 decisionDeadline) external payable returns (uint256 proposalId)',
        'event ProposalCreated(uint256 indexed proposalId, address indexed proposer, string title, uint256 reward)',
      ]);

      const review = getContractInstance(config.contracts.agentReview, agentReviewABI);

      const title = options.title || 'Proposal A vs B';
      const description = options.description || 'Evaluate options and provide recommendation';
      const criteriaURI = options.criteria || `ipfs://${config.signerAddress}/criteria`;
      const reward = BigInt(options.reward || '0');
      const deadlineDays = parseInt(options.deadline || '7');
      const decisionDeadline = BigInt(Math.floor(Date.now() / 1000) + deadlineDays * 24 * 60 * 60);

      console.log(chalk.cyan('\n📋 Creating Proposal:'));
      console.log(chalk.dim('Title:'), title);
      console.log(chalk.dim('Description:'), description);
      console.log(chalk.dim('Criteria:'), criteriaURI);
      console.log(chalk.dim('Reward:'), reward.toString(), 'wei');
      console.log(chalk.dim('Deadline:'), new Date(Number(decisionDeadline) * 1000).toISOString());

      const hash = await review.write.createProposal(
        [title, description, criteriaURI, reward, decisionDeadline],
        { value: reward }
      );

      console.log(chalk.cyan('Transaction sent:'), hash);

      const receipt = await waitForTransactionReceipt(hash);
      console.log(chalk.green('✅ Proposal created!'));
      console.log(chalk.cyan('Gas used:'), receipt.gasUsed.toString());

      let proposalId;
      for (const log of receipt.logs) {
        try {
          const parsed = parseLog({ log, abi: agentReviewABI });
          if (parsed && parsed.eventName === 'ProposalCreated') {
            proposalId = (parsed.args as any).proposalId.toString();
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
      const opts = program.opts();
      initWallet(undefined, opts.wallet, opts.passphrase);

      if (!config.contracts.agentReview || config.contracts.agentReview === ZeroAddress) {
        console.log(chalk.yellow('⚠️  Agent Review not deployed yet.'));
        return;
      }

      const agentReviewABI = parseAbi([
        'function submitEvaluation(uint256 proposalId, int256 confidenceScore, string reasoningURI) external payable',
      ]);

      const review = getContractInstance(config.contracts.agentReview, agentReviewABI);

      const confidence = BigInt(options.confidence);
      const reasoning = options.reasoning || `ipfs://${config.signerAddress}/reasoning`;
      const stake = BigInt(options.stake);

      console.log(chalk.cyan('\n🎯 Submitting Evaluation:'));
      console.log(chalk.dim('Proposal ID:'), proposalId);
      console.log(chalk.dim('Confidence:'), confidence.toString());
      console.log(chalk.dim('Reasoning:'), reasoning);
      console.log(chalk.dim('Stake:'), stake.toString(), 'wei');

      const hash = await review.write.submitEvaluation(
        [BigInt(proposalId), confidence, reasoning],
        { value: stake }
      );

      console.log(chalk.cyan('Transaction sent:'), hash);

      await waitForTransactionReceipt(hash);
      console.log(chalk.green('✅ Evaluation submitted!'));
    } catch (error) {
      console.error(chalk.red('❌ Error submitting evaluation:'), error.message);
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
      const opts = program.opts();
      initWallet(undefined, opts.wallet, opts.passphrase);

      if (!config.contracts.agentReview || config.contracts.agentReview === ZeroAddress) {
        console.log(chalk.yellow('⚠️  Agent Review not deployed yet.'));
        return;
      }

      const agentReviewABI = parseAbi([
        'function attestDecision(uint256 proposalId, address winningEvaluator) external',
      ]);

      const review = getContractInstance(config.contracts.agentReview, agentReviewABI);

      console.log(chalk.cyan('\n✅ Attesting Decision:'));
      console.log(chalk.dim('Proposal ID:'), proposalId);
      console.log(chalk.dim('Winner:'), winner);

      const hash = await review.write.attestDecision([BigInt(proposalId), winner as Address]);

      console.log(chalk.cyan('Transaction sent:'), hash);

      await waitForTransactionReceipt(hash);
      console.log(chalk.green('✅ Decision attested!'));
      console.log(chalk.green('Reward has been released to the winner.'));
    } catch (error) {
      console.error(chalk.red('❌ Error attesting decision:'), error.message);
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
      const opts = program.opts();
      initWallet(undefined, opts.wallet, opts.passphrase);

      if (!config.contracts.agentReview || config.contracts.agentReview === ZeroAddress) {
        console.log(chalk.yellow('⚠️  Agent Review not deployed yet.'));
        return;
      }

      const agentReviewABI = parseAbi([
        'function getProposal(uint256 proposalId) external view returns ((uint256 id, address proposer, string title, string description, string criteriaURI, uint256 reward, uint8 status, uint256 createdAt, uint256 decisionDeadline, address winningEvaluator))',
        'function getProposalEvaluators(uint256 proposalId) external view returns (address[])',
        'function getEvaluation(uint256 proposalId, address evaluator) external view returns ((uint256 proposalId, address evaluator, int256 confidenceScore, string reasoningURI, uint256 stakeAmount, bool isFinal, uint256 submittedAt))',
      ]);

      const review = getContractInstance(config.contracts.agentReview, agentReviewABI);

      const proposal = await review.read.getProposal([BigInt(proposalId)]);

      const statusNames = ['Open', 'UnderReview', 'Decided', 'Cancelled'];
      const status = statusNames[proposal.status] || 'Unknown';

      const evaluators = await review.read.getProposalEvaluators([BigInt(proposalId)]);
      const evaluations = [];

      for (const evaluator of evaluators) {
        const evaluation = await review.read.getEvaluation([BigInt(proposalId), evaluator]);
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
        if (proposal.winningEvaluator !== zeroAddress) {
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
              `  ${evaluation.evaluator}: ${scoreDisplay}/1000 (${viemFormatEther(BigInt(evaluation.stakeAmount))} ETH staked)`
            )
          );
        }
      }
    } catch (error) {
      console.error(chalk.red('❌ Error getting proposal status:'), error.message);
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
      const opts = program.opts();
      initWallet(undefined, opts.wallet, opts.passphrase);

      if (!config.contracts.agenticCommerce || config.contracts.agenticCommerce === ZeroAddress) {
        console.log(chalk.yellow('⚠️  Agentic Commerce not deployed yet.'));
        return;
      }

      const agenticCommerceABI = parseAbi([
        'function getJob(uint256 jobId) external view returns ((uint256 id, address client, address provider, address evaluator, string description, uint256 budget, uint256 expiredAt, uint8 status, address hook, bytes32 deliverable))',
        'function getCurrentJobId() external view returns (uint256)',
        'function getProviderJobs(address provider) external view returns (uint256[])',
      ]);

      const commerce = getContractInstance(
        config.contracts.agenticCommerce as Address,
        agenticCommerceABI
      );

      const pollInterval = parseInt(options.pollInterval) * 1000;
      let lastJobId = Number((await commerce.read.getCurrentJobId()) as bigint);

      console.log(chalk.green('\n🔔 Listening for jobs...'));
      console.log(chalk.dim('Provider:'), config.signerAddress);
      console.log(chalk.dim('Poll Interval:'), options.pollInterval, 'seconds');
      console.log(chalk.dim('Last Job ID:', lastJobId));
      console.log(chalk.dim('Press Ctrl+C to stop\n'));

      while (true) {
        const currentJobId = Number((await commerce.read.getCurrentJobId()) as bigint);

        if (currentJobId > lastJobId) {
          for (let jobId = lastJobId + 1; jobId <= currentJobId; jobId++) {
            try {
              const job = (await commerce.read.getJob([BigInt(jobId)])) as any;

              if (job.provider.toLowerCase() === config.signerAddress.toLowerCase()) {
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
      const opts = program.opts();
      initWallet(undefined, opts.wallet, opts.passphrase);

      if (
        !config.contracts.reputationRegistry ||
        config.contracts.reputationRegistry === ZeroAddress
      ) {
        console.log(chalk.yellow('⚠️  Reputation Registry not deployed yet.'));
        return;
      }

      const targetAddress = (agentAddress as Address) || config.signerAddress;

      const reputationRegistryABI = parseAbi([
        'function getAgentReputation(address agent) external view returns (int256 averageRating, uint256 totalFeedbacks, uint256 uniqueProviders)',
      ]);

      const reputationRegistry = getContractInstance(
        config.contracts.reputationRegistry,
        reputationRegistryABI
      );

      const pollInterval = parseInt(options.pollInterval) * 1000;
      let lastFeedbacks = 0n;

      console.log(chalk.green('\n📈 Monitoring Reputation...'));
      console.log(chalk.dim('Agent:'), targetAddress);
      console.log(chalk.dim('Poll Interval:'), options.pollInterval, 'seconds');
      console.log(chalk.dim('Press Ctrl+C to stop\n'));

      while (true) {
        const [averageRating, totalFeedbacks, uniqueProviders] =
          await reputationRegistry.read.getAgentReputation([targetAddress]);

        if (totalFeedbacks > lastFeedbacks) {
          const score = Number(averageRating) / 10;
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
          lastFeedbacks = totalFeedbacks;
        }

        await new Promise(resolve => setTimeout(resolve, pollInterval));
      }
    } catch (error) {
      console.error(chalk.red('❌ Error monitoring reputation:'), error.message);
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
      const opts = program.opts();
      initWallet(undefined, opts.wallet, opts.passphrase);

      const targetAddress = (agentAddress as Address) || config.signerAddress;

      const identityRegistryABI = parseAbi([
        'function isAgent(address agentAddress) external view returns (bool)',
        'function getAgent(uint256 agentId) external view returns (address owner, string agentURI, address agentWallet, bool isActive)',
        'function resolveAgent(address agentAddress) external view returns (uint256 agentId, string agentURI)',
      ]);

      const reputationRegistryABI = parseAbi([
        'function getAgentReputation(address agent) external view returns (int256 averageRating, uint256 totalFeedbacks, uint256 uniqueProviders)',
      ]);

      const identityRegistry = getContractInstance(
        config.contracts.identityRegistry,
        identityRegistryABI
      );
      const reputationRegistry = getContractInstance(
        config.contracts.reputationRegistry,
        reputationRegistryABI
      );

      const isRegistered = await identityRegistry.read.isAgent([targetAddress]);

      if (!isRegistered) {
        if (options.json) {
          console.log(JSON.stringify({ address: targetAddress, registered: false }));
        } else {
          console.log(chalk.yellow('⚠️  Address is not a registered agent'));
        }
        return;
      }

      // Use resolveAgent for O(1) lookup instead of iterating
      const [agentId, agentURI] = await identityRegistry.read.resolveAgent([targetAddress]);
      const agentData = (await identityRegistry.read.getAgent([agentId])) as [
        Address,
        string,
        Address,
        boolean,
      ];

      const [averageRating, totalFeedbacks, uniqueProviders] =
        await reputationRegistry.read.getAgentReputation([targetAddress]);

      const result = {
        address: targetAddress,
        registered: true,
        agentId: agentId.toString(),
        owner: agentData[0],
        agentWallet: agentData[2],
        isActive: agentData[3],
        reputation: {
          averageRating: (Number(averageRating) / 10).toFixed(1),
          totalFeedbacks: Number(totalFeedbacks),
          uniqueProviders: Number(uniqueProviders),
        },
        metadataURI: agentURI,
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
      const opts = program.opts();
      initWallet(undefined, opts.wallet, opts.passphrase);

      const targetAddress = (address as Address) || config.signerAddress;

      const usdcABI = parseAbi([
        'function balanceOf(address account) external view returns (uint256)',
      ]);

      const usdc = getContractInstance(config.contracts.usdc as Address, usdcABI);

      const ethBalance = await publicClient!.getBalance({ address: targetAddress });
      const usdcBalance = (await usdc.read.balanceOf([targetAddress])) as bigint;

      const result = {
        address: targetAddress,
        eth: viemFormatEther(ethBalance),
        usdc: (Number(usdcBalance) / 1e6).toFixed(2),
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
      const opts = program.opts();
      initWallet(undefined, opts.wallet, opts.passphrase);

      const skillRegistryABI = parseAbi([
        'function registerSkill(uint256 agentId, string name, string version, string description, string endpoint, string[] domains) external returns (uint256 skillId)',
        'event SkillRegistered(uint256 indexed skillId, uint256 indexed agentId, string name, string version)',
      ]);

      const skillRegistry = getContractInstance(
        config.contracts.skillRegistry as Address,
        skillRegistryABI
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

      const hash = await skillRegistry.write.registerSkill([
        agentId,
        name,
        version,
        description,
        endpoint,
        domains,
      ]);
      console.log(chalk.cyan('\n📤 Transaction sent:'), hash);

      const receipt = await waitForTransactionReceipt(hash);
      console.log(chalk.green('✅ Skill registered successfully!'));
      console.log(chalk.cyan('Gas used:'), receipt.gasUsed.toString());

      let skillId;
      for (const log of receipt.logs) {
        try {
          const parsed = parseLog({ log, abi: skillRegistryABI });
          if (parsed && parsed.eventName === 'SkillRegistered') {
            skillId = (parsed.args as any).skillId.toString();
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
      const err = error as { message?: string };
      console.error(chalk.red('❌ Error registering skill:'), err.message);
    }
  });

// 🎯 LIST SKILLS COMMAND
program
  .command('list-skills')
  .description('List skills for an agent')
  .requiredOption('--agent-id <number>', 'Agent ID (required)')
  .action(async options => {
    try {
      const opts = program.opts();
      initWallet(undefined, opts.wallet, opts.passphrase);

      const skillRegistryABI = parseAbi([
        'function getAgentSkills(uint256 agentId) external view returns (uint256[] memory)',
        'function getSkill(uint256 skillId) external view returns ((uint256 agentId, string name, string version, string description, string endpoint, string[] domains, bool isActive, address registeredBy, uint256 registeredAt))',
      ]);

      const skillRegistry = getContractInstance(
        config.contracts.skillRegistry as Address,
        skillRegistryABI
      );

      const agentId = BigInt(options.agentId);
      const skillIds = (await skillRegistry.read.getAgentSkills([agentId])) as bigint[];

      if (skillIds.length === 0) {
        console.log(chalk.yellow('\n⚠️  No skills found for agent ID:'), options.agentId);
        return;
      }

      console.log(chalk.cyan('\n📋 Skills for Agent ID:'), options.agentId);
      console.log(chalk.dim('Total:'), skillIds.length, 'skills\n');

      for (const skillId of skillIds) {
        const skill = await skillRegistry.read.getSkill([skillId]);
        console.log(chalk.bold(`\nSkill ID: ${skillId}`));
        console.log(chalk.dim('  Name:'), skill.name, `(${skill.version})`);
        console.log(chalk.dim('  Description:'), skill.description || '(none)');
        console.log(chalk.dim('  Endpoint:'), skill.endpoint || '(none)');
        console.log(chalk.dim('  Domains:'), skill.domains.join(', ') || '(none)');
        console.log(chalk.dim('  Active:'), skill.isActive ? chalk.green('Yes') : chalk.red('No'));
        console.log(chalk.dim('  Registered by:'), skill.registeredBy);
      }
    } catch (error: unknown) {
      const err = error as { message?: string };
      console.error(chalk.red('❌ Error listing skills:'), err.message);
    }
  });

// 🎯 DEACTIVATE SKILL COMMAND
program
  .command('deactivate-skill')
  .description('Deactivate a skill')
  .requiredOption('--skill-id <number>', 'Skill ID (required)')
  .action(async options => {
    try {
      const opts = program.opts();
      initWallet(undefined, opts.wallet, opts.passphrase);

      const skillRegistryABI = parseAbi(['function deactivateSkill(uint256 skillId) external']);

      const skillRegistry = getContractInstance(
        config.contracts.skillRegistry as Address,
        skillRegistryABI
      );

      const skillId = BigInt(options.skillId);

      console.log(chalk.cyan('\n⚠️  Deactivating Skill:'));
      console.log(chalk.dim('Skill ID:'), skillId.toString());

      const hash = await skillRegistry.write.deactivateSkill([skillId]);
      console.log(chalk.cyan('\n📤 Transaction sent:'), hash);

      const receipt = await waitForTransactionReceipt(hash);
      console.log(chalk.green('✅ Skill deactivated successfully!'));
      console.log(chalk.cyan('Gas used:'), receipt.gasUsed.toString());
    } catch (error: unknown) {
      const err = error as { message?: string };
      console.error(chalk.red('❌ Error deactivating skill:'), err.message);
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
      const opts = program.opts();
      initWallet(undefined, opts.wallet, opts.passphrase);

      const priceOracleABI = parseAbi([
        'function getUSDCPrice() external view returns (uint256)',
        'function isStale() external view returns (bool)',
      ]);

      const priceOracle = getContractInstance(
        config.contracts.priceOracle as Address,
        priceOracleABI
      );

      const price = (await priceOracle.read.getUSDCPrice()) as bigint;
      const stale = await priceOracle.read.isStale();

      console.log(chalk.cyan('\n💵 USDC Price:'));
      console.log(chalk.bold('  Price:'), (Number(price) / 1e8).toFixed(2), 'USD');
      console.log(chalk.dim('  Raw:'), price.toString(), 'wei (8 decimals)');
      console.log(chalk.dim('  Stale:'), stale ? chalk.red('Yes') : chalk.green('No'));
    } catch (error: unknown) {
      const err = error as { message?: string };
      console.error(chalk.red('❌ Error getting price:'), err.message);
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
      const opts = program.opts();
      initWallet(undefined, opts.wallet, opts.passphrase);

      const commitRevealABI = parseAbi(['function commit(bytes32 commitment) external']);

      const commitReveal = getContractInstance(
        config.contracts.commitReveal as Address,
        commitRevealABI
      );

      const commitment = options.hash as `0x${string}`;

      console.log(chalk.cyan('\n🔐 Making Commitment:'));
      console.log(chalk.dim('Hash:'), commitment);

      const hash = await commitReveal.write.commit([commitment]);
      console.log(chalk.cyan('\n📤 Transaction sent:'), hash);

      const receipt = await waitForTransactionReceipt(hash);
      console.log(chalk.green('✅ Commitment submitted!'));
      console.log(chalk.cyan('Gas used:'), receipt.gasUsed.toString());
    } catch (error: unknown) {
      const err = error as { message?: string };
      console.error(chalk.red('❌ Error committing:'), err.message);
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
      const opts = program.opts();
      initWallet(undefined, opts.wallet, opts.passphrase);

      const commitRevealABI = parseAbi([
        'function reveal(string data, uint256 nonce, uint256 serviceId) external',
      ]);

      const commitReveal = getContractInstance(
        config.contracts.commitReveal as Address,
        commitRevealABI
      );

      console.log(chalk.cyan('\n🔓 Revealing:'));
      console.log(chalk.dim('Data:'), options.data);
      console.log(chalk.dim('Nonce:'), options.nonce);
      console.log(chalk.dim('Service ID:'), options.serviceId);

      const hash = await commitReveal.write.reveal([
        options.data,
        BigInt(options.nonce),
        BigInt(options.serviceId),
      ]);
      console.log(chalk.cyan('\n📤 Transaction sent:'), hash);

      const receipt = await waitForTransactionReceipt(hash);
      console.log(chalk.green('✅ Reveal successful!'));
      console.log(chalk.cyan('Gas used:'), receipt.gasUsed.toString());
    } catch (error: unknown) {
      const err = error as { message?: string };
      console.error(chalk.red('❌ Error revealing:'), err.message);
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
      const opts = program.opts();
      initWallet(undefined, opts.wallet, opts.passphrase);

      const slashManagerABI = parseAbi([
        'function createProposal(address evaluator, uint256 proposalId, uint256 amount, string reason) external returns (bytes32)',
        'function isSigner(address account) external view returns (bool)',
      ]);

      const slashManager = getContractInstance(
        config.contracts.slashManager as Address,
        slashManagerABI
      );

      const isSigner = await slashManager.read.isSigner([config.signerAddress]);
      if (!isSigner) {
        console.error(chalk.red('❌ Error: Only signers can create slash proposals'));
        console.error(chalk.cyan('Your address:'), config.signerAddress);
        return;
      }

      console.log(chalk.cyan('\n⚡ Creating Slash Proposal:'));
      console.log(chalk.dim('Evaluator:'), options.evaluator);
      console.log(chalk.dim('Proposal ID:'), options.proposalId);
      console.log(chalk.dim('Amount:'), options.amount, 'wei');
      console.log(chalk.dim('Reason:'), options.reason);

      const hash = await slashManager.write.createProposal([
        options.evaluator as Address,
        BigInt(options.proposalId),
        BigInt(options.amount),
        options.reason,
      ]);
      console.log(chalk.cyan('\n📤 Transaction sent:'), hash);

      const receipt = await waitForTransactionReceipt(hash);
      console.log(chalk.green('✅ Slash proposal created!'));
      console.log(chalk.cyan('Gas used:'), receipt.gasUsed.toString());
    } catch (error: unknown) {
      const err = error as { message?: string };
      console.error(chalk.red('❌ Error creating slash proposal:'), err.message);
    }
  });

// 🎯 CONFIRM SLASH PROPOSAL COMMAND
program
  .command('slash-confirm')
  .description('Confirm a slash proposal (signers only)')
  .requiredOption('--proposal-id <string>', 'Proposal ID (required)')
  .action(async options => {
    try {
      const opts = program.opts();
      initWallet(undefined, opts.wallet, opts.passphrase);

      const slashManagerABI = parseAbi([
        'function confirmProposal(bytes32 proposalId) external',
        'function isSigner(address account) external view returns (bool)',
      ]);

      const slashManager = getContractInstance(
        config.contracts.slashManager as Address,
        slashManagerABI
      );

      const isSigner = await slashManager.read.isSigner([config.signerAddress]);
      if (!isSigner) {
        console.error(chalk.red('❌ Error: Only signers can confirm slash proposals'));
        return;
      }

      console.log(chalk.cyan('\n✓ Confirming Slash Proposal:'));
      console.log(chalk.dim('Proposal ID:'), options.proposalId);

      const hash = await slashManager.write.confirmProposal([options.proposalId as `0x${string}`]);
      console.log(chalk.cyan('\n📤 Transaction sent:'), hash);

      await waitForTransactionReceipt(hash);
      console.log(chalk.green('✅ Proposal confirmed!'));
    } catch (error: unknown) {
      const err = error as { message?: string };
      console.error(chalk.red('❌ Error confirming:'), err.message);
    }
  });

// 🎯 EXECUTE SLASH PROPOSAL COMMAND
program
  .command('slash-execute')
  .description('Execute a slash proposal (Signers only)')
  .requiredOption('--proposal-id <string>', 'Proposal ID (required)')
  .action(async options => {
    try {
      const opts = program.opts();
      initWallet(undefined, opts.wallet, opts.passphrase);

      const slashManagerABI = parseAbi([
        'function executeProposal(bytes32 proposalId) external',
        'function isSigner(address account) external view returns (bool)',
      ]);

      const slashManager = getContractInstance(
        config.contracts.slashManager as Address,
        slashManagerABI
      );

      const isSigner = (await slashManager.read.isSigner([
        config.signerAddress as Address,
      ])) as boolean;
      if (!isSigner) {
        console.error(chalk.red('❌ Error: Only signers can execute slash proposals'));
        return;
      }

      console.log(chalk.cyan('\n⚡ Executing Slash Proposal:'));
      console.log(chalk.dim('Proposal ID:'), options.proposalId);

      const hash = await slashManager.write.executeProposal([options.proposalId as `0x${string}`]);
      console.log(chalk.cyan('\n📤 Transaction sent:'), hash);

      await waitForTransactionReceipt(hash);
      console.log(chalk.green('✅ Slash executed!'));
    } catch (error: unknown) {
      const err = error as { message?: string };
      console.error(chalk.red('❌ Error executing:'), err.message);
    }
  });

// 🎯 CHECK SIGNER COMMAND
program
  .command('check-signer')
  .description('Check if an address is a slash manager signer')
  .option('--address <address>', 'Address to check (defaults to connected wallet)')
  .action(async options => {
    try {
      const opts = program.opts();
      initWallet(undefined, opts.wallet, opts.passphrase);

      const slashManagerABI = parseAbi([
        'function isSigner(address account) external view returns (bool)',
      ]);
      const slashManager = getContractInstance(
        config.contracts.slashManager as Address,
        slashManagerABI
      );

      const address = (options.address as Address) || config.signerAddress;
      const isSigner = (await slashManager.read.isSigner([address])) as boolean;

      console.log(chalk.cyan('\n🔍 Signer Check:'));
      console.log(chalk.dim('Address:'), address);
      console.log(chalk.bold('  Is Signer:'), isSigner ? chalk.green('YES ✓') : chalk.red('NO ✗'));
    } catch (error: unknown) {
      const err = error as { message?: string };
      console.error(chalk.red('❌ Error:'), err.message);
    }
  });

// ============================================================================
// ADMIN REGISTRY COMMANDS
// ============================================================================

program
  .command('set-slash-manager')
  .description('Set the SlashManager address in AdminRegistry (owner only)')
  .requiredOption('--address <address>', 'SlashManager contract address (required)')
  .action(async options => {
    try {
      const opts = program.opts();
      initWallet(undefined, opts.wallet, opts.passphrase);

      const adminRegistryABI = parseAbi([
        'function setSlashManager(address _slashManager) external',
        'function owner() external view returns (address)',
      ]);

      const adminRegistry = getContractInstance(
        config.contracts.adminRegistry as Address,
        adminRegistryABI
      );

      const owner = await adminRegistry.read.owner();
      if (owner.toLowerCase() !== config.signerAddress.toLowerCase()) {
        console.error(chalk.red('❌ Error: Only owner can set slash manager'));
        console.error(chalk.cyan('Owner:'), owner);
        console.error(chalk.cyan('Your address:'), config.signerAddress);
        return;
      }

      console.log(chalk.cyan('\n⚡ Setting SlashManager:'));
      console.log(chalk.dim('Address:'), options.address);

      const hash = await adminRegistry.write.setSlashManager([options.address as Address]);
      console.log(chalk.cyan('\n📤 Transaction sent:'), hash);

      const receipt = await waitForTransactionReceipt(hash);
      console.log(chalk.green('✅ SlashManager set successfully!'));
      console.log(chalk.cyan('Gas used:'), receipt.gasUsed.toString());
    } catch (error: unknown) {
      const err = error as { message?: string };
      console.error(chalk.red('❌ Error setting slash manager:'), err.message);
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
      const opts = program.opts();
      initWallet(undefined, opts.wallet, opts.passphrase);

      const commerceABI = parseAbi([
        'function claimRefund(uint256 jobId) external',
        'function getJob(uint256 jobId) external view returns ((uint256 id, address client, address provider, address evaluator, string description, uint256 budget, uint256 expiredAt, uint8 status, address hook, bytes32 deliverable))',
      ]);

      const commerce = getContractInstance(
        config.contracts.agenticCommerce as Address,
        commerceABI
      );

      const jobId = BigInt(options.jobId);
      const job = (await commerce.read.getJob([jobId])) as any;

      console.log(chalk.cyan('\n💰 Claiming Refund:'));
      console.log(chalk.dim('Job ID:'), jobId.toString());
      console.log(chalk.dim('Budget:'), job.budget.toString(), 'wei');
      console.log(chalk.dim('Expired at:'), new Date(Number(job.expiredAt) * 1000).toISOString());

      const hash = await commerce.write.claimRefund([jobId]);
      console.log(chalk.cyan('\n📤 Transaction sent:'), hash);

      await waitForTransactionReceipt(hash);
      console.log(chalk.green('✅ Refund claimed!'));
    } catch (error: unknown) {
      const err = error as { message?: string };
      console.error(chalk.red('❌ Error claiming refund:'), err.message);
    }
  });

// ============================================================================
// V6 BIDDING COMMANDS
// 🎯 COMPLETE AFTER TIMEOUT COMMAND
program
  .command('complete-after-timeout')
  .description('Complete a job after the dispute window has passed')
  .argument('<job-id>', 'Job ID')
  .action(async (jobId) => {
    try {
      const opts = program.opts();
      initWallet(undefined, opts.wallet, opts.passphrase);

      if (!config.contracts.agenticCommerce || config.contracts.agenticCommerce === ZeroAddress) {
        console.log(chalk.yellow('⚠️  Agentic Commerce not deployed yet.'));
        return;
      }

      const abi = parseAbi([
        'function completeAfterTimeout(uint256 jobId, bytes32 reason) external',
      ]);

      const commerce = getContractInstance(config.contracts.agenticCommerce, abi);
      const reason = viemKeccak256(viemToBytes('timeout-completed'));

      console.log(chalk.cyan('\n⏰ Completing After Timeout:'));
      console.log(chalk.dim('Job ID:'), jobId);

      const hash = await commerce.write.completeAfterTimeout([BigInt(jobId), reason]);
      console.log(chalk.cyan('Transaction sent:'), hash);

      const receipt = await waitForTransactionReceipt(hash);
      console.log(chalk.green('✅ Job completed after timeout!'));
      console.log(chalk.cyan('Gas used:'), receipt.gasUsed.toString());
    } catch (error: unknown) {
      const err = error as { message?: string };
      console.error(chalk.red('❌ Error completing after timeout:'), err.message);
    }
  });

// 🎯 REFUND EXPIRED COMMAND
program
  .command('refund-expired')
  .description('Trigger a permissionless refund for an expired job')
  .argument('<job-id>', 'Job ID')
  .action(async (jobId) => {
    try {
      const opts = program.opts();
      initWallet(undefined, opts.wallet, opts.passphrase);

      if (!config.contracts.agenticCommerce || config.contracts.agenticCommerce === ZeroAddress) {
        console.log(chalk.yellow('⚠️  Agentic Commerce not deployed yet.'));
        return;
      }

      const abi = parseAbi([
        'function refundExpired(uint256 jobId) external',
      ]);

      const commerce = getContractInstance(config.contracts.agenticCommerce, abi);

      console.log(chalk.cyan('\n💸 Triggering Refund (Expired Job):'));
      console.log(chalk.dim('Job ID:'), jobId);

      const hash = await commerce.write.refundExpired([BigInt(jobId)]);
      console.log(chalk.cyan('Transaction sent:'), hash);

      const receipt = await waitForTransactionReceipt(hash);
      console.log(chalk.green('✅ Refund triggered!'));
      console.log(chalk.cyan('Gas used:'), receipt.gasUsed.toString());
    } catch (error: unknown) {
      const err = error as { message?: string };
      console.error(chalk.red('❌ Error triggering refund:'), err.message);
    }
  });

// 🎯 REGISTER EVALUATOR COMMAND
program
  .command('register-evaluator')
  .description('Register as an evaluator (0.01 ETH stake)')
  .action(async () => {
    try {
      const opts = program.opts();
      initWallet(undefined, opts.wallet, opts.passphrase);

      if (!config.contracts.agenticCommerce || config.contracts.agenticCommerce === ZeroAddress) {
        console.log(chalk.yellow('⚠️  Agentic Commerce not deployed yet.'));
        return;
      }

      const abi = parseAbi([
        'function registerAsEvaluator() external payable',
      ]);

      const commerce = getContractInstance(config.contracts.agenticCommerce, abi);

      console.log(chalk.cyan('\n📝 Registering as Evaluator...'));
      const hash = await commerce.write.registerAsEvaluator([], { value: BigInt(0.01e18) });
      console.log(chalk.cyan('Transaction sent:'), hash);

      const receipt = await waitForTransactionReceipt(hash);
      console.log(chalk.green('✅ Registered as evaluator!'));
      console.log(chalk.cyan('Gas used:'), receipt.gasUsed.toString());
    } catch (error: unknown) {
      const err = error as { message?: string };
      console.error(chalk.red('❌ Error registering as evaluator:'), err.message);
    }
  });

// 🎯 UNREGISTER EVALUATOR COMMAND
program
  .command('unregister-evaluator')
  .description('Unregister as an evaluator and recover stake')
  .action(async () => {
    try {
      const opts = program.opts();
      initWallet(undefined, opts.wallet, opts.passphrase);

      if (!config.contracts.agenticCommerce || config.contracts.agenticCommerce === ZeroAddress) {
        console.log(chalk.yellow('⚠️  Agentic Commerce not deployed yet.'));
        return;
      }

      const abi = parseAbi([
        'function unregisterAsEvaluator() external',
      ]);

      const commerce = getContractInstance(config.contracts.agenticCommerce, abi);

      console.log(chalk.cyan('\n📝 Unregistering as Evaluator...'));
      const hash = await commerce.write.unregisterAsEvaluator([]);
      console.log(chalk.cyan('Transaction sent:'), hash);

      const receipt = await waitForTransactionReceipt(hash);
      console.log(chalk.green('✅ Unregistered as evaluator!'));
      console.log(chalk.cyan('Gas used:'), receipt.gasUsed.toString());
    } catch (error: unknown) {
      const err = error as { message?: string };
      console.error(chalk.red('❌ Error unregistering as evaluator:'), err.message);
    }
  });

// 🎯 EVALUATOR POOL SIZE COMMAND
program
  .command('evaluator-pool-size')
  .description('Get the number of registered evaluators')
  .action(async () => {
    try {
      if (!config.contracts.agenticCommerce || config.contracts.agenticCommerce === ZeroAddress) {
        console.log(chalk.yellow('⚠️  Agentic Commerce not deployed yet.'));
        return;
      }

      const abi = parseAbi([
        'function getEvaluatorPoolSize() external view returns (uint256)',
      ]);

      const commerce = getContractInstance(config.contracts.agenticCommerce, abi);
      const size = await commerce.read.getEvaluatorPoolSize([]);

      console.log(chalk.cyan(`📊 Evaluator pool size: ${size.toString()}`));
    } catch (error: unknown) {
      const err = error as { message?: string };
      console.error(chalk.red('❌ Error getting pool size:'), err.message);
    }
  });

// 🎯 CLEANUP STALE EVALUATORS COMMAND
program
  .command('cleanup-evaluators')
  .description('Remove stale evaluators from the pool')
  .action(async () => {
    try {
      const opts = program.opts();
      initWallet(undefined, opts.wallet, opts.passphrase);

      if (!config.contracts.agenticCommerce || config.contracts.agenticCommerce === ZeroAddress) {
        console.log(chalk.yellow('⚠️  Agentic Commerce not deployed yet.'));
        return;
      }

      const abi = parseAbi([
        'function cleanupStaleEvaluators() external returns (uint256)',
      ]);

      const commerce = getContractInstance(config.contracts.agenticCommerce, abi);

      console.log(chalk.cyan('\n🧹 Cleaning up stale evaluators...'));
      const hash = await commerce.write.cleanupStaleEvaluators([]);
      console.log(chalk.cyan('Transaction sent:'), hash);

      const receipt = await waitForTransactionReceipt(hash);
      console.log(chalk.green('✅ Stale evaluators cleaned!'));
      console.log(chalk.cyan('Gas used:'), receipt.gasUsed.toString());
    } catch (error: unknown) {
      const err = error as { message?: string };
      console.error(chalk.red('❌ Error cleaning evaluators:'), err.message);
    }
  });

// 🎯 JOB BUDGET COMMAND
program
  .command('job-budget')
  .description('Set or view the budget for a job')
  .argument('<job-id>', 'Job ID')
  .option('--set <amount>', 'Set budget amount (in wei)')
  .action(async (jobId, options) => {
    try {
      if (!config.contracts.agenticCommerce || config.contracts.agenticCommerce === ZeroAddress) {
        console.log(chalk.yellow('⚠️  Agentic Commerce not deployed yet.'));
        return;
      }

      if (options.set) {
        const opts = program.opts();
        initWallet(undefined, opts.wallet, opts.passphrase);

        const abi = parseAbi([
          'function setBudget(uint256 jobId, uint256 amount) external',
        ]);
        const commerce = getContractInstance(config.contracts.agenticCommerce, abi);

        console.log(chalk.cyan('\n💰 Setting Budget:'));
        console.log(chalk.dim('Job ID:'), jobId);
        console.log(chalk.dim('Amount:'), options.set, 'wei');

        const hash = await commerce.write.setBudget([BigInt(jobId), BigInt(options.set)]);
        console.log(chalk.cyan('Transaction sent:'), hash);

        const receipt = await waitForTransactionReceipt(hash);
        console.log(chalk.green('✅ Budget set!'));
      } else {
        const abi = parseAbi([
          'function jobs(uint256) external view returns (uint256 id, address client, address provider, address evaluator, uint256 serviceId, address paymentToken, string description, uint256 budget, uint256 expiredAt, uint8 status, address hook, bytes32 deliverable)',
        ]);
        const commerce = getContractInstance(config.contracts.agenticCommerce, abi);
        const job = await commerce.read.jobs([BigInt(jobId)]);
        console.log(chalk.cyan(`💰 Budget for job #${jobId}: ${(job as any).budget?.toString() || 'N/A'} wei`));
      }
    } catch (error: unknown) {
      const err = error as { message?: string };
      console.error(chalk.red('❌ Error:', err.message));
    }
  });

// 🎯 JOB PAYMENT TOKEN COMMAND
program
  .command('job-payment-token')
  .description('Set or view the payment token for a job')
  .argument('<job-id>', 'Job ID')
  .option('--set <address>', 'Set payment token address')
  .action(async (jobId, options) => {
    try {
      if (options.set) {
        const opts = program.opts();
        initWallet(undefined, opts.wallet, opts.passphrase);

        const abi = parseAbi([
          'function setPaymentToken(uint256 jobId, address paymentToken) external',
        ]);
        const commerce = getContractInstance(config.contracts.agenticCommerce, abi);

        console.log(chalk.cyan('\n🪙 Setting Payment Token:'));
        console.log(chalk.dim('Job ID:'), jobId);

        const hash = await commerce.write.setPaymentToken([BigInt(jobId), options.set as Address]);
        console.log(chalk.cyan('Transaction sent:'), hash);

        const receipt = await waitForTransactionReceipt(hash);
        console.log(chalk.green('✅ Payment token set!'));
      } else {
        const abi = parseAbi([
          'function jobs(uint256) external view returns (uint256 id, address client, address provider, address evaluator, uint256 serviceId, address paymentToken, string description, uint256 budget, uint256 expiredAt, uint8 status, address hook, bytes32 deliverable)',
        ]);
        const commerce = getContractInstance(config.contracts.agenticCommerce, abi);
        const job = await commerce.read.jobs([BigInt(jobId)]);
        console.log(chalk.cyan(`🪙 Payment token for job #${jobId}: ${(job as any).paymentToken || 'N/A'}`));
      }
    } catch (error: unknown) {
      const err = error as { message?: string };
      console.error(chalk.red('❌ Error:', err.message));
    }
  });

// ============================================================================

// 🎯 CREATE OPEN JOB COMMAND (DEPRECATED - V6)
program
  .command('create-open-job')
  .description('Create an open job for bidding (DEPRECATED - use create-bidding-session)')
  .requiredOption('--max-budget <number>', 'Maximum budget in USDC wei (required)')
  .requiredOption('--deadline <number>', 'Deadline in days (required)')
  .action(async options => {
    console.log(chalk.yellow('\n⚠️  create-open-job is deprecated.'));
    console.log(chalk.yellow('Use "create-bidding-session" instead for the standalone BiddingSystem.'));
    console.log(chalk.dim('Example: create-bidding-session --evaluator <addr> --max-budget <amount> --deadline <days>'));
  });

// 🎯 COMMIT BID COMMAND (DEPRECATED - V6)
program
  .command('commit-bid')
  .description('Commit a sealed bid with stake (DEPRECATED - use commit-bidding)')
  .requiredOption('--session <number>', 'Bidding session ID (required)')
  .requiredOption('--amount <number>', 'Bid amount (required)')
  .requiredOption('--message <string>', 'Bid message (required)')
  .action(async options => {
    console.log(chalk.yellow('\n⚠️  commit-bid on AgenticCommerce is deprecated.'));
    console.log(chalk.yellow('Use "commit-bidding --session <id> --amount <amount> --message <msg>" instead.'));
  });

// 🎯 REVEAL BID COMMAND (DEPRECATED - V6)
program
  .command('reveal-bid')
  .description('Reveal your committed bid (DEPRECATED - use reveal-bidding)')
  .requiredOption('--session <number>', 'Bidding session ID (required)')
  .action(async () => {
    console.log(chalk.yellow('\n⚠️  reveal-bid on AgenticCommerce is deprecated.'));
    console.log(chalk.yellow('Use "reveal-bidding --session <id> --amount <amount> --message <msg> --salt <salt>" instead.'));
  });

// 🎯 ACCEPT BID COMMAND (DEPRECATED - V6)
program
  .command('accept-bid')
  .description('Accept a winning bid (DEPRECATED - use accept-bidding)')
  .requiredOption('--session <number>', 'Bidding session ID (required)')
  .requiredOption('--bid-id <number>', 'Bid ID (required)')
  .action(async () => {
    console.log(chalk.yellow('\n⚠️  accept-bid on AgenticCommerce is deprecated.'));
    console.log(chalk.yellow('Use "accept-bidding --session <id> --bid-id <id>" instead.'));
  });

// 🎯 WITHDRAW STAKE COMMAND (DEPRECATED - V6)
program
  .command('withdraw-stake')
  .description('Withdraw your stake from a job (DEPRECATED - use withdraw-bidding-stake)')
  .requiredOption('--job-id <number>', 'Job ID (required)')
  .action(async () => {
    console.log(chalk.yellow('\n⚠️  withdraw-stake on AgenticCommerce is deprecated.'));
    console.log(chalk.yellow('Use "withdraw-bidding-stake --session <id>" instead.'));
  });

// 🎯 GET MY BID COMMAND (DEPRECATED - V6)
program
  .command('get-my-bid')
  .description('Get your bid for a specific job (DEPRECATED - use get-bidding-session)')
  .requiredOption('--job-id <number>', 'Job ID (required)')
  .action(async () => {
    console.log(chalk.yellow('\n⚠️  get-my-bid on AgenticCommerce is deprecated.'));
    console.log(chalk.yellow('Use "get-bidding-session --session <id>" instead.'));
  });

// 🎯 GET JOB BID COUNT COMMAND (DEPRECATED - V6)
program
  .command('get-job-bid-count')
  .description('Get number of bids on a job (DEPRECATED)')
  .requiredOption('--job-id <number>', 'Job ID (required)')
  .action(async () => {
    console.log(chalk.yellow('\n⚠️  get-job-bid-count is deprecated.'));
    console.log(chalk.yellow('Bidding was moved to the standalone BiddingSystem contract.'));
  });

// 🎯 GET CLIENT JOB COUNT COMMAND
program
  .command('get-client-job-count')
  .description('Get job count for a client address (V6)')
  .option('--address <address>', 'Client address (defaults to connected wallet)')
  .action(async options => {
    try {
      const opts = program.opts();
      initWallet(undefined, opts.wallet, opts.passphrase);

      const commerceABI = parseAbi([
        'function getClientJobCount(address client) external view returns (uint256)',
      ]);

      const commerce = getContractInstance(
        config.contracts.agenticCommerce as Address,
        commerceABI
      );

      const address = (options.address as Address) || config.signerAddress;
      const count = (await commerce.read.getClientJobCount([address])) as bigint;

      console.log(chalk.cyan('\n📊 Client Job Count:'));
      console.log(chalk.dim('Client:'), address);
      console.log(chalk.bold('Total Jobs:'), count.toString());
    } catch (error: unknown) {
      const err = error as { message?: string };
      console.error(chalk.red('❌ Error:'), err.message);
    }
  });

// 🎯 ACTIVATE SERVICE COMMAND
program
  .command('activate-service')
  .description('Activate a previously deactivated service (V6)')
  .requiredOption('--service-id <number>', 'Service ID (required)')
  .action(async options => {
    try {
      const opts = program.opts();
      initWallet(undefined, opts.wallet, opts.passphrase);

      const serviceRegistryABI = parseAbi(['function activateService(uint256 serviceId) external']);

      const serviceRegistry = getContractInstance(
        config.contracts.serviceRegistry as Address,
        serviceRegistryABI
      );

      const serviceId = BigInt(options.serviceId);

      console.log(chalk.cyan('\n✅ Activating Service:'));
      console.log(chalk.dim('Service ID:'), serviceId.toString());

      const hash = await serviceRegistry.write.activateService([serviceId]);
      console.log(chalk.cyan('Transaction sent:'), hash);

      await waitForTransactionReceipt(hash);
      console.log(chalk.green('✅ Service activated!'));
    } catch (error: unknown) {
      const err = error as { message?: string };
      console.error(chalk.red('❌ Error activating service:'), err.message);
    }
  });

// 🎯 GET SERVICE COUNTER COMMAND
program
  .command('get-service-counter')
  .description('Get total service counter (V6)')
  .action(async () => {
    try {
      const opts = program.opts();
      initWallet(undefined, opts.wallet, opts.passphrase);

      const serviceRegistryABI = parseAbi([
        'function getServiceCounter() external view returns (uint256)',
      ]);
      const serviceRegistry = getContractInstance(
        config.contracts.serviceRegistry as Address,
        serviceRegistryABI
      );

      const counter = (await serviceRegistry.read.getServiceCounter()) as bigint;

      console.log(chalk.cyan('\n📊 Service Counter:'));
      console.log(chalk.bold('Total Services Created:'), counter.toString());
    } catch (error: unknown) {
      const err = error as { message?: string };
      console.error(chalk.red('❌ Error:'), err.message);
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
      const opts = program.opts();
      initWallet(undefined, opts.wallet, opts.passphrase);

      const reviewABI = parseAbi(['function claimReward(uint256 proposalId) external']);

      const review = getContractInstance(config.contracts.agentReview as Address, reviewABI);

      const proposalId = BigInt(options.proposalId);

      console.log(chalk.cyan('\n💰 Claiming Proposal Reward:'));
      console.log(chalk.dim('Proposal ID:'), proposalId.toString());

      const hash = await review.write.claimReward([proposalId]);
      console.log(chalk.cyan('Transaction sent:'), hash);

      await waitForTransactionReceipt(hash);
      console.log(chalk.green('✅ Reward claimed!'));
    } catch (error: unknown) {
      const err = error as { message?: string };
      console.error(chalk.red('❌ Error:'), err.message);
    }
  });

// 🎯 RELEASE PROPOSAL STAKE COMMAND
program
  .command('release-proposal-stake')
  .description('Release your stake for a proposal (V6)')
  .requiredOption('--proposal-id <number>', 'Proposal ID (required)')
  .action(async options => {
    try {
      const opts = program.opts();
      initWallet(undefined, opts.wallet, opts.passphrase);

      const reviewABI = parseAbi(['function releaseStake(uint256 proposalId) external']);
      const review = getContractInstance(config.contracts.agentReview as Address, reviewABI);

      const proposalId = BigInt(options.proposalId);

      console.log(chalk.cyan('\n💸 Releasing Proposal Stake:'));
      console.log(chalk.dim('Proposal ID:'), proposalId.toString());

      const hash = await review.write.releaseStake([proposalId]);
      console.log(chalk.cyan('Transaction sent:'), hash);

      await waitForTransactionReceipt(hash);
      console.log(chalk.green('✅ Stake released!'));
    } catch (error: unknown) {
      const err = error as { message?: string };
      console.error(chalk.red('❌ Error:'), err.message);
    }
  });

// 🎯 CANCEL PROPOSAL COMMAND
program
  .command('cancel-proposal')
  .description('Cancel your open proposal (V6)')
  .requiredOption('--proposal-id <number>', 'Proposal ID (required)')
  .action(async options => {
    try {
      const opts = program.opts();
      initWallet(undefined, opts.wallet, opts.passphrase);

      const reviewABI = parseAbi(['function cancelProposal(uint256 proposalId) external']);
      const review = getContractInstance(config.contracts.agentReview as Address, reviewABI);

      const proposalId = BigInt(options.proposalId);

      console.log(chalk.cyan('\n❌ Cancelling Proposal:'));
      console.log(chalk.dim('Proposal ID:'), proposalId.toString());

      const hash = await review.write.cancelProposal([proposalId]);
      console.log(chalk.cyan('Transaction sent:'), hash);

      await waitForTransactionReceipt(hash);
      console.log(chalk.green('✅ Proposal cancelled!'));
    } catch (error: unknown) {
      const err = error as { message?: string };
      console.error(chalk.red('❌ Error:'), err.message);
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
      const opts = program.opts();
      initWallet(undefined, opts.wallet, opts.passphrase);

      const reviewABI = parseAbi([
        'function slashEvaluator(address evaluator, uint256 proposalId, string reason) external',
      ]);
      const review = getContractInstance(config.contracts.agentReview as Address, reviewABI);

      console.log(chalk.cyan('\n⚡ Slashing Evaluator:'));
      console.log(chalk.dim('Evaluator:'), options.evaluator);
      console.log(chalk.dim('Proposal ID:'), options.proposalId);
      console.log(chalk.dim('Reason:'), options.reason);

      const hash = await review.write.slashEvaluator([
        options.evaluator as Address,
        BigInt(options.proposalId),
        options.reason,
      ]);
      console.log(chalk.cyan('Transaction sent:'), hash);

      await waitForTransactionReceipt(hash);
      console.log(chalk.green('✅ Evaluator slashed!'));
    } catch (error: unknown) {
      const err = error as { message?: string };
      console.error(chalk.red('❌ Error:'), err.message);
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
      const opts = program.opts();
      initWallet(undefined, opts.wallet, opts.passphrase);

      const skillRegistryABI = parseAbi([
        'function findSkillsByDomain(string domain) external view returns (uint256[])',
        'function getSkill(uint256 skillId) external view returns ((uint256 agentId, string name, string version, string description, string endpoint, string[] domains, bool isActive, address registeredBy, uint256 registeredAt))',
      ]);

      const skillRegistry = getContractInstance(
        config.contracts.skillRegistry as Address,
        skillRegistryABI
      );

      const domain = options.domain;
      const skillIds = (await skillRegistry.read.findSkillsByDomain([domain])) as bigint[];

      console.log(chalk.cyan('\n🔍 Skills for Domain:'), domain);
      console.log(chalk.dim('Total:'), skillIds.length, 'skills\n');

      for (const skillId of skillIds) {
        const skill = (await skillRegistry.read.getSkill([skillId])) as any;
        console.log(chalk.bold(`\nSkill ID: ${skillId}`));
        console.log(chalk.dim('  Agent ID:'), skill.agentId.toString());
        console.log(chalk.dim('  Name:'), skill.name, `(${skill.version})`);
        console.log(chalk.dim('  Description:'), skill.description || '(none)');
        console.log(chalk.dim('  Endpoint:'), skill.endpoint || '(none)');
        console.log(chalk.dim('  Domains:'), skill.domains.join(', '));
        console.log(chalk.dim('  Active:'), skill.isActive ? chalk.green('Yes') : chalk.red('No'));
      }
    } catch (error: unknown) {
      const err = error as { message?: string };
      console.error(chalk.red('❌ Error:'), err.message);
    }
  });

// 🎯 GET TOTAL SKILL COUNT COMMAND
program
  .command('get-total-skill-count')
  .description('Get total skill count (V6)')
  .action(async () => {
    try {
      const opts = program.opts();
      initWallet(undefined, opts.wallet, opts.passphrase);

      const skillRegistryABI = parseAbi([
        'function getTotalSkillCount() external view returns (uint256)',
      ]);
      const skillRegistry = getContractInstance(
        config.contracts.skillRegistry as Address,
        skillRegistryABI
      );

      const count = (await skillRegistry.read.getTotalSkillCount()) as bigint;

      console.log(chalk.cyan('\n📊 Total Skill Count:'));
      console.log(chalk.bold('Total Skills:'), count.toString());
    } catch (error: unknown) {
      const err = error as { message?: string };
      console.error(chalk.red('❌ Error:'), err.message);
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
      const opts = program.opts();
      initWallet(undefined, opts.wallet, opts.passphrase);

      const skillRegistryABI = parseAbi([
        'function updateSkill(uint256 skillId, string name, string version, string description, string endpoint, string[] domains) external',
      ]);
      const skillRegistry = getContractInstance(
        config.contracts.skillRegistry as Address,
        skillRegistryABI
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

      const hash = await skillRegistry.write.updateSkill([
        skillId,
        name,
        version,
        description,
        endpoint,
        domains,
      ]);
      console.log(chalk.cyan('Transaction sent:'), hash);

      await waitForTransactionReceipt(hash);
      console.log(chalk.green('✅ Skill updated!'));
    } catch (error: unknown) {
      const err = error as { message?: string };
      console.error(chalk.red('❌ Error:'), err.message);
    }
  });

// =============================================================================
// BIDDING SYSTEM COMMANDS (Phase 11 - Standalone Bidding)
// =============================================================================

const BIDDING_SYSTEM_ABI_PARSED = parseAbi([
  'function createBiddingSession(address evaluator, uint256 maxBudget, uint256 deadline, bytes metadata, uint256 serviceId) external payable returns (uint256 sessionId)',
  'function commitBid(uint256 sessionId, bytes32 commitHash) external payable',
  'function revealBid(uint256 sessionId, uint256 amount, string message, bytes32 salt) external',
  'function acceptBid(uint256 sessionId, uint256 bidId) external',
  'function withdrawStake(uint256 sessionId) external',
  'function claimStake(uint256 sessionId) external',
  'function createJobAndFund(uint256 sessionId, uint256 jobExpiredAt, string description) external payable returns (uint256 jobId)',
  'function cancelSession(uint256 sessionId) external',
  'function getSession(uint256 sessionId) external view returns ((uint256 id, address creator, address evaluator, uint256 maxBudget, uint256 deadline, uint256 revealWindowEnd, bytes metadata, uint256 serviceId, uint256 jobId, address winner, uint256 winningBidId, bool jobCreated, uint8 status))',
  'function getUserBid(uint256 sessionId, address user) external view returns ((uint256 bidId, address bidder, uint256 proposedAmount, uint256 stake, string message, bytes32 commitHash, bool revealed, bool accepted, bool stakeWithdrawn, uint256 timestamp))',
  'function sessionCounter() external view returns (uint256)',
  'function calculateStake(uint256 maxBudget) external pure returns (uint256)',
  'event BiddingSessionCreated(uint256 indexed sessionId, address indexed creator, uint256 maxBudget)',
]);

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
      const opts = program.opts();
      initWallet(undefined, opts.wallet, opts.passphrase);

      if (!config.contracts.biddingSystem) {
        console.error(chalk.red('❌ BiddingSystem not configured'));
        return;
      }

      const contract = getContractInstance(
        config.contracts.biddingSystem as Address,
        BIDDING_SYSTEM_ABI_PARSED
      );
      const maxBudget = viemParseEther(options.maxBudget.toString());
      const stake = (maxBudget * 100n) / 10000n; // 1% stake

      console.log(chalk.cyan('Creating bidding session...'));
      console.log(chalk.dim('  Evaluator:'), options.evaluator);
      console.log(chalk.dim('  Max Budget:'), options.maxBudget, 'ETH');
      console.log(chalk.dim('  Stake:'), viemFormatEther(stake), 'ETH');
      console.log(chalk.dim('  Deadline:'), new Date(options.deadline * 1000).toISOString());

      const hash = await contract.write.createBiddingSession(
        [
          options.evaluator as Address,
          maxBudget,
          BigInt(options.deadline),
          (options.metadata || '0x') as `0x${string}`,
          BigInt(options.serviceId || 0),
        ],
        { value: stake }
      );

      console.log(chalk.cyan('Transaction sent:'), hash);
      const receipt = await waitForTransactionReceipt(hash);

      let sessionId;
      for (const log of receipt.logs) {
        try {
          const parsed = parseLog({ log, abi: BIDDING_SYSTEM_ABI_PARSED });
          if (parsed?.eventName === 'BiddingSessionCreated') {
            sessionId = (parsed.args as any).sessionId.toString();
            break;
          }
        } catch {
          /* ignore */
        }
      }

      if (sessionId) {
        console.log(chalk.green('✅ Bidding session created!'));
        console.log(chalk.cyan('Session ID:'), sessionId);
      } else {
        console.log(chalk.green('✅ Bidding session created!'));
      }
      console.log(chalk.cyan('Gas used:'), receipt.gasUsed.toString());
    } catch (error: unknown) {
      const err = error as { message?: string };
      console.error(chalk.red('❌ Error:'), err.message);
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
      const opts = program.opts();
      initWallet(undefined, opts.wallet, opts.passphrase);

      if (!config.contracts.biddingSystem) {
        console.error(chalk.red('❌ BiddingSystem not configured'));
        return;
      }

      const contract = getContractInstance(
        config.contracts.biddingSystem as Address,
        BIDDING_SYSTEM_ABI_PARSED
      );
      const amount = viemParseEther(options.amount.toString());
      const stake = (amount * 100n) / 10000n; // 1% stake
      const salt = viemKeccak256(viemToBytes(config.signerAddress + Date.now().toString()));
      const commitHash = viemKeccak256(
        viemEncodeAbiParameters(
          [{ type: 'uint256' }, { type: 'string' }, { type: 'bytes32' }],
          [amount, options.message, salt]
        )
      );

      console.log(chalk.cyan('Committing bid...'));
      console.log(chalk.dim('  Session ID:'), options.session);
      console.log(chalk.dim('  Amount:'), options.amount, 'ETH');
      console.log(chalk.dim('  Stake:'), viemFormatEther(stake), 'ETH');
      console.log(chalk.dim('  Commit Hash:'), commitHash);
      console.log(chalk.yellow('  ⚠️  Save your salt for reveal:'), salt);

      const hash = await contract.write.commitBid([BigInt(options.session), commitHash], {
        value: stake,
      });

      console.log(chalk.cyan('Transaction sent:'), hash);
      await waitForTransactionReceipt(hash);
      console.log(chalk.green('✅ Bid committed!'));
    } catch (error: unknown) {
      const err = error as { message?: string };
      console.error(chalk.red('❌ Error:'), err.message);
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
      const opts = program.opts();
      initWallet(undefined, opts.wallet, opts.passphrase);

      if (!config.contracts.biddingSystem) {
        console.error(chalk.red('❌ BiddingSystem not configured'));
        return;
      }

      const contract = getContractInstance(
        config.contracts.biddingSystem as Address,
        BIDDING_SYSTEM_ABI_PARSED
      );
      const amount = viemParseEther(options.amount.toString());
      const salt = (
        options.salt.startsWith('0x') ? options.salt : `0x${options.salt}`
      ) as `0x${string}`;

      console.log(chalk.cyan('Revealing bid...'));
      console.log(chalk.dim('  Session ID:'), options.session);
      console.log(chalk.dim('  Amount:'), options.amount, 'ETH');
      console.log(chalk.dim('  Message:'), options.message);

      const hash = await contract.write.revealBid([
        BigInt(options.session),
        amount,
        options.message,
        salt,
      ]);

      console.log(chalk.cyan('Transaction sent:'), hash);
      await waitForTransactionReceipt(hash);
      console.log(chalk.green('✅ Bid revealed!'));
    } catch (error: unknown) {
      const err = error as { message?: string };
      console.error(chalk.red('❌ Error:'), err.message);
    }
  });

program
  .command('accept-bidding')
  .description('Accept a winning bid (session creator only)')
  .requiredOption('--session <id>', 'Session ID', parseInt)
  .requiredOption('--bid-id <id>', 'Bid ID to accept', parseInt)
  .action(async options => {
    try {
      const opts = program.opts();
      initWallet(undefined, opts.wallet, opts.passphrase);

      if (!config.contracts.biddingSystem) {
        console.error(chalk.red('❌ BiddingSystem not configured'));
        return;
      }

      const contract = getContractInstance(
        config.contracts.biddingSystem as Address,
        BIDDING_SYSTEM_ABI_PARSED
      );

      console.log(chalk.cyan('Accepting bid...'));
      console.log(chalk.dim('  Session ID:'), options.session);
      console.log(chalk.dim('  Bid ID:'), options.bidId);

      const hash = await contract.write.acceptBid([BigInt(options.session), BigInt(options.bidId)]);

      console.log(chalk.cyan('Transaction sent:'), hash);
      await waitForTransactionReceipt(hash);
      console.log(chalk.green('✅ Bid accepted! Winner can now claim stake.'));
    } catch (error: unknown) {
      const err = error as { message?: string };
      console.error(chalk.red('❌ Error:'), err.message);
    }
  });

program
  .command('get-bidding-session')
  .description('Get bidding session details')
  .requiredOption('--session <id>', 'Session ID', parseInt)
  .action(async options => {
    try {
      const opts = program.opts();
      initWallet(undefined, opts.wallet, opts.passphrase);

      if (!config.contracts.biddingSystem) {
        console.error(chalk.red('❌ BiddingSystem not configured'));
        return;
      }

      const contract = getContractInstance(
        config.contracts.biddingSystem as Address,
        BIDDING_SYSTEM_ABI_PARSED
      );

      const session = (await contract.read.getSession([BigInt(options.session)])) as any;

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
      console.log(chalk.dim('  Creator:'), session.creator || session[1]);
      console.log(chalk.dim('  Evaluator:'), session.evaluator || session[2]);
      console.log(
        chalk.dim('  Max Budget:'),
        viemFormatEther(session.maxBudget || session[3]),
        'ETH'
      );
      console.log(
        chalk.dim('  Deadline:'),
        new Date(Number(session.deadline || session[4]) * 1000).toISOString()
      );
      console.log(
        chalk.dim('  Reveal Window End:'),
        new Date(Number(session.revealWindowEnd || session[5]) * 1000).toISOString()
      );
      console.log(chalk.dim('  Winner:'), session.winner || session[9] || 'None');
      console.log(
        chalk.dim('  Status:'),
        statusNames[Number(session.status || session[12])] || 'Unknown'
      );
      console.log(chalk.dim('  Job Created:'), session.jobCreated || session[11]);
    } catch (error: unknown) {
      const err = error as { message?: string };
      console.error(chalk.red('❌ Error:'), err.message);
    }
  });

program
  .command('withdraw-bidding-stake')
  .description('Withdraw your stake from a bidding session (losers only)')
  .requiredOption('--session <id>', 'Session ID', parseInt)
  .action(async options => {
    try {
      const opts = program.opts();
      initWallet(undefined, opts.wallet, opts.passphrase);

      if (!config.contracts.biddingSystem) {
        console.error(chalk.red('❌ BiddingSystem not configured'));
        return;
      }

      const contract = getContractInstance(
        config.contracts.biddingSystem as Address,
        BIDDING_SYSTEM_ABI_PARSED
      );

      console.log(chalk.cyan('Withdrawing stake...'));
      console.log(chalk.dim('  Session ID:'), options.session);

      const hash = await contract.write.withdrawStake([BigInt(options.session)]);

      console.log(chalk.cyan('Transaction sent:'), hash);
      await waitForTransactionReceipt(hash);
      console.log(chalk.green('✅ Stake withdrawn!'));
    } catch (error: unknown) {
      const err = error as { message?: string };
      console.error(chalk.red('❌ Error:'), err.message);
    }
  });

// ============================================================================
// Phase 24: Milestone Commands
// ============================================================================

const MILESTONE_ESCROW_ABI = parseAbi([
  'function enableMilestones(uint256 jobId, address provider, address paymentToken, uint256 totalBudget) external',
  'function addMilestone(uint256 jobId, string description, uint256 amount, uint256 dueDate) external',
  'function completeMilestone(uint256 jobId, uint256 milestoneIndex, bytes32 proofHash) external',
  'function releaseMilestone(uint256 jobId, uint256 milestoneIndex) external',
  'function getJobMilestones(uint256 jobId) external view returns ((string description, uint256 amount, uint256 dueDate, bool completed, bool released, bytes32 proofHash)[])',
  'function registerAsArbiter() external payable',
  'function unregisterAsArbiter() external',
  'function isArbiter(address account) external view returns (bool)',
  'function getArbiterStake(address arbiter) external view returns (uint256)',
  'function getArbiterCount() external view returns (uint256)',
  'function flagDispute(uint256 jobId) external payable',
  'function getDispute(uint256 jobId) external view returns (uint256, address, address, uint256, bool, bool)',
]);

program
  .command('register-arbiter')
  .description('Register as an arbiter with 0.01 ETH stake')
  .action(async () => {
    try {
      initWallet();

      if (!config.contracts.milestoneEscrow) {
        console.error(chalk.red('❌ MilestoneEscrow not configured'));
        return;
      }

      const contract = getContractInstance(
        config.contracts.milestoneEscrow as Address,
        MILESTONE_ESCROW_ABI
      );

      console.log(chalk.cyan('Registering as arbiter (stake: 0.01 ETH)...'));
      const hash = await contract.write.registerAsArbiter([], { value: BigInt(1e16) });

      console.log(chalk.cyan('Transaction sent:'), hash);
      await waitForTransactionReceipt(hash);
      console.log(chalk.green('✅ Registered as arbiter!'));
    } catch (error: unknown) {
      const err = error as { message?: string };
      console.error(chalk.red('❌ Error:'), err.message);
    }
  });

program
  .command('unregister-arbiter')
  .description('Unregister as an arbiter and recover stake')
  .action(async () => {
    try {
      initWallet();

      if (!config.contracts.milestoneEscrow) {
        console.error(chalk.red('❌ MilestoneEscrow not configured'));
        return;
      }

      const contract = getContractInstance(
        config.contracts.milestoneEscrow as Address,
        MILESTONE_ESCROW_ABI
      );

      console.log(chalk.cyan('Unregistering as arbiter...'));
      const hash = await contract.write.unregisterAsArbiter();

      console.log(chalk.cyan('Transaction sent:'), hash);
      await waitForTransactionReceipt(hash);
      console.log(chalk.green('✅ Unregistered as arbiter!'));
    } catch (error: unknown) {
      const err = error as { message?: string };
      console.error(chalk.red('❌ Error:'), err.message);
    }
  });

program
  .command('is-arbiter')
  .description('Check if an address is a registered arbiter')
  .argument('[address]', 'Address to check', undefined)
  .action(async (address?: string) => {
    try {
      if (!config.contracts.milestoneEscrow) {
        console.error(chalk.red('❌ MilestoneEscrow not configured'));
        return;
      }

      const targetAddress = address || config.signerAddress;
      const contract = getContractInstance(
        config.contracts.milestoneEscrow as Address,
        MILESTONE_ESCROW_ABI
      );

      const result = await contract.read.isArbiter([targetAddress as Address]);
      console.log(chalk.cyan('Address:'), targetAddress);
      console.log(chalk.green('Is Arbiter:'), result);
    } catch (error: unknown) {
      const err = error as { message?: string };
      console.error(chalk.red('❌ Error:'), err.message);
    }
  });

program
  .command('arbiter-count')
  .description('Get total number of registered arbiters')
  .action(async () => {
    try {
      if (!config.contracts.milestoneEscrow) {
        console.error(chalk.red('❌ MilestoneEscrow not configured'));
        return;
      }

      const contract = getContractInstance(
        config.contracts.milestoneEscrow as Address,
        MILESTONE_ESCROW_ABI
      );

      const count = await contract.read.getArbiterCount();
      console.log(chalk.green('Total Arbiters:'), Number(count));
    } catch (error: unknown) {
      const err = error as { message?: string };
      console.error(chalk.red('❌ Error:'), err.message);
    }
  });

program
  .command('enable-milestones')
  .description('Enable milestone payments for a job')
  .requiredOption('-j, --job <number>', 'Job ID')
  .requiredOption('-p, --provider <address>', 'Provider address')
  .requiredOption('-t, --token <address>', 'Payment token address')
  .requiredOption('-b, --budget <number>', 'Total budget in wei')
  .action(async (options: { job: string; provider: string; token: string; budget: string }) => {
    try {
      initWallet();

      if (!config.contracts.milestoneEscrow) {
        console.error(chalk.red('❌ MilestoneEscrow not configured'));
        return;
      }

      const contract = getContractInstance(
        config.contracts.milestoneEscrow as Address,
        MILESTONE_ESCROW_ABI
      );

      console.log(chalk.cyan('Enabling milestones...'));
      console.log(chalk.dim('  Job ID:'), options.job);
      const hash = await contract.write.enableMilestones([
        BigInt(options.job),
        options.provider as Address,
        options.token as Address,
        BigInt(options.budget),
      ]);

      console.log(chalk.cyan('Transaction sent:'), hash);
      await waitForTransactionReceipt(hash);
      console.log(chalk.green('✅ Milestones enabled!'));
    } catch (error: unknown) {
      const err = error as { message?: string };
      console.error(chalk.red('❌ Error:'), err.message);
    }
  });

program
  .command('add-milestone')
  .description('Add a milestone to a job')
  .requiredOption('-j, --job <number>', 'Job ID')
  .requiredOption('-d, --description <string>', 'Milestone description')
  .requiredOption('-a, --amount <number>', 'Amount in wei')
  .option('--due <number>', 'Due date (Unix timestamp)')
  .action(async (options: { job: string; description: string; amount: string; due?: string }) => {
    try {
      initWallet();

      if (!config.contracts.milestoneEscrow) {
        console.error(chalk.red('❌ MilestoneEscrow not configured'));
        return;
      }

      const contract = getContractInstance(
        config.contracts.milestoneEscrow as Address,
        MILESTONE_ESCROW_ABI
      );

      console.log(chalk.cyan('Adding milestone...'));
      const hash = await contract.write.addMilestone([
        BigInt(options.job),
        options.description,
        BigInt(options.amount),
        options.due ? BigInt(options.due) : 0n,
      ]);

      console.log(chalk.cyan('Transaction sent:'), hash);
      await waitForTransactionReceipt(hash);
      console.log(chalk.green('✅ Milestone added!'));
    } catch (error: unknown) {
      const err = error as { message?: string };
      console.error(chalk.red('❌ Error:'), err.message);
    }
  });

program
  .command('complete-milestone')
  .description('Mark a milestone as completed (provider)')
  .requiredOption('-j, --job <number>', 'Job ID')
  .requiredOption('-i, --index <number>', 'Milestone index')
  .requiredOption('-p, --proof <hash>', 'Proof hash (IPFS or data URI)')
  .action(async (options: { job: string; index: string; proof: string }) => {
    try {
      initWallet();

      if (!config.contracts.milestoneEscrow) {
        console.error(chalk.red('❌ MilestoneEscrow not configured'));
        return;
      }

      const contract = getContractInstance(
        config.contracts.milestoneEscrow as Address,
        MILESTONE_ESCROW_ABI
      );

      console.log(chalk.cyan('Completing milestone...'));
      const hash = await contract.write.completeMilestone([
        BigInt(options.job),
        BigInt(options.index),
        options.proof as `0x${string}`,
      ]);

      console.log(chalk.cyan('Transaction sent:'), hash);
      await waitForTransactionReceipt(hash);
      console.log(chalk.green('✅ Milestone completed!'));
    } catch (error: unknown) {
      const err = error as { message?: string };
      console.error(chalk.red('❌ Error:'), err.message);
    }
  });

program
  .command('release-milestone')
  .description('Release milestone payment (client)')
  .requiredOption('-j, --job <number>', 'Job ID')
  .requiredOption('-i, --index <number>', 'Milestone index')
  .action(async (options: { job: string; index: string }) => {
    try {
      initWallet();

      if (!config.contracts.milestoneEscrow) {
        console.error(chalk.red('❌ MilestoneEscrow not configured'));
        return;
      }

      const contract = getContractInstance(
        config.contracts.milestoneEscrow as Address,
        MILESTONE_ESCROW_ABI
      );

      console.log(chalk.cyan('Releasing milestone payment...'));
      const hash = await contract.write.releaseMilestone([
        BigInt(options.job),
        BigInt(options.index),
      ]);

      console.log(chalk.cyan('Transaction sent:'), hash);
      await waitForTransactionReceipt(hash);
      console.log(chalk.green('✅ Milestone payment released!'));
    } catch (error: unknown) {
      const err = error as { message?: string };
      console.error(chalk.red('❌ Error:'), err.message);
    }
  });

program
  .command('get-milestones')
  .description('Get milestones for a job')
  .requiredOption('-j, --job <number>', 'Job ID')
  .action(async (options: { job: string }) => {
    try {
      if (!config.contracts.milestoneEscrow) {
        console.error(chalk.red('❌ MilestoneEscrow not configured'));
        return;
      }

      const contract = getContractInstance(
        config.contracts.milestoneEscrow as Address,
        MILESTONE_ESCROW_ABI
      );

      const milestones = await contract.read.getJobMilestones([BigInt(options.job)]);

      console.log(chalk.cyan(`Milestones for Job #${options.job}:`));
      milestones.forEach((m: any, i: number) => {
        console.log(`\n${i + 1}. ${m.description}`);
        console.log(`   Amount: ${viemFormatEther(m.amount)} ETH`);
        console.log(`   Completed: ${m.completed ? '✅' : '❌'}`);
        console.log(`   Released: ${m.released ? '✅' : '❌'}`);
      });
    } catch (error: unknown) {
      const err = error as { message?: string };
      console.error(chalk.red('❌ Error:'), err.message);
    }
  });

program
  .command('flag-dispute')
  .description('Flag a dispute for a job (requires 0.001 ETH fee)')
  .requiredOption('-j, --job <number>', 'Job ID')
  .action(async (options: { job: string }) => {
    try {
      initWallet();

      if (!config.contracts.milestoneEscrow) {
        console.error(chalk.red('❌ MilestoneEscrow not configured'));
        return;
      }

      const contract = getContractInstance(
        config.contracts.milestoneEscrow as Address,
        MILESTONE_ESCROW_ABI
      );

      console.log(chalk.cyan('Flagging dispute (fee: 0.001 ETH)...'));
      const hash = await contract.write.flagDispute([BigInt(options.job)], { value: BigInt(1e15) });

      console.log(chalk.cyan('Transaction sent:'), hash);
      await waitForTransactionReceipt(hash);
      console.log(chalk.green('✅ Dispute flagged!'));
    } catch (error: unknown) {
      const err = error as { message?: string };
      console.error(chalk.red('❌ Error:'), err.message);
    }
  });

// ============================================================================
// V9 Multi-Token Budget Commands
// ============================================================================

program
  .command('get-min-budget')
  .description('Get minimum budget for a token (V9)')
  .requiredOption('--token <address>', 'Token address (0x0 for ETH)')
  .option('--decimals <number>', 'Token decimals (6 for USDC, 18 for ETH)', '18')
  .action(async (opts) => {
    try {
      const abi = parseAbi([
        'function getMinBudget(address token, uint8 decimals) external view returns (uint256)',
      ]);
      const commerce = getContractInstance(config.contracts.agenticCommerce, abi);
      const result = await commerce.read.getMinBudget([opts.token as Address, parseInt(opts.decimals)]);
      console.log(chalk.green('✓ Minimum budget:'), result);
    } catch (error: unknown) {
      const err = error as { message?: string };
      console.error(chalk.red('❌ Error:'), err.message);
    }
  });

program
  .command('max-budget-usd')
  .description('Get maximum budget in USD (V9)')
  .action(async () => {
    try {
      const abi = parseAbi(['function maxBudgetUsd() external view returns (uint256)']);
      const commerce = getContractInstance(config.contracts.agenticCommerce, abi);
      const result = await commerce.read.maxBudgetUsd();
      console.log(chalk.green('✓ Max budget (USD):'), result);
    } catch (error: unknown) {
      const err = error as { message?: string };
      console.error(chalk.red('❌ Error:'), err.message);
    }
  });

program
  .command('min-budget-usd')
  .description('Get minimum budget in USD (V9)')
  .action(async () => {
    try {
      const abi = parseAbi(['function minBudgetUsd() external view returns (uint256)']);
      const commerce = getContractInstance(config.contracts.agenticCommerce, abi);
      const result = await commerce.read.minBudgetUsd();
      console.log(chalk.green('✓ Min budget (USD):'), result);
    } catch (error: unknown) {
      const err = error as { message?: string };
      console.error(chalk.red('❌ Error:'), err.message);
    }
  });

program
  .command('is-stablecoin')
  .description('Check if token is marked as stablecoin (V9)')
  .requiredOption('--token <address>', 'Token address')
  .action(async (opts) => {
    try {
      const abi = parseAbi(['function isStablecoin(address token) external view returns (bool)']);
      const commerce = getContractInstance(config.contracts.agenticCommerce, abi);
      const result = await commerce.read.isStablecoin([opts.token as Address]);
      console.log(chalk.green('✓ Is stablecoin:'), result);
    } catch (error: unknown) {
      const err = error as { message?: string };
      console.error(chalk.red('❌ Error:'), err.message);
    }
  });

program
  .command('is-token-allowed')
  .description('Check if token is on allowlist (V9)')
  .requiredOption('--token <address>', 'Token address')
  .action(async (opts) => {
    try {
      const abi = parseAbi(['function allowedTokens(address token) external view returns (bool)']);
      const commerce = getContractInstance(config.contracts.agenticCommerce, abi);
      const result = await commerce.read.allowedTokens([opts.token as Address]);
      console.log(chalk.green('✓ Is allowed:'), result);
    } catch (error: unknown) {
      const err = error as { message?: string };
      console.error(chalk.red('❌ Error:'), err.message);
    }
  });

program
  .command('get-price-oracle')
  .description('Get price oracle address (V9)')
  .action(async () => {
    try {
      const abi = parseAbi(['function priceOracle() external view returns (address)']);
      const commerce = getContractInstance(config.contracts.agenticCommerce, abi);
      const result = await commerce.read.priceOracle();
      console.log(chalk.green('✓ Price oracle:'), result);
    } catch (error: unknown) {
      const err = error as { message?: string };
      console.error(chalk.red('❌ Error:'), err.message);
    }
  });

program
  .command('is-paused')
  .description('Check if AgenticCommerce is paused')
  .action(async () => {
    try {
      const abi = parseAbi(['function paused() external view returns (bool)']);
      const commerce = getContractInstance(config.contracts.agenticCommerce, abi);
      const result = await commerce.read.paused();
      console.log(chalk.green('✓ Is paused:'), result);
    } catch (error: unknown) {
      const err = error as { message?: string };
      console.error(chalk.red('❌ Error:'), err.message);
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
      chalk.cyan('  init') + '                  Interactive configuration wizard for new users'
    );
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
    console.log(chalk.cyan('  approve-deliverable <id>') + ' Evaluator finalizes and releases payment (V9)');
    console.log(chalk.cyan('  approve-by-client <id>') + '  Client approves delivery (V9)');
    console.log(chalk.cyan('  reject-deliverable <id>') + ' Reject and request revision');
    console.log(chalk.cyan('  complete-after-timeout <id>') + ' Complete after dispute window');
    console.log(chalk.cyan('  refund-expired <id>') + '     Permissionless refund for expired job');
    console.log(chalk.cyan('  job-status <id>') + '         Get job status');
    console.log(chalk.cyan('  job-budget <id>') + '         Set or view job budget');
    console.log(chalk.cyan('  job-payment-token <id>') + '  Set or view payment token');
    console.log(chalk.cyan('  register-evaluator') + '      Register as evaluator (0.01 ETH)');
    console.log(chalk.cyan('  unregister-evaluator') + '    Unregister as evaluator');
    console.log(chalk.cyan('  evaluator-pool-size') + '     Get evaluator pool size');
    console.log(chalk.cyan('  cleanup-evaluators') + '      Remove stale evaluators');
    console.log(chalk.cyan('  -- Review (PRD 3) --'));
    console.log(chalk.cyan('  create-proposal') + '        Create a proposal for A/B evaluation');
    console.log(
      chalk.cyan('  evaluate <id>') + '          Submit evaluation with confidence score'
    );
    console.log(chalk.cyan('  attest-decision <id>') + '   Attest to winning evaluator');
    console.log(chalk.cyan('  proposal-status <id>') + '    Get proposal and evaluation status');
    console.log(chalk.dim('  -- DEPRECATED (V6, removed from V9) --'));
    console.log(chalk.dim('  create-open-job') + '         Use create-bidding-session instead');
    console.log(chalk.dim('  commit-bid') + '             Use commit-bidding instead');
    console.log(chalk.dim('  reveal-bid') + '             Use reveal-bidding instead');
    console.log(chalk.dim('  accept-bid') + '             Use accept-bidding instead');
    console.log(chalk.dim('  withdraw-stake') + '         Use withdraw-bidding-stake instead');
    console.log(chalk.dim('  get-my-bid') + '             Use get-bidding-session instead');
    console.log(chalk.dim('  get-job-bid-count') + '      Removed from V9');
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
    console.log(
      chalk.cyan('  set-slash-manager') + '     Set SlashManager address in AdminRegistry (owner only)'
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

// ============================================================================
// EFP Commands
// ============================================================================

const EFP_API_BASE = 'https://api.ethfollow.xyz/api/v1';

async function efpFetch<T>(path: string): Promise<T> {
  const response = await fetch(`${EFP_API_BASE}${path}`);
  if (!response.ok) {
    throw new Error(`EFP API error: ${response.status}`);
  }
  const json = await response.json() as { data: T };
  return json.data;
}

const EFP_LIST_RECORDS_ABI = parseAbi([
  'function applyListOp(bytes calldata _listOp) external',
] as const);

const EFP_LIST_REGISTRY_ABI = parseAbi([
  'function mint() external returns (uint256)',
] as const);

const EFP_ACCOUNT_METADATA_ABI = parseAbi([
  'function setValue(string calldata key, bytes calldata value) external',
] as const);

const EFP_MAINNET_RPC = 'https://ethereum.publicnode.com';

function efpAddressToBytes(address: string): Uint8Array {
  const addr = address.startsWith('0x') ? address.slice(2) : address;
  const bytes = new Uint8Array(20);
  for (let i = 0; i < 20; i++) {
    bytes[i] = parseInt(addr.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

function buildEfpFollowOp(targetAddress: string): `0x${string}` {
  const addrBytes = efpAddressToBytes(targetAddress);
  const record = new Uint8Array([1, 1, ...addrBytes]);
  const op = new Uint8Array([1, 1, ...record]);
  let hex = '0x';
  for (const b of op) hex += b.toString(16).padStart(2, '0');
  return hex as `0x${string}`;
}

function buildEfpUnfollowOp(targetAddress: string): `0x${string}` {
  const addrBytes = efpAddressToBytes(targetAddress);
  const record = new Uint8Array([1, 1, ...addrBytes]);
  const op = new Uint8Array([1, 2, ...record]);
  let hex = '0x';
  for (const b of op) hex += b.toString(16).padStart(2, '0');
  return hex as `0x${string}`;
}

program
  .command('efp')
  .description('Ethereum Follow Protocol commands')
  .addCommand(
    new Command('stats')
      .description('Get EFP stats (followers & following) for an address')
      .argument('<address>', 'Ethereum address')
      .option('--json', 'Output as JSON')
      .action(async (address, options) => {
        try {
          const stats = await efpFetch<{ followers_count: string; following_count: string }>(
            `/users/${address}/stats`
          );
          if (options.json) {
            console.log(JSON.stringify(stats, null, 2));
          } else {
            console.log(chalk.green('\n📊 EFP Stats:'));
            console.log(chalk.cyan('Address:'), address);
            console.log(chalk.cyan('Followers:'), chalk.bold(stats.followers_count));
            console.log(chalk.cyan('Following:'), chalk.bold(stats.following_count));
          }
        } catch (error: any) {
          console.error(chalk.red('❌ Error:'), error.message);
        }
      })
  )
  .addCommand(
    new Command('followers')
      .description('List followers of an address')
      .argument('<address>', 'Ethereum address')
      .option('--limit <number>', 'Number of results', '10')
      .option('--offset <number>', 'Result offset', '0')
      .option('--json', 'Output as JSON')
      .action(async (address, options) => {
        try {
          const data = await efpFetch<{ followers: any[] }>(
            `/users/${address}/followers?limit=${options.limit}&offset=${options.offset}`
          );
          const followers = data.followers || [];
          if (options.json) {
            console.log(JSON.stringify(followers, null, 2));
          } else {
            console.log(chalk.green(`\n👥 Followers (${followers.length}):`));
            for (const f of followers) {
              console.log(`  ${chalk.cyan(f.address)} ${f.is_following ? chalk.dim('(follows you)') : ''}`);
            }
          }
        } catch (error: any) {
          console.error(chalk.red('❌ Error:'), error.message);
        }
      })
  )
  .addCommand(
    new Command('following')
      .description('List accounts an address follows')
      .argument('<address>', 'Ethereum address')
      .option('--limit <number>', 'Number of results', '10')
      .option('--offset <number>', 'Result offset', '0')
      .option('--json', 'Output as JSON')
      .action(async (address, options) => {
        try {
          const data = await efpFetch<{ following: any[] }>(
            `/users/${address}/following?limit=${options.limit}&offset=${options.offset}`
          );
          const following = data.following || [];
          if (options.json) {
            console.log(JSON.stringify(following, null, 2));
          } else {
            console.log(chalk.green(`\n👤 Following (${following.length}):`));
            for (const f of following) {
              console.log(`  ${chalk.cyan(f.address)} ${f.is_following ? chalk.dim('(follows you)') : ''}`);
            }
          }
        } catch (error: any) {
          console.error(chalk.red('❌ Error:'), error.message);
        }
      })
  )
  .addCommand(
    new Command('follow')
      .description('Follow an Ethereum address on EFP')
      .argument('<target>', 'Address to follow')
      .option('--ows-wallet <id>', 'OWS Wallet ID to use')
      .action(async (target, options) => {
        try {
          const rl = createInterface();
          if (options.owsWallet) {
            const passphrase = await promptPassphrase(rl, 'Enter wallet passphrase: ');
            const pk = ows.getPrivateKey(options.owsWallet, passphrase);
            initWallet(pk);
          } else {
            initWallet();
          }
          rl.close();

          const listRecordsAddr = '0x7dAdDa25302e9c8e5E0E8343367F17A506C7730A' as Address;
          const mainnetClient = createPublicClient({
            chain: mainnet,
            transport: http(EFP_MAINNET_RPC),
          });

          console.log(chalk.cyan('\n🔗 Following:'), target);
          console.log(chalk.dim('From:'), config.signerAddress);

          const listOp = buildEfpFollowOp(target);
          const hash = await walletClient!.writeContract({
            address: listRecordsAddr,
            abi: EFP_LIST_RECORDS_ABI,
            functionName: 'applyListOp',
            args: [listOp],
          } as any);

          console.log(chalk.dim('Transaction:'), hash);
          console.log(chalk.yellow('⏳ Waiting for confirmation...'));

          const receipt = await mainnetClient.waitForTransactionReceipt({ hash });
          if (receipt.status === 'success') {
            console.log(chalk.green('✅ Followed successfully!'));
          } else {
            console.log(chalk.red('❌ Transaction reverted'));
          }
        } catch (error: any) {
          console.error(chalk.red('❌ Error:'), error.message);
        }
      })
  )
  .addCommand(
    new Command('unfollow')
      .description('Unfollow an Ethereum address on EFP')
      .argument('<target>', 'Address to unfollow')
      .option('--ows-wallet <id>', 'OWS Wallet ID to use')
      .action(async (target, options) => {
        try {
          const rl = createInterface();
          if (options.owsWallet) {
            const passphrase = await promptPassphrase(rl, 'Enter wallet passphrase: ');
            const pk = ows.getPrivateKey(options.owsWallet, passphrase);
            initWallet(pk);
          } else {
            initWallet();
          }
          rl.close();

          const listRecordsAddr = '0x7dAdDa25302e9c8e5E0E8343367F17A506C7730A' as Address;
          const mainnetClient = createPublicClient({
            chain: mainnet,
            transport: http(EFP_MAINNET_RPC),
          });

          console.log(chalk.cyan('\n🔗 Unfollowing:'), target);

          const listOp = buildEfpUnfollowOp(target);
          const hash = await walletClient!.writeContract({
            address: listRecordsAddr,
            abi: EFP_LIST_RECORDS_ABI,
            functionName: 'applyListOp',
            args: [listOp],
          } as any);

          console.log(chalk.dim('Transaction:'), hash);
          console.log(chalk.yellow('⏳ Waiting for confirmation...'));

          const receipt = await mainnetClient.waitForTransactionReceipt({ hash });
          if (receipt.status === 'success') {
            console.log(chalk.green('✅ Unfollowed successfully!'));
          } else {
            console.log(chalk.red('❌ Transaction reverted'));
          }
        } catch (error: any) {
          console.error(chalk.red('❌ Error:'), error.message);
        }
      })
  )
  .addCommand(
    new Command('mint-list')
      .description('Mint an EFP List NFT (free + gas)')
      .option('--ows-wallet <id>', 'OWS Wallet ID to use')
      .action(async options => {
        try {
          const rl = createInterface();
          if (options.owsWallet) {
            const passphrase = await promptPassphrase(rl, 'Enter wallet passphrase: ');
            const pk = ows.getPrivateKey(options.owsWallet, passphrase);
            initWallet(pk);
          } else {
            initWallet();
          }
          rl.close();

          const mainnetClient = createPublicClient({
            chain: mainnet,
            transport: http(EFP_MAINNET_RPC),
          });

          console.log(chalk.cyan('\n🪄 Minting EFP List NFT...'));

          const registryAddr = '0x5bB2D89c1990c86F5cC8b6Fb4211C18BcEE4A8a2' as Address;
          const hash = await walletClient!.writeContract({
            address: registryAddr,
            abi: EFP_LIST_REGISTRY_ABI,
            functionName: 'mint',
            args: [],
          } as any);

          console.log(chalk.dim('Transaction:'), hash);
          console.log(chalk.yellow('⏳ Waiting for confirmation...'));

          const receipt = await mainnetClient.waitForTransactionReceipt({ hash });
          if (receipt.status === 'success') {
            console.log(chalk.green('✅ EFP List minted!'));
            console.log(chalk.dim('Next step: Set it as your primary list with:'));
            console.log(chalk.cyan('  pnpm run cli -- efp set-primary'));
          } else {
            console.log(chalk.red('❌ Transaction reverted'));
          }
        } catch (error: any) {
          console.error(chalk.red('❌ Error:'), error.message);
        }
      })
  )
  .addCommand(
    new Command('set-primary')
      .description('Set your EFP List as primary')
      .argument('[tokenId]', 'Token ID of EFP List (auto-detects if not provided)')
      .option('--ows-wallet <id>', 'OWS Wallet ID to use')
      .action(async (tokenId, options) => {
        try {
          const rl = createInterface();
          if (options.owsWallet) {
            const passphrase = await promptPassphrase(rl, 'Enter wallet passphrase: ');
            const pk = ows.getPrivateKey(options.owsWallet, passphrase);
            initWallet(pk);
          } else {
            initWallet();
          }
          rl.close();

          const mainnetClient = createPublicClient({
            chain: mainnet,
            transport: http(EFP_MAINNET_RPC),
          });

          let resolvedTokenId = tokenId;
          if (!resolvedTokenId) {
            // Auto-detect primary list from API
            const data = await efpFetch<string | null>(`/users/${config.signerAddress}/primary-list`);
            if (data) {
              resolvedTokenId = data;
              console.log(chalk.dim(`Found existing primary list: ${resolvedTokenId}`));
            } else {
              // Use tokenId = 1 as fallback (newly minted)
              resolvedTokenId = '1';
              console.log(chalk.yellow('⚠️  No existing primary list found. Using token ID 1.'));
            }
          }

          const key = 'primary-list';
          const tokenIdBigInt = BigInt(resolvedTokenId);
          const value = `0x${tokenIdBigInt.toString(16).padStart(64, '0')}` as `0x${string}`;

          const metadataAddr = '0x3B6ADe10E9E2C44Cb7D1eC8f3CADE850Be02937f' as Address;

          console.log(chalk.cyan('\n⭐ Setting primary list...'));
          console.log(chalk.dim('Token ID:'), resolvedTokenId);

          const hash = await walletClient!.writeContract({
            address: metadataAddr,
            abi: EFP_ACCOUNT_METADATA_ABI,
            functionName: 'setValue',
            args: [key, value],
          } as any);

          console.log(chalk.dim('Transaction:'), hash);
          console.log(chalk.yellow('⏳ Waiting for confirmation...'));

          const receipt = await mainnetClient.waitForTransactionReceipt({ hash });
          if (receipt.status === 'success') {
            console.log(chalk.green('✅ Primary list set!'));
          } else {
            console.log(chalk.red('❌ Transaction reverted'));
          }
        } catch (error: any) {
          console.error(chalk.red('❌ Error:'), error.message);
        }
      })
  )
  .addCommand(
    new Command('status')
      .description('Check EFP setup status for your address')
      .option('--ows-wallet <id>', 'OWS Wallet ID to use')
      .option('--json', 'Output as JSON')
      .action(async options => {
        try {
          const opts = program.opts();
          initWallet(undefined, opts.wallet, opts.passphrase);

          const address = config.signerAddress;

          const [primaryList, stats] = await Promise.all([
            efpFetch<string | null>(`/users/${address}/primary-list`).catch(() => null),
            efpFetch<{ followers_count: string; following_count: string }>(`/users/${address}/stats`).catch(() => null),
          ]);

          if (options.json) {
            console.log(JSON.stringify({ address, primaryList, stats }, null, 2));
          } else {
            console.log(chalk.green('\n🔍 EFP Status:'));
            console.log(chalk.cyan('Address:'), address);
            console.log(chalk.cyan('Primary List:'), primaryList ? chalk.green(`✅ #${primaryList}`) : chalk.red('❌ Not set'));
            console.log(chalk.cyan('Followers:'), stats?.followers_count || '0');
            console.log(chalk.cyan('Following:'), stats?.following_count || '0');

            if (!primaryList) {
              console.log(chalk.yellow('\n⚠️  No primary EFP list found. Set up with:'));
              console.log(chalk.cyan('  pnpm run cli -- efp mint-list'));
            }
          }
        } catch (error: any) {
          console.error(chalk.red('❌ Error:'), error.message);
        }
      })
  );

// If no command provided, show help
if (process.argv.slice(2).length === 0) {
  program.outputHelp();
  process.exit(0);
}

// Parse command line arguments
program.parse(process.argv);
