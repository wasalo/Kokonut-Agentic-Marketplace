'use client';

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

interface TabsContextValue {
  value: string;
  setValue: (value: string) => void;
}

const TabsContext = React.createContext<TabsContextValue | null>(null);

function useTabsContext() {
  const context = React.useContext(TabsContext);
  if (!context) {
    throw new Error('Tabs components must be used within a Tabs provider');
  }
  return context;
}

const tabsVariants = cva(
  'flex flex-col sm:flex-row items-center justify-center rounded-md bg-muted p-1 text-muted-foreground',
  {
    variants: {
      variant: {
        default: 'bg-muted/50',
        underlined: 'bg-transparent',
      },
      size: {
        default: 'gap-1 p-1',
        sm: 'gap-0.5 p-0.5',
        lg: 'gap-1.5 p-1.5',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface TabsProps {
  variant?: 'default' | 'underlined';
  size?: 'default' | 'sm' | 'lg';
  defaultValue?: string;
  children: React.ReactNode;
  className?: string;
}

export function Tabs({ variant, size, defaultValue, className, children }: TabsProps) {
  const [value, setValue] = React.useState(defaultValue || 'overview');
  
  return (
    <TabsContext.Provider value={{ value, setValue }}>
      <div className={cn(tabsVariants({ variant, size }), 'w-full', className)}>
        {children}
      </div>
    </TabsContext.Provider>
  );
}

export interface TabsSeparateProps {
  variant?: 'default' | 'underlined';
  size?: 'default' | 'sm' | 'lg';
  defaultValue?: string;
  className?: string;
  children: (args: { activeValue: string; setActiveValue: (value: string) => void }) => React.ReactNode;
}

export function TabsSeparate({ defaultValue, children }: TabsSeparateProps) {
  const [value, setValue] = React.useState(defaultValue || 'overview');
  
  return (
    <TabsContext.Provider value={{ value, setValue }}>
      <div className="w-full">
        {children({ activeValue: value, setActiveValue: setValue })}
      </div>
    </TabsContext.Provider>
  );
}

export interface TabsListProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof tabsVariants> {
  children: React.ReactNode;
}

export function TabsList({ className, variant, size, children, ...props }: TabsListProps) {
  return (
    <div
      className={cn(
        'flex flex-col sm:flex-row items-center justify-center rounded-md bg-muted p-1 gap-1',
        variant === 'underlined' && 'bg-transparent',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export interface TabsTriggerProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof tabsVariants> {
  value: string;
  children?: React.ReactNode;
}

export function TabsTrigger({ value, className, variant, size, children, ...props }: TabsTriggerProps) {
  const { value: activeValue, setValue } = useTabsContext();
  const isActive = activeValue === value;
  
  return (
    <button
      role="tab"
      aria-selected={isActive}
      data-state={isActive ? 'active' : 'inactive'}
      onClick={() => setValue(value)}
      className={cn(
        'inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow',
        variant === 'underlined' &&
          'data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground',
        size === 'sm' && 'px-2 text-xs',
        size === 'lg' && 'px-4 text-base',
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export interface TabsContentProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof tabsVariants> {
  value: string;
  children: React.ReactNode;
}

export function TabsContent({ className, value, children, ...props }: TabsContentProps) {
  const { value: activeValue } = useTabsContext();
  const isActive = activeValue === value;
  
  if (!isActive) return null;
  
  return (
    <div
      role="tabpanel"
      className={cn('mt-2 md:mt-2', className)}
      {...props}
    >
      {children}
    </div>
  );
}