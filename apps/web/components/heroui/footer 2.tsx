'use client';

import { Sprout } from 'lucide-react';

export function Footer() {
  return (
    <footer className="border-t border-divider py-6 px-4">
      <div className="container mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sprout className="h-5 w-5 text-success" />
          <span className="text-sm text-default-500">
            © 2026 Kokonut Network. All rights reserved.
          </span>
        </div>
        <div className="flex gap-4 text-sm text-default-500">
          <a href="https://github.com/wasalo/Kokonut-Agentic-Marketplace" target="_blank" rel="noopener noreferrer" className="hover:text-foreground">
            GitHub
          </a>
          <a href="https://kokonut.network" target="_blank" rel="noopener noreferrer" className="hover:text-foreground">
            Website
          </a>
        </div>
      </div>
    </footer>
  );
}
