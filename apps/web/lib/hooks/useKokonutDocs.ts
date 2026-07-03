'use client';

import { useQuery } from '@tanstack/react-query';

export interface KokonutDocEntry {
  title: string;
  url: string;
  description: string;
}

const DOCS_URL = 'https://kokonut.network/llms.txt';
const STALE_TIME = 60 * 60 * 1000;

function parseLlmsTxt(text: string): KokonutDocEntry[] {
  const entries: KokonutDocEntry[] = [];
  const lines = text.split('\n');

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;
    if (line.startsWith('#') || line.startsWith('>')) continue;

    const markdownMatch = line.match(/^\s*[-*]\s*\[([^\]]+)\]\(([^)]+)\)(?::\s*(.*))?$/);
    if (markdownMatch) {
      entries.push({
        title: markdownMatch[1].trim(),
        url: markdownMatch[2].trim(),
        description: (markdownMatch[3] ?? '').trim(),
      });
      continue;
    }

    const colonIdx = line.indexOf(':');
    if (colonIdx > 0) {
      const title = line.slice(0, colonIdx).trim();
      const rest = line.slice(colonIdx + 1).trim();
      const urlMatch = rest.match(/^(https?:\/\/\S+)/);
      if (urlMatch) {
        entries.push({
          title,
          url: urlMatch[1],
          description: rest.slice(urlMatch[1].length).replace(/^[:\s]+/, '').trim(),
        });
      }
    }
  }

  return entries;
}

interface UseKokonutDocsReturn {
  docs: KokonutDocEntry[];
  isLoading: boolean;
  error: Error | null;
}

export function useKokonutDocs(): UseKokonutDocsReturn {
  const { data, isLoading, error } = useQuery<KokonutDocEntry[]>({
    queryKey: ['kokonut-docs'],
    queryFn: async () => {
      const res = await fetch(DOCS_URL);
      if (!res.ok) {
        throw new Error(`Failed to fetch docs: ${res.status}`);
      }
      const text = await res.text();
      return parseLlmsTxt(text);
    },
    staleTime: STALE_TIME,
    gcTime: STALE_TIME,
    retry: 2,
  });

  return {
    docs: data ?? [],
    isLoading,
    error: error as Error | null,
  };
}
