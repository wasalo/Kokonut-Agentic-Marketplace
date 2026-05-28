'use client';

import { Card, Button } from '@heroui/react';
import { Search, SlidersHorizontal } from 'lucide-react';

interface BiddingCommandBarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  showFilters: boolean;
  onToggleFilters: () => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  sortBy: string;
  sortOrder: string;
  onSortChange: (sortBy: string, sortOrder: string) => void;
}

export function BiddingCommandBar({
  searchQuery,
  onSearchChange,
  showFilters,
  onToggleFilters,
  statusFilter,
  onStatusFilterChange,
  sortBy,
  sortOrder,
  onSortChange,
}: BiddingCommandBarProps) {
  return (
    <Card className="border border-divider p-4 mb-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-default-400" />
            <input
              type="text"
              placeholder="Search sessions..."
              value={searchQuery}
              onChange={event => onSearchChange(event.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-content1 border border-divider rounded-lg focus:outline-none focus:border-[#009F4D]"
            />
          </div>

          <Button
            variant="ghost"
            size="sm"
            onPress={onToggleFilters}
            className={showFilters ? 'bg-[#009F4D]/20' : ''}
          >
            <SlidersHorizontal className="size-4 mr-1" />
            Filters
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-default-500">Sort:</span>
          <select
            value={`${sortBy}-${sortOrder}`}
            onChange={event => {
              const [newSort, newOrder] = event.target.value.split('-');
              onSortChange(newSort, newOrder);
            }}
            className="bg-content1 border border-divider rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#009F4D]"
          >
            <option value="newest-desc">Newest First</option>
            <option value="newest-asc">Oldest First</option>
            <option value="budget-desc">Budget (High to Low)</option>
            <option value="budget-asc">Budget (Low to High)</option>
          </select>
        </div>
      </div>

      {showFilters && (
        <div className="mt-4 pt-4 border-t border-divider">
          <div className="flex items-center gap-4">
            <div>
              <label className="text-sm text-default-500 mb-1 block">Status</label>
              <select
                value={statusFilter}
                onChange={event => onStatusFilterChange(event.target.value)}
                className="bg-content1 border border-divider rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#009F4D]"
              >
                <option value="all">All Statuses</option>
                <option value="0">Active</option>
                <option value="1">Bidding Closed</option>
                <option value="2">Winner Selected</option>
                <option value="3">Job Created</option>
                <option value="4">Completed</option>
                <option value="5">Cancelled</option>
              </select>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
