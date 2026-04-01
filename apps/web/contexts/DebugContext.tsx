'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface DebugLog {
  id: string;
  timestamp: Date;
  category: 'contract' | 'api' | 'error' | 'info';
  message: string;
  data?: any;
}

interface DebugContextType {
  isDebugMode: boolean;
  toggleDebugMode: () => void;
  logs: DebugLog[];
  addLog: (category: DebugLog['category'], message: string, data?: any) => void;
  clearLogs: () => void;
}

const DebugContext = createContext<DebugContextType | undefined>(undefined);

// Debug mode is disabled in production unless explicitly enabled via env var
const DEBUG_ENABLED = process.env.NEXT_PUBLIC_DEBUG_MODE === 'true';
const isProduction = process.env.NODE_ENV === 'production';

export function DebugProvider({ children }: { children: ReactNode }) {
  const [isDebugMode, setIsDebugMode] = useState(() => {
    // Disable debug mode in production unless explicitly enabled
    if (isProduction && !DEBUG_ENABLED) {
      return false;
    }
    if (typeof window !== 'undefined') {
      return localStorage.getItem('kokonut_debug_mode') === 'true';
    }
    return false;
  });

  const [logs, setLogs] = useState<DebugLog[]>([]);

  const toggleDebugMode = useCallback(() => {
    // Prevent toggling debug mode in production unless explicitly enabled
    if (isProduction && !DEBUG_ENABLED) {
      console.warn('[DebugContext] Debug mode is disabled in production');
      return;
    }
    setIsDebugMode(prev => {
      const newValue = !prev;
      if (typeof window !== 'undefined') {
        localStorage.setItem('kokonut_debug_mode', String(newValue));
      }
      return newValue;
    });
  }, []);

  const addLog = useCallback((category: DebugLog['category'], message: string, data?: any) => {
    const log: DebugLog = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date(),
      category,
      message,
      data,
    };

    setLogs(prev => [log, ...prev].slice(0, 50)); // Keep last 50 logs

    // Also log to console
    const prefix = `[DEBUG:${category.toUpperCase()}]`;
    if (data) {
      console.log(prefix, message, data);
    } else {
      console.log(prefix, message);
    }
  }, []);

  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  return (
    <DebugContext.Provider value={{ isDebugMode, toggleDebugMode, logs, addLog, clearLogs }}>
      {children}
    </DebugContext.Provider>
  );
}

export function useDebug() {
  const context = useContext(DebugContext);
  if (context === undefined) {
    throw new Error('useDebug must be used within a DebugProvider');
  }
  return context;
}
