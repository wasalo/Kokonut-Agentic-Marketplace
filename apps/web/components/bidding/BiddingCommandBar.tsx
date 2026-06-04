'use client';

import { Card, Button } from '@heroui/react';
import { Search, SlidersHorizontal } from 'lucide-react';
import { Input, Select } from '@/components/ui/Input';
import { card } from '@/lib/design-system';

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
    <Card className={card('padded', 'mb-6')}>
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-1">
          <div className="flex-1 max-w-md">
            <Input
              type="text"
              placeholder="Search sessions..."
              value={searchQuery}
              onChange={event => onSearchChange(event.target.value)}
              variant="subtle"
              icon={<Search className="size-4" />}
            />
          </div>

          <Button
            variant="ghost"
            size="sm"
            onPress={onToggleFilters}
            className={showFilters ? 'bg-primary/20' : ''}
          >
            <SlidersHorizontal className="size-4 mr-1" />
            Filters
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-default-500">Sort:</span>
          <Select
            value={`${sortBy}-${sortOrder}`}
            onChange={event => {
              const [newSort, newOrder] = event.target.value.split('-');
              onSortChange(newSort, newOrder);
            }}
            variant="subtle"
          >
            <option value="newest-desc">Newest First</option>
            <option value="newest-asc">Oldest First</option>
            <option value="budget-desc">Budget (High to Low)</option>
            <option value="budget-asc">Budget (Low to High)</option>
          </Select>
        </div>
      </div>

      {showFilters && (
        <div className="mt-4 pt-4 border-t border-divider">
          <div className="flex items-center gap-4">
            <Select
              label="Status"
              value={statusFilter}
              onChange={event => onStatusFilterChange(event.target.value)}
              variant="subtle"
            >
              <option value="all">All Statuses</option>
              <option value="0">Active</option>
              <option value="1">Bidding Closed</option>
              <option value="2">Winner Selected</option>
              <option value="3">Job Created</option>
              <option value="4">Completed</option>
              <option value="5">Cancelled</option>
            </Select>
          </div>
        </div>
      )}
    </Card>
  );
}
