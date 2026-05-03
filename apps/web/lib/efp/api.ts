'use client';

import { withRetry } from '@/lib/utils/retry';
import { debugLog } from '@/lib/contracts/config';
import type {
  EfpStats,
  EfpFollower,
  EfpFollowing,
  EfpFollowState,
  EfpListInfo,
  EfpUserEns,
  EfpSimpleProfile,
  EfpRecommended,
  EfpApiResponse,
} from './types';

const EFP_API_BASE = 'https://api.ethfollow.xyz/api/v1';
const MAX_RETRIES = 3;

interface PaginationOpts {
  limit?: number;
  offset?: number;
}

interface FetchOpts extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
}

async function fetchEfp<T>(path: string, opts: FetchOpts = {}): Promise<T> {
  const { params, ...init } = opts;

  let url = `${EFP_API_BASE}${path}`;
  if (params) {
    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) {
        searchParams.set(key, String(value));
      }
    }
    const qs = searchParams.toString();
    if (qs) url += `?${qs}`;
  }

  return withRetry(async () => {
    debugLog('efp', `Fetching ${url}`);

    const response = await fetch(url, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...init.headers,
      },
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(`EFP API error ${response.status}: ${text}`);
    }

    return response.json() as Promise<T>;
  }, {
    maxRetries: MAX_RETRIES,
    initialDelay: 1000,
    maxDelay: 10000,
    retryableErrors: [
      /ECONNREFUSED/i,
      /ETIMEDOUT/i,
      /timeout/i,
      /network/i,
      /failed to fetch/i,
      /429/i,
      /5\d{2}/,
    ],
  });
}

export async function getUserStats(address: string): Promise<EfpStats> {
  const data = await fetchEfp<EfpApiResponse<EfpStats>>(`/users/${address}/stats`);
  return data?.data ?? { followers_count: '0', following_count: '0' };
}

export async function getFollowers(
  address: string,
  opts: PaginationOpts & { tags?: string; sort?: string } = {}
): Promise<EfpFollower[]> {
  const data = await fetchEfp<EfpApiResponse<{ followers: EfpFollower[] }>>(
    `/users/${address}/followers`,
    {
      params: {
        limit: opts.limit ?? 10,
        offset: opts.offset ?? 0,
        tags: opts.tags,
        sort: opts.sort,
      },
    }
  );
  return data?.data?.followers ?? [];
}

export async function getFollowing(
  address: string,
  opts: PaginationOpts & { tags?: string; sort?: string } = {}
): Promise<EfpFollowing[]> {
  const data = await fetchEfp<EfpApiResponse<{ following: EfpFollowing[] }>>(
    `/users/${address}/following`,
    {
      params: {
        limit: opts.limit ?? 10,
        offset: opts.offset ?? 0,
        tags: opts.tags,
        sort: opts.sort,
      },
    }
  );
  return data?.data?.following ?? [];
}

export async function getFollowState(from: string, to: string): Promise<EfpFollowState> {
  const data = await fetchEfp<EfpApiResponse<EfpFollowState>>(
    `/users/${from}/follower-state/${to}`
  );
  return data?.data ?? { is_following: false, is_blocked: false, is_muted: false, is_followed_back: false };
}

export async function getBatchFollowState(
  from: string,
  targets: string[]
): Promise<Record<string, EfpFollowState>> {
  const data = await fetchEfp<EfpApiResponse<Record<string, EfpFollowState>>>(
    `/users/${from}/batch-follow-state`,
    {
      method: 'POST',
      body: JSON.stringify({ addresses: targets }),
    }
  );
  return data?.data ?? {};
}

export async function getCommonFollowers(
  addressA: string,
  addressB: string,
  opts: PaginationOpts = {}
): Promise<EfpFollower[]> {
  const data = await fetchEfp<EfpApiResponse<{ followers: EfpFollower[] }>>(
    `/users/${addressA}/common-followers/${addressB}`,
    {
      params: {
        limit: opts.limit ?? 10,
        offset: opts.offset ?? 0,
      },
    }
  );
  return data?.data?.followers ?? [];
}

export async function getRecommended(
  address: string,
  opts: PaginationOpts = {}
): Promise<EfpRecommended[]> {
  const data = await fetchEfp<EfpApiResponse<EfpRecommended[]>>(
    `/users/${address}/recommended`,
    {
      params: {
        limit: opts.limit ?? 10,
        offset: opts.offset ?? 0,
      },
    }
  );
  return data?.data ?? [];
}

export async function getPrimaryList(address: string): Promise<string | null> {
  try {
    const data = await fetchEfp<EfpApiResponse<string | null>>(
      `/users/${address}/primary-list`
    );
    return data?.data ?? null;
  } catch {
    return null;
  }
}

export async function getUserLists(address: string): Promise<EfpListInfo[]> {
  const data = await fetchEfp<EfpApiResponse<EfpListInfo[]>>(`/users/${address}/lists`);
  return data?.data ?? [];
}

export async function getUserEns(address: string): Promise<EfpUserEns> {
  const data = await fetchEfp<EfpApiResponse<EfpUserEns>>(`/users/${address}/ens`);
  return data?.data ?? { ens_name: null, ens_avatar: null };
}

export async function getSimpleProfile(address: string): Promise<EfpSimpleProfile> {
  const data = await fetchEfp<EfpApiResponse<EfpSimpleProfile>>(
    `/users/${address}/simple-profile`
  );
  return data?.data ?? { address: '', ens_name: null, ens_avatar: null, follower_count: '0', following_count: '0' };
}

export async function getLatestFollowers(
  address: string,
  limit = 5
): Promise<EfpFollower[]> {
  const data = await fetchEfp<EfpApiResponse<{ followers: EfpFollower[] }>>(
    `/users/${address}/latest-followers`,
    {
      params: { limit },
    }
  );
  return data?.data?.followers ?? [];
}

export async function searchFollowers(
  address: string,
  query: string,
  opts: PaginationOpts = {}
): Promise<EfpFollower[]> {
  const data = await fetchEfp<EfpApiResponse<{ followers: EfpFollower[] }>>(
    `/users/${address}/search-followers`,
    {
      params: {
        q: query,
        limit: opts.limit ?? 10,
        offset: opts.offset ?? 0,
      },
    }
  );
  return data?.data?.followers ?? [];
}

export async function searchFollowing(
  address: string,
  query: string,
  opts: PaginationOpts = {}
): Promise<EfpFollowing[]> {
  const data = await fetchEfp<EfpApiResponse<{ following: EfpFollowing[] }>>(
    `/users/${address}/search-following`,
    {
      params: {
        q: query,
        limit: opts.limit ?? 10,
        offset: opts.offset ?? 0,
      },
    }
  );
  return data?.data?.following ?? [];
}
