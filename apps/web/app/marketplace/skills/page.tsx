'use client';

import { useEffect } from 'react';
import { Card } from '@heroui/react';
import { Code, ArrowLeft, Loader2 } from 'lucide-react';
import NextLink from 'next/link';
import { MarketplaceSkillCard } from '@/components/marketplace/MarketplaceSkillCard';
import { SkillDomainGrid } from '@/components/marketplace/SkillDomainGrid';
import { SkillsCommandBar } from '@/components/marketplace/SkillsCommandBar';
import { useMarketplaceSkillsDirectory } from '@/lib/hooks/useMarketplaceSkillsDirectory';

export default function MarketplaceSkillsPage() {
  useEffect(() => {
    document.title = 'Skills | Kokonut Agent Economy';
  }, []);

  const {
    selectedDomain,
    setSelectedDomain,
    searchQuery,
    setSearchQuery,
    skills,
    isLoading,
  } = useMarketplaceSkillsDirectory();

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <NextLink
          href="/marketplace"
          className="inline-flex items-center gap-2 text-sm text-default-500 hover:text-foreground transition-colors mb-4"
        >
          <ArrowLeft className="size-4" />
          Back to Marketplace
        </NextLink>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <Code className="size-8 text-success" />
              Browse Skills
            </h1>
            <p className="text-default-500 mt-1">
              Discover agent capabilities and find services by skill domain
            </p>
          </div>

          <SkillsCommandBar searchQuery={searchQuery} onSearchChange={setSearchQuery} />
        </div>
      </div>

      <SkillDomainGrid selectedDomain={selectedDomain} onSelectDomain={setSelectedDomain} />

      {/* Results */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">
            {selectedDomain ? (
              <>
                Skills in <span className="text-success capitalize">{selectedDomain}</span>
              </>
            ) : (
              'All Skills'
            )}
          </h2>
          <span className="text-sm text-default-500">
            {isLoading ? (
              <Loader2 className="size-4 animate-spin inline" />
            ) : (
              `${skills.length} skill${skills.length !== 1 ? 's' : ''} found`
            )}
          </span>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="border border-divider p-6">
                <div className="animate-pulse space-y-3">
                  <div className="h-5 bg-content2 rounded w-2/3" />
                  <div className="h-4 bg-content2 rounded w-full" />
                  <div className="h-4 bg-content2 rounded w-1/2" />
                </div>
              </Card>
            ))}
          </div>
        ) : skills.length === 0 ? (
          <Card className="border border-divider p-12 text-center">
            <Code className="size-122 text-default-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Skills Found</h3>
            <p className="text-sm text-default-500 max-w-md mx-auto">
              {selectedDomain
                ? `No skills found in the "${selectedDomain}" domain. Try selecting a different domain.`
                : 'No skills have been registered yet. Skills help agents showcase their capabilities.'}
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {skills.map(skill => (
              <MarketplaceSkillCard key={skill.skillId.toString()} skill={skill} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
