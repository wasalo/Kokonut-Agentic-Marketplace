export async function register() {
  // Polyfill indexedDB for SSR to prevent ReferenceError from third-party deps
  // (idb-keyval via @walletconnect, mixpanel-browser)
  // This runs before any app code during server startup
  if (typeof globalThis !== 'undefined' && typeof window === 'undefined') {
    // Provide a mock indexedDB.open() that returns a no-op request object.
    // Without this, idb-keyval throws ReferenceError during SSR.
    const mockObjectStore = {
      get: () => {},
      put: () => {},
      delete: () => {},
      clear: () => {},
      getAll: () => {},
      getAllKeys: () => {},
      openCursor: () => {},
      transaction: { oncomplete: null, onerror: null },
    };
    const mockTransaction = {
      objectStore: () => mockObjectStore,
      oncomplete: null,
      onerror: null,
    };
    const mockDb = {
      transaction: () => mockTransaction,
      createObjectStore: () => mockObjectStore,
      close: () => {},
    };
    const makeRequest = () => {
      const request: any = { result: mockDb };
      request.onupgradeneeded = null;
      request.onsuccess = null;
      request.onerror = null;
      request.onabort = null;
      request.oncomplete = null;
      return request;
    };
    (globalThis as any).indexedDB = {
      open: makeRequest,
      deleteDatabase: makeRequest,
      databases: () => Promise.resolve([]),
      cmp: () => 0,
    };
  }
}
