export interface EfpStats {
  followers_count: string;
  following_count: string;
}

export interface EfpFollower {
  efp_list_nft_token_id: string;
  address: string;
  tags: string[];
  is_following: boolean;
  is_blocked: boolean;
  is_muted: boolean;
  updated_at: string;
}

export type EfpFollowing = EfpFollower;

export interface EfpFollowState {
  is_following: boolean;
  is_blocked: boolean;
  is_muted: boolean;
  is_followed_back: boolean;
}

export interface EfpListInfo {
  token_id: string;
  chain_id: string;
  contract_address: string;
  slot: string;
  is_primary: boolean;
}

export interface EfpPagination {
  limit: number;
  offset: number;
  total: number;
}

export interface EfpApiResponse<T> {
  data: T;
  meta?: {
    pagination?: EfpPagination;
  };
}

export interface EfpUserEns {
  ens_name: string | null;
  ens_avatar: string | null;
}

export interface EfpSimpleProfile {
  address: string;
  ens_name: string | null;
  ens_avatar: string | null;
  follower_count: string;
  following_count: string;
}

export interface EfpRecommended {
  address: string;
  follower_count: string;
  following_count: string;
  mutuals_following: boolean;
}

export interface EfpListRecord {
  version: number;
  recordType: number;
  data: Uint8Array;
}

export interface EfpListOp {
  version: number;
  opcode: number;
  data: Uint8Array;
}
