'use client';

import { Card } from '@heroui/react';
import type { ReactNode } from 'react';
import { Search, SlidersHorizontal } from 'lucide-react';
import { JobStatus } from '@/lib/hooks/useJobs';
import { card } from '@/lib/design-system';

interface JobsCommandBarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  isSearching: boolean;
  showFilters: boolean;
  onToggleFilters: () => void;
  isConnected: boolean;
  roleFilter: string;
  onRoleFilterChange: (value: string) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  minBudget: string;
  onMinBudgetChange: (value: string) => void;
  maxBudget: string;
  onMaxBudgetChange: (value: string) => void;
}

export function JobsCommandBar({
  searchQuery,
  onSearchChange,
  isSearching,
  showFilters,
  onToggleFilters,
  isConnected,
  roleFilter,
  onRoleFilterChange,
  statusFilter,
  onStatusFilterChange,
  minBudget,
  onMinBudgetChange,
  maxBudget,
  onMaxBudgetChange,
}: JobsCommandBarProps) {
  return (
    <Card className={card('padded', 'mb-6')}>
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-default-400" />
          <input
            type="text"
            placeholder="Search jobs..."
            className="w-full pl-10 pr-10 py-2 border border-divider rounded-lg bg-content2 focus:outline-none focus:ring-2 focus:ring-success text-foreground"
            value={searchQuery}
            onChange={event => onSearchChange(event.target.value)}
          />
          {isSearching && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin rounded-full border-2 border-default-400 border-t-transparent" />
          )}
        </div>
        <button
          type="button"
          onClick={onToggleFilters}
          className={`flex items-center gap-2 px-4 py-2 border border-divider rounded-lg hover:bg-content2 transition-colors ${showFilters ? 'bg-content2' : ''}`}
        >
          <SlidersHorizontal className="h-4 w-4" />
          <span className="hidden sm:inline">Filters</span>
        </button>
      </div>

      {showFilters && (
        <div className="mt-4 pt-4 border-t border-divider grid grid-cols-1 sm:grid-cols-4 gap-4">
          {isConnected && (
            <FilterSelect label="Role" value={roleFilter} onChange={onRoleFilterChange}>
              <option value="all">All Jobs</option>
              <option value="myJobs">My Jobs</option>
            </FilterSelect>
          )}

          <FilterSelect label="Status" value={statusFilter} onChange={onStatusFilterChange}>
            <option value="all">All Statuses</option>
            <option value={JobStatus.Open.toString()}>Open</option>
            <option value={JobStatus.Funded.toString()}>Funded</option>
            <option value={JobStatus.Submitted.toString()}>In Progress</option>
            <option value={JobStatus.Completed.toString()}>Completed</option>
          </FilterSelect>

          <BudgetInput label="Min Budget (USDC)" value={minBudget} placeholder="0" onChange={onMinBudgetChange} />
          <BudgetInput label="Max Budget (USDC)" value={maxBudget} placeholder="Any" onChange={onMaxBudgetChange} />
        </div>
      )}
    </Card>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
}) {
  return (
    <div>
      <label className="text-sm font-medium text-default-500 mb-2 block">{label}</label>
      <select
        value={value}
        onChange={event => onChange(event.target.value)}
        className="w-full px-3 py-2 border border-divider rounded-lg bg-content2 focus:outline-none focus:ring-2 focus:ring-success"
      >
        {children}
      </select>
    </div>
  );
}

function BudgetInput({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="text-sm font-medium text-default-500 mb-2 block">{label}</label>
      <input
        type="number"
        placeholder={placeholder}
        value={value}
        onChange={event => onChange(event.target.value)}
        className="w-full px-3 py-2 border border-divider rounded-lg bg-content2 focus:outline-none focus:ring-2 focus:ring-success"
      />
    </div>
  );
}
