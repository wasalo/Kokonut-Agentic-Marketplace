/**
 * Injects a deterministic window.ethereum shim into the page before any app
 * JavaScript runs. Sepolia chain (0xaa36a7 = 11155111), single test account.
 *
 * Use from a test like:
 *   test.beforeEach(async ({ context }) => {
 *     await installMockWallet(context);
 *   });
 */
import type { BrowserContext, Page } from '@playwright/test';

export const MOCK_TEST_ADDRESS = '0x742d35Cc6634C0532925a3b844Bc454e4438f44e';
export const MOCK_CHAIN_ID = '0xaa36a7'; // 11155111 (Sepolia)

export const WALLET_INIT_SCRIPT = `
(() => {
  const HEX_ADDRESS = ${JSON.stringify(MOCK_TEST_ADDRESS)};
  const CHAIN_ID = ${JSON.stringify(MOCK_CHAIN_ID)};
  const accounts = [HEX_ADDRESS];

  const noop = () => undefined;
  const respond = (id, result) => ({ jsonrpc: '2.0', id, result });

  window.ethereum = {
    isMetaMask: true,
    _state: { isConnected: false, accounts: [] },
    request: async ({ method, params, id = Math.floor(Math.random() * 1e9) }) => {
      switch (method) {
        case 'eth_requestAccounts':
        case 'eth_accounts': {
          window.ethereum._state.isConnected = true;
          window.ethereum._state.accounts = accounts;
          window.dispatchEvent(new Event('accountsChanged'));
          return accounts;
        }
        case 'eth_chainId':
          return CHAIN_ID;
        case 'wallet_switchEthereumChain':
        case 'wallet_addEthereumChain':
          return null;
        case 'net_version':
          return '11155111';
        case 'personal_sign': {
          const message = params[0];
          // Mocked signature: 0x + 64 byte hex (deterministic but not cryptographically valid).
          const encoded = new TextEncoder().encode(String(message));
          let hash = 0;
          for (let i = 0; i < encoded.length; i++) {
            hash = (hash * 31 + encoded[i]) | 0;
          }
          const sig = '0x' + hash.toString(16).padStart(8, '0').repeat(16);
          return sig;
        }
        case 'eth_signTypedData_v4':
        case 'eth_signTypedData':
          return '0x' + '0'.repeat(130);
        case 'eth_blockNumber':
          return '0x1234';
        case 'eth_getBalance':
          return '0x0';
        case 'eth_estimateGas':
          return '0x5208';
        case 'eth_gasPrice':
          return '0x3b9aca00';
        case 'eth_sendTransaction':
          return '0x' + Math.random().toString(16).slice(2).padStart(64, '0');
        case 'wallet_requestPermissions':
        case 'wallet_getPermissions':
          return [{ parentCapability: 'eth_accounts', caveats: [] }];
        default:
          // Avoid throwing on unknown methods so wagmi reads don't break the page.
          return null;
      }
    },
    on: (event, handler) => {
      if (event === 'accountsChanged' || event === 'chainChanged' || event === 'disconnect') {
        // no-op storage
      }
    },
    removeListener: noop,
    removeAllListeners: noop,
    enable: async () => accounts,
    isConnected: () => true,
  };

  // RainbowKit / wagmi read from these directly
  Object.defineProperty(window, 'ethereum', { value: window.ethereum, writable: false });
})();
`;

export async function installMockWallet(context: BrowserContext): Promise<void> {
  await context.addInitScript(WALLET_INIT_SCRIPT);
}

export async function connectMockWallet(page: Page): Promise<void> {
  await page.evaluate(() => {
    if (typeof window === 'undefined' || !window.ethereum) return;
    window.ethereum._state.isConnected = true;
    window.ethereum._state.accounts = ['${MOCK_TEST_ADDRESS}'];
    window.dispatchEvent(new Event('accountsChanged'));
  });
}
