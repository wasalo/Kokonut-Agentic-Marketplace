'use client';

import React, { useState, useCallback } from 'react';
import { Search } from 'lucide-react';
import { Input, Card } from '@heroui/react';

interface FilterConfig {
  type: 'search' | 'select' | 'range' | 'checkbox';
  key: string;
  label: string;
  placeholder?: string;
  options?: { value: string; label: string }[];
  min?: number;
  max?: number;
}

interface FilterPanelProps {
  searchPlaceholder?: string;
  onSearchChange?: (value: string) => void;
  searchValue?: string;
  filters?: FilterConfig[];
  filterValues?: Record<string, unknown>;
  onFilterChange?: (key: string, value: unknown) => void;
  onReset?: () => void;
  className?: string;
}

export function FilterPanel({
  searchPlaceholder = 'Search...',
  onSearchChange,
  searchValue = '',
  filters = [],
  filterValues = {},
  onFilterChange,
  onReset,
  className = '',
}: FilterPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [localSearch, setLocalSearch] = useState(searchValue);

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setLocalSearch(value);
      onSearchChange?.(value);
    },
    [onSearchChange]
  );

  const hasActiveFilters = filters.some(
    f => filterValues[f.key] !== undefined && filterValues[f.key] !== ''
  );

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Search Bar */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-default-400" />
          <Input
            type="text"
            placeholder={searchPlaceholder}
            value={localSearch}
            onChange={handleSearchChange}
            className="pl-10"
          />
        </div>
        {filters.length > 0 && (
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="px-4 py-2 rounded-lg bg-default-100 hover:bg-default-200 transition-colors"
          >
            Filters{' '}
            {hasActiveFilters &&
              `(${filters.filter(f => filterValues[f.key] !== undefined && filterValues[f.key] !== '').length})`}
          </button>
        )}
        {hasActiveFilters && onReset && (
          <button
            type="button"
            onClick={onReset}
            className="px-4 py-2 rounded-lg text-danger hover:bg-danger-50 transition-colors"
          >
            Reset
          </button>
        )}
      </div>

      {/* Filter Panel */}
      {isExpanded && filters.length > 0 && (
        <Card className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filters.map(filter => (
              <div key={filter.key} className="space-y-2">
                <label className="text-sm font-medium">{filter.label}</label>
                {filter.type === 'select' && (
                  <select
                    className="w-full h-10 px-3 rounded-lg border border-divider bg-background"
                    value={(filterValues[filter.key] as string) || ''}
                    onChange={e => onFilterChange?.(filter.key, e.target.value)}
                  >
                    <option value="">{filter.placeholder || `All ${filter.label}`}</option>
                    {filter.options?.map(opt => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                )}
                {filter.type === 'search' && (
                  <Input
                    type="text"
                    placeholder={filter.placeholder || `Search ${filter.label}`}
                    value={(filterValues[filter.key] as string) || ''}
                    onChange={e => onFilterChange?.(filter.key, e.target.value)}
                  />
                )}
                {filter.type === 'range' && (
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      placeholder="Min"
                      value={(filterValues[`${filter.key}Min`] as string) || ''}
                      onChange={e => onFilterChange?.(`${filter.key}Min`, e.target.value)}
                    />
                    <Input
                      type="number"
                      placeholder="Max"
                      value={(filterValues[`${filter.key}Max`] as string) || ''}
                      onChange={e => onFilterChange?.(`${filter.key}Max`, e.target.value)}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

// Common filter configurations for marketplace pages
export const FilterPresets = {
  jobs: (): FilterConfig[] => [
    {
      type: 'select',
      key: 'status',
      label: 'Status',
      options: [
        { value: '0', label: 'Open' },
        { value: '1', label: 'Funded' },
        { value: '2', label: 'Submitted' },
        { value: '3', label: 'Completed' },
        { value: '4', label: 'Rejected' },
        { value: '5', label: 'Expired' },
      ],
    },
    {
      type: 'select',
      key: 'role',
      label: 'Role',
      options: [
        { value: 'client', label: 'As Client' },
        { value: 'provider', label: 'As Provider' },
        { value: 'evaluator', label: 'As Evaluator' },
      ],
    },
    { type: 'range', key: 'budget', label: 'Budget (USDC)', min: 0, max: 100000 },
  ],
  services: (): FilterConfig[] => [
    {
      type: 'select',
      key: 'status',
      label: 'Status',
      options: [
        { value: 'active', label: 'Active' },
        { value: 'inactive', label: 'Inactive' },
      ],
    },
    {
      type: 'select',
      key: 'domain',
      label: 'Domain',
      options: [
        { value: 'defi', label: 'DeFi' },
        { value: 'nft', label: 'NFT' },
        { value: 'ai', label: 'AI / ML' },
        { value: 'web3', label: 'Web3' },
        { value: 'data', label: 'Data Analysis' },
      ],
    },
    { type: 'range', key: 'price', label: 'Price (USDC)', min: 0, max: 10000 },
  ],
  proposals: (): FilterConfig[] => [
    {
      type: 'select',
      key: 'status',
      label: 'Status',
      options: [
        { value: '0', label: 'Open' },
        { value: '1', label: 'Under Review' },
        { value: '2', label: 'Decided' },
        { value: '3', label: 'Cancelled' },
      ],
    },
    { type: 'range', key: 'reward', label: 'Reward (ETH)', min: 0, max: 10 },
  ],
};
