'use client';

import React from 'react';
import { Button } from '@heroui/react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  className?: string;
  showPageSize?: boolean;
  itemsPerPageOptions?: number[];
  onItemsPerPageChange?: (count: number) => void;
}

export function Pagination({
  currentPage,
  totalItems,
  itemsPerPage,
  onPageChange,
  className = '',
  showPageSize = false,
  itemsPerPageOptions = [10, 20, 50],
  onItemsPerPageChange,
}: PaginationProps) {
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const hasNextPage = currentPage < totalPages - 1;
  const hasPrevPage = currentPage > 0;

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 0; i < totalPages; i++) pages.push(i);
    } else {
      if (currentPage < 3) {
        for (let i = 0; i < 4; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages - 1);
      } else if (currentPage > totalPages - 4) {
        pages.push(0);
        pages.push('...');
        for (let i = totalPages - 4; i < totalPages; i++) pages.push(i);
      } else {
        pages.push(0);
        pages.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages - 1);
      }
    }

    return pages;
  };

  if (totalItems === 0) return null;

  return (
    <div className={`flex flex-col sm:flex-row items-center justify-between gap-4 ${className}`}>
      <div className="flex items-center gap-2">
        <span className="text-sm text-default-500">
          Showing {currentPage * itemsPerPage + 1} -{' '}
          {Math.min((currentPage + 1) * itemsPerPage, totalItems)} of {totalItems}
        </span>
        {showPageSize && (
          <select
            className="h-8 px-2 rounded border border-divider bg-background text-sm"
            value={itemsPerPage}
            onChange={e => onItemsPerPageChange?.(Number(e.target.value))}
          >
            {itemsPerPageOptions.map(size => (
              <option key={size} value={size}>
                {size} / page
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="flex items-center gap-1">
        {/* First */}
        <Button
          isIconOnly
          size="sm"
          variant="light"
          onPress={() => onPageChange(0)}
          isDisabled={!hasPrevPage}
          aria-label="First page"
        >
          <ChevronsLeft className="w-4 h-4" />
        </Button>

        {/* Previous */}
        <Button
          isIconOnly
          size="sm"
          variant="light"
          onPress={() => onPageChange(currentPage - 1)}
          isDisabled={!hasPrevPage}
          aria-label="Previous page"
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>

        {/* Page Numbers */}
        <div className="flex items-center gap-1">
          {getPageNumbers().map((page, idx) =>
            typeof page === 'number' ? (
              <Button
                key={`${page}-${idx}`}
                size="sm"
                variant={page === currentPage ? 'flat' : 'light'}
                color={page === currentPage ? 'primary' : 'default'}
                onPress={() => onPageChange(page)}
                className="min-w-8"
              >
                {page + 1}
              </Button>
            ) : (
              <span key={`ellipsis-${idx}`} className="px-1 text-default-400">
                {page}
              </span>
            )
          )}
        </div>

        {/* Next */}
        <Button
          isIconOnly
          size="sm"
          variant="light"
          onPress={() => onPageChange(currentPage + 1)}
          isDisabled={!hasNextPage}
          aria-label="Next page"
        >
          <ChevronRight className="w-4 h-4" />
        </Button>

        {/* Last */}
        <Button
          isIconOnly
          size="sm"
          variant="light"
          onPress={() => onPageChange(totalPages - 1)}
          isDisabled={!hasNextPage}
          aria-label="Last page"
        >
          <ChevronsRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

// Hook for pagination state management
export function usePagination(defaultItemsPerPage = 12) {
  const [currentPage, setCurrentPage] = React.useState(0);
  const [itemsPerPage, setItemsPerPage] = React.useState(defaultItemsPerPage);

  const reset = React.useCallback(() => {
    setCurrentPage(0);
  }, []);

  const goToPage = React.useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  return {
    currentPage,
    itemsPerPage,
    setItemsPerPage,
    goToPage,
    reset,
    offset: currentPage * itemsPerPage,
  };
}
