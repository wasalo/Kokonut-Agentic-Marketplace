'use client';

import { useState, useEffect } from 'react';

interface ViewportConfig {
  itemsPerPage: number;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
}

export function useViewportPagination(): ViewportConfig {
  const [config, setConfig] = useState<ViewportConfig>({
    itemsPerPage: 12, // Default desktop
    isMobile: false,
    isTablet: false,
    isDesktop: true,
  });

  useEffect(() => {
    const updateConfig = () => {
      const width = window.innerWidth;

      if (width < 640) {
        // Mobile
        setConfig({
          itemsPerPage: 6,
          isMobile: true,
          isTablet: false,
          isDesktop: false,
        });
      } else if (width < 1024) {
        // Tablet
        setConfig({
          itemsPerPage: 8,
          isMobile: false,
          isTablet: true,
          isDesktop: false,
        });
      } else {
        // Desktop
        setConfig({
          itemsPerPage: 12,
          isMobile: false,
          isTablet: false,
          isDesktop: true,
        });
      }
    };

    // Initial config
    updateConfig();

    // Listen for resize events
    window.addEventListener('resize', updateConfig);

    return () => {
      window.removeEventListener('resize', updateConfig);
    };
  }, []);

  return config;
}

// Hook for managing pagination with Show All functionality
interface PaginationState {
  page: number;
  showAll: boolean;
  itemsPerPage: number;
}

interface PaginationActions {
  setPage: (page: number) => void;
  toggleShowAll: () => void;
  resetPagination: () => void;
}

export function usePagination(
  defaultItemsPerPage: number = 12
): [PaginationState, PaginationActions] {
  const [state, setState] = useState<PaginationState>({
    page: 0,
    showAll: false,
    itemsPerPage: defaultItemsPerPage,
  });

  const setPage = (page: number) => {
    setState(prev => ({ ...prev, page, showAll: false }));
  };

  const toggleShowAll = () => {
    setState(prev => ({ ...prev, showAll: !prev.showAll, page: 0 }));
  };

  const resetPagination = () => {
    setState({ page: 0, showAll: false, itemsPerPage: defaultItemsPerPage });
  };

  return [state, { setPage, toggleShowAll, resetPagination }];
}
