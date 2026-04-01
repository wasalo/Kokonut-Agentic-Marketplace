'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

interface DebugContextType {
  isDebug: boolean;
  toggleDebug: () => void;
}

const DebugContext = createContext<DebugContextType | undefined>(undefined);

export function DebugProvider({ children }: { children: ReactNode }) {
  const [isDebug, setIsDebug] = useState(false);
  
  const toggleDebug = () => setIsDebug(prev => !prev);
  
  return (
    <DebugContext.Provider value={{ isDebug, toggleDebug }}>
      {children}
    </DebugContext.Provider>
  );
}

export function useDebug() {
  const context = useContext(DebugContext);
  if (!context) {
    throw new Error('useDebug must be used within DebugProvider');
  }
  return context;
}
