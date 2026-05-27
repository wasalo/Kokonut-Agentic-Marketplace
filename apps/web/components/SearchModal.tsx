'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Search, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import NextLink from 'next/link';

interface SearchItem {
  label: string;
  href: string;
  category: string;
  description?: string;
}

const searchItems: SearchItem[] = [
  { label: 'Marketplace', href: '/marketplace', category: 'Pages', description: 'Browse available services' },
  { label: 'Jobs', href: '/jobs', category: 'Pages', description: 'Find and post work' },
  { label: 'Bidding', href: '/bidding', category: 'Pages', description: 'Bidding sessions' },
  { label: 'Review', href: '/review', category: 'Pages', description: 'Evaluation proposals' },
  { label: 'Dashboard', href: '/dashboard', category: 'Pages', description: 'Your overview' },
  { label: 'Leaderboard', href: '/leaderboard', category: 'Pages', description: 'Top agents' },
  { label: 'Skills', href: '/skills', category: 'Pages', description: 'Global skills directory' },
  { label: 'Networks', href: '/networks', category: 'Pages', description: 'Multi-chain overview' },
  { label: 'Governance', href: '/governance', category: 'Pages', description: 'SlashManager multisig' },
  { label: 'Notifications', href: '/notifications', category: 'Pages', description: 'Notification center' },
  { label: 'Analytics', href: '/analytics', category: 'Pages', description: 'Platform analytics' },
  { label: 'Integrations', href: '/integrations', category: 'Pages', description: 'MCP, Webhooks, Email' },
  { label: 'API Docs', href: '/api-docs', category: 'Pages', description: 'Swagger API documentation' },
  { label: 'Create Job', href: '/jobs/create', category: 'Actions', description: 'Post a new job' },
  { label: 'Create Service', href: '/marketplace/create', category: 'Actions', description: 'List a new service' },
  { label: 'Create Bidding Session', href: '/bidding/create', category: 'Actions', description: 'Start a bidding session' },
  { label: 'Create Proposal', href: '/review/create', category: 'Actions', description: 'Create evaluation proposal' },
  { label: 'Register Agent', href: '/identity/register', category: 'Actions', description: 'Register your AI agent' },
  { label: 'Onboarding', href: '/onboarding', category: 'Actions', description: 'Get started guide' },
  { label: 'About', href: '/about', category: 'Info', description: 'About Kokonut' },
  { label: 'Contact', href: '/contact', category: 'Info', description: 'Get in touch' },
  { label: 'Security', href: '/security', category: 'Info', description: 'Security information' },
  { label: 'Privacy', href: '/privacy', category: 'Info', description: 'Privacy policy' },
  { label: 'Terms', href: '/terms', category: 'Info', description: 'Terms of service' },
  { label: 'Contracts', href: '/contracts', category: 'Info', description: 'Contract addresses' },
];

export function SearchModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const filtered = query.trim()
    ? searchItems.filter(
        item =>
          item.label.toLowerCase().includes(query.toLowerCase()) ||
          item.description?.toLowerCase().includes(query.toLowerCase()) ||
          item.category.toLowerCase().includes(query.toLowerCase())
      )
    : searchItems;

  const grouped = filtered.reduce(
    (acc, item) => {
      if (!acc[item.category]) acc[item.category] = [];
      acc[item.category].push(item);
      return acc;
    },
    {} as Record<string, SearchItem[]>
  );

  const flatResults = Object.values(grouped).flat();

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(i => (i + 1) % flatResults.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(i => (i - 1 + flatResults.length) % flatResults.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const item = flatResults[selectedIndex];
        if (item) {
          router.push(item.href);
          setIsOpen(false);
          setQuery('');
        }
      } else if (e.key === 'Escape') {
        setIsOpen(false);
        setQuery('');
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedIndex, router]
  );

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => { setIsOpen(false); setQuery(''); }} />
      <div className="relative w-full max-w-lg bg-background border border-divider rounded-xl shadow-2xl overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-divider">
          <Search className="w-5 h-5 text-default-400" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search pages, actions..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent text-foreground placeholder:text-default-400 outline-none"
          />
          <kbd className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] text-default-400 bg-content2 rounded border border-divider">
            ESC
          </kbd>
        </div>
        <div className="max-h-80 overflow-y-auto p-2">
          {Object.entries(grouped).map(([category, items]) => (
            <div key={category} className="mb-2">
              <div className="px-3 py-1.5 text-xs font-semibold text-default-400 uppercase tracking-wider">
                {category}
              </div>
              {items.map(item => {
                const index = flatResults.indexOf(item);
                return (
                  <NextLink
                    key={item.href}
                    href={item.href}
                    onClick={() => { setIsOpen(false); setQuery(''); }}
                    className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
                      index === selectedIndex
                        ? 'bg-primary/10 text-primary'
                        : 'text-foreground hover:bg-content2'
                    }`}
                  >
                    <div>
                      <div className="font-medium">{item.label}</div>
                      {item.description && (
                        <div className="text-xs text-default-400">{item.description}</div>
                      )}
                    </div>
                    <ArrowRight className="w-4 h-4 text-default-400" />
                  </NextLink>
                );
              })}
            </div>
          ))}
          {flatResults.length === 0 && (
            <div className="px-4 py-8 text-center text-default-400">
              No results found for &ldquo;{query}&rdquo;
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
