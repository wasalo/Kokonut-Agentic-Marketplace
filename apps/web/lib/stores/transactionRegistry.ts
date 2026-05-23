import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type TransactionType =
  | 'create-job'
  | 'fund-job'
  | 'submit'
  | 'approve'
  | 'finalize'
  | 'reject'
  | 'refund'
  | 'complete-timeout'
  | 'refund-expired'
  | 'usdc-approve'
  | 'register-evaluator'
  | 'unregister-evaluator'
  | 'create-proposal'
  | 'submit-evaluation'
  | 'attest-decision'
  | 'claim-reward'
  | 'release-stake'
  | 'cancel-proposal'
  | 'slash-evaluator'
  | 'commit-bid'
  | 'reveal-bid'
  | 'accept-bid'
  | 'withdraw-stake'
  | 'withdraw-creator-stake'
  | 'cancel-session'
  | 'enable-milestones'
  | 'add-milestone'
  | 'submit-milestone'
  | 'approve-milestone'
  | 'reject-milestone'
  | 'raise-dispute'
  | 'resolve-dispute';

export type TransactionStatus =
  | 'preparing'
  | 'awaiting-signature'
  | 'pending'
  | 'confirming'
  | 'confirmed'
  | 'failed'
  | 'cancelled';

export interface SimulationPreview {
  ethBalanceChange: number;
  tokenBalanceChanges: Array<{
    token: string;
    symbol: string;
    decimals: number;
    change: number;
    reason: string;
  }>;
  stateChanges: Array<{
    entity: string;
    from: string;
    to: string;
    reason: string;
  }>;
  warnings: Array<{
    severity: 'low' | 'medium' | 'high';
    message: string;
  }>;
}

export interface TransactionRecord {
  id: string;
  txHash?: `0x${string}`;
  type: TransactionType;
  status: TransactionStatus;
  chainId: number;
  from: `0x${string}`;
  targetContract: `0x${string}`;
  description: string;
  simulation?: SimulationPreview;
  gasEstimate?: bigint;
  error?: string;
  confirmations: number;
  submittedAt: number;
  confirmedAt?: number;
  blockNumber?: number;
  etherscanUrl?: string;
  parentId?: string;
  nextStep?: {
    type: TransactionType;
    description: string;
    params: Record<string, unknown>;
  };
  resumedAt?: number;
  resumeAttempts: number;
}

interface TransactionRegistryState {
  transactions: TransactionRecord[];
  activeChainId: number;

  addTransaction: (tx: Omit<TransactionRecord, 'id' | 'status' | 'submittedAt' | 'confirmations' | 'resumeAttempts'>) => string;
  updateTransaction: (id: string, updates: Partial<TransactionRecord>) => void;
  removeTransaction: (id: string) => void;
  clearCompleted: (olderThanHours?: number) => void;
  getPending: () => TransactionRecord[];
  getResumable: () => TransactionRecord[];
  getRecent: (limit?: number) => TransactionRecord[];
}

const MAX_RECORDS = 100;
const DEFAULT_TTL_HOURS = 168; // 7 days

function generateId(): string {
  return `tx-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

export const useTransactionRegistry = create<TransactionRegistryState>()(
  persist(
    (set, get) => ({
      transactions: [],
      activeChainId: 11155111, // Sepolia

      addTransaction: (tx) => {
        const id = generateId();
        const now = Date.now();
        const record: TransactionRecord = {
          ...tx,
          id,
          status: 'preparing',
          confirmations: 0,
          resumeAttempts: 0,
          submittedAt: now,
        };

        set((state) => {
          const txs = [record, ...state.transactions];
          if (txs.length > MAX_RECORDS) {
            return { transactions: txs.slice(0, MAX_RECORDS) };
          }
          return { transactions: txs };
        });

        return id;
      },

      updateTransaction: (id, updates) => {
        set((state) => ({
          transactions: state.transactions.map((tx) =>
            tx.id === id ? { ...tx, ...updates } : tx
          ),
        }));
      },

      removeTransaction: (id) => {
        set((state) => ({
          transactions: state.transactions.filter((tx) => tx.id !== id),
        }));
      },

      clearCompleted: (olderThanHours = DEFAULT_TTL_HOURS) => {
        const cutoff = Date.now() - olderThanHours * 60 * 60 * 1000;
        set((state) => ({
          transactions: state.transactions.filter((tx) => {
            if (tx.status === 'confirmed' && tx.confirmedAt && tx.confirmedAt < cutoff) {
              return false;
            }
            if (tx.status === 'failed' && tx.submittedAt < cutoff) {
              return false;
            }
            return true;
          }),
        }));
      },

      getPending: () => {
        return get().transactions.filter(
          (tx) =>
            tx.status === 'pending' ||
            tx.status === 'confirming' ||
            tx.status === 'awaiting-signature'
        );
      },

      getResumable: () => {
        return get().transactions.filter(
          (tx) => tx.nextStep && (tx.status === 'confirmed' || tx.status === 'failed')
        );
      },

      getRecent: (limit = 20) => {
        return get().transactions.slice(0, limit);
      },
    }),
    {
      name: 'kokonut-transaction-registry',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ transactions: state.transactions }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Clean up stale records on load
          const cutoff = Date.now() - DEFAULT_TTL_HOURS * 60 * 60 * 1000;
          state.transactions = state.transactions.filter((tx) => {
            const txTime = tx.confirmedAt || tx.submittedAt;
            return txTime > cutoff;
          });
        }
      },
    }
  )
);
