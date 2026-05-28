'use client';

import Image from 'next/image';
import { ExternalLink } from 'lucide-react';
import { Card } from '@heroui/react';
import type { PortfolioItem } from './PortfolioForm';

interface PortfolioCardProps {
  item: PortfolioItem;
}

export function PortfolioCard({ item }: PortfolioCardProps) {
  return (
    <Card className="border border-divider p-4 hover:shadow-md transition-shadow">
      {item.image && (
        <div className="mb-3 rounded-lg overflow-hidden bg-content2">
          <Image
            src={item.image}
            alt={item.title}
            width={0}
            height={0}
            sizes="100vw"
            className="w-full h-32 object-cover"
            unoptimized
            onError={e => {
              e.currentTarget.style.display = 'none';
            }}
          />
        </div>
      )}

      <h3 className="font-semibold text-foreground line-clamp-1">{item.title}</h3>
      <p className="text-sm text-default-500 mt-1 line-clamp-2">{item.description}</p>

      {item.link && (
        <a
          href={item.link}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-3"
        >
          View Project
          <ExternalLink className="size-3" />
        </a>
      )}
    </Card>
  );
}

interface PortfolioGridProps {
  items: PortfolioItem[];
}

export function PortfolioGrid({ items }: PortfolioGridProps) {
  if (items.length === 0) {
    return (
      <div className="text-center py-8 text-default-500">
        No portfolio items yet.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {items.map((item, index) => (
        <PortfolioCard key={index} item={item} />
      ))}
    </div>
  );
}