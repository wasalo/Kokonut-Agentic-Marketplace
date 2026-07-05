'use client';

import { Search } from 'lucide-react';

interface SkillsCommandBarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
}

export function SkillsCommandBar({ searchQuery, onSearchChange }: SkillsCommandBarProps) {
  return (
    <div className="relative w-full md:w-80">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-default-400" />
      <input
        type="text"
        placeholder="Search skills..."
        value={searchQuery}
        onChange={event => onSearchChange(event.target.value)}
        className="w-full pl-10 pr-4 py-2 border border-divider rounded-lg bg-content2 focus:outline-none focus:ring-2 focus:ring-success text-foreground"
      />
    </div>
  );
}
