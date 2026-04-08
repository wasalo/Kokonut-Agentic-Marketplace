'use client';

import { createContext, useContext, useCallback, useState, useMemo, type ReactNode } from 'react';

export interface Transaction {
  id: string;
  description: string;
  status: 'pending' | 'confirming' | 'confirmed' | 'failed';
  hash?: `0x${string}`;
  timestamp: number;
}

interface TransactionContextValue {
  transactions: Transaction[];
  pendingCount: number;
  confirmingCount: number;
  isAnyPending: boolean;
  isAnyConfirming: boolean;
  addTransaction: (tx: Omit<Transaction, 'id' | 'timestamp'>) => string;
  updateTransaction: (id: string, updates: Partial<Transaction>) => void;
  removeTransaction: (id: string) => void;
  clearCompleted: () => void;
}

const TransactionContext = createContext<TransactionContextValue | null>(null);

let transactionCounter = 0;

export function TransactionProvider({ children }: { children: ReactNode }) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  const pendingCount = useMemo(
    () => transactions.filter(t => t.status === 'pending').length,
    [transactions]
  );

  const confirmingCount = useMemo(
    () => transactions.filter(t => t.status === 'confirming').length,
    [transactions]
  );

  const isAnyPending = pendingCount > 0;
  const isAnyConfirming = confirmingCount > 0;

  const addTransaction = useCallback((tx: Omit<Transaction, 'id' | 'timestamp'>): string => {
    const id = `tx-${++transactionCounter}-${Date.now()}`;
    const newTx: Transaction = {
      ...tx,
      id,
      timestamp: Date.now(),
    };

    setTransactions(prev => [newTx, ...prev].slice(0, 50));

    return id;
  }, []);

  const updateTransaction = useCallback((id: string, updates: Partial<Transaction>) => {
    setTransactions(prev => prev.map(tx => (tx.id === id ? { ...tx, ...updates } : tx)));
  }, []);

  const removeTransaction = useCallback((id: string) => {
    setTransactions(prev => prev.filter(tx => tx.id !== id));
  }, []);

  const clearCompleted = useCallback(() => {
    setTransactions(prev => prev.filter(t => t.status !== 'confirmed'));
  }, []);

  const value = useMemo(
    () => ({
      transactions,
      pendingCount,
      confirmingCount,
      isAnyPending,
      isAnyConfirming,
      addTransaction,
      updateTransaction,
      removeTransaction,
      clearCompleted,
    }),
    [
      transactions,
      pendingCount,
      confirmingCount,
      isAnyPending,
      isAnyConfirming,
      addTransaction,
      updateTransaction,
      removeTransaction,
      clearCompleted,
    ]
  );

  return <TransactionContext.Provider value={value}>{children}</TransactionContext.Provider>;
}

export function useTransactionContext() {
  const context = useContext(TransactionContext);
  if (!context) {
    throw new Error('useTransactionContext must be used within a TransactionProvider');
  }
  return context;
}

export function useTransactionTracker() {
  const { addTransaction, updateTransaction, removeTransaction } = useTransactionContext();

  const trackTransaction = useCallback(
    (
      hash: `0x${string}`,
      description: string,
      wait: () => Promise<{ status: 'success' | 'reverted' }>
    ) => {
      const id = addTransaction({
        description,
        hash,
        status: 'pending',
      });

      wait()
        .then(result => {
          if (result.status === 'success') {
            updateTransaction(id, { status: 'confirmed' });
            setTimeout(() => removeTransaction(id), 3000);
          } else {
            updateTransaction(id, { status: 'failed' });
          }
        })
        .catch(() => {
          updateTransaction(id, { status: 'failed' });
        });

      return id;
    },
    [addTransaction, updateTransaction, removeTransaction]
  );

  return { trackTransaction };
}

export default TransactionProvider;
