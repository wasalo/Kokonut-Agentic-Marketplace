/**
 * Kokonut Intelligence Module — Directus REST API adapter
 *
 * Lightweight fetch-based client for the Kokonut Intelligence platform.
 * No @directus/sdk dependency; uses standard HTTP.
 *
 * Config:
 *   NEXT_PUBLIC_INTELLIGENCE_API_URL  — Directus base URL (e.g. http://localhost:8055)
 *   INTELLIGENCE_API_TOKEN           — Scoped Directus static token (read-only)
 */

export interface IntelligenceConfig {
  baseUrl: string;
  token?: string;
}

export interface ListOptions {
  filter?: Record<string, unknown>;
  sort?: string | string[];
  fields?: string | string[];
  limit?: number;
  offset?: number;
  page?: number;
  meta?: string | string[];
}

export interface IntelligenceFarm {
  id: string;
  farm_id: string;
  registry_slug: string;
  project_summary: string;
  land_size_m2: string;
  status: string;
  source_system: string;
  project_location: unknown;
  revenue_streams: string[];
  governance_mechanism: string;
  public_goods_allocation_pct: number;
  [key: string]: unknown;
}

export interface IntelligenceMRVEvent {
  id: string;
  measurement_type: string;
  event_timestamp: string;
  status: string;
  payload_cid: string;
  is_attested: boolean;
  attestation_uid: string;
  ground_data: unknown;
  remote_data: unknown;
  community_data: unknown;
  [key: string]: unknown;
}

export interface IntelligenceAttestation {
  id: string;
  attestation_uid: string;
  schema_id: string;
  claim_data: unknown;
  evidence_hash: string | null;
  status: string;
  chain: string;
  tx_hash: string;
  attested_at: string;
  [key: string]: unknown;
}

export interface IntelligenceAgent {
  id: string;
  agent_name: string;
  ens_subdomain: string;
  operator_wallet: string;
  registry_chain: string;
  erc8004_agent_id: string;
  capability_manifest_cid: string;
  payment_token: string;
  base_rate_usdc: string;
  marketplace_source: string;
  agent_state: string;
  metadata: Record<string, unknown>;
  [key: string]: unknown;
}

export interface IntelligenceCapabilityManifest {
  id: string;
  agent_id: string;
  version: string;
  manifest: Record<string, unknown>;
  manifest_cid: string;
  manifest_hash: string;
  is_active: boolean;
  [key: string]: unknown;
}

export interface IntelligenceAgentTask {
  id: string;
  agent_id: string;
  task_type: string;
  subject_type: string;
  subject_id: string;
  inputs: Record<string, unknown>;
  output: Record<string, unknown> | null;
  output_cid: string | null;
  execution_status: string;
  review_status: string;
  attestation_request_id: string | null;
  completed_at: string | null;
  [key: string]: unknown;
}

export interface IntelligenceAISummary {
  id: string;
  subject_type: string;
  subject_id: string;
  summary_type: string;
  content: string;
  source_tables: string[];
  model_version: string;
  status: string;
  [key: string]: unknown;
}

export interface IntelligenceReport {
  id: string;
  report_type: string;
  status: string;
  [key: string]: unknown;
}

export class IntelligenceModule {
  private baseUrl: string;
  private token?: string;

  constructor(config: IntelligenceConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    this.token = config.token;
  }

  private async request<T>(
    path: string,
    options?: { method?: string; body?: unknown; params?: Record<string, string> }
  ): Promise<T> {
    const url = new URL(`${this.baseUrl}${path}`);
    if (options?.params) {
      for (const [k, v] of Object.entries(options.params)) {
        url.searchParams.set(k, v);
      }
    }
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (this.token) headers['Authorization'] = `Bearer ${this.token}`;

    const res = await fetch(url.toString(), {
      method: options?.method ?? 'GET',
      headers,
      body: options?.body ? JSON.stringify(options.body) : undefined,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Intelligence API ${res.status}: ${text.slice(0, 200)}`);
    }
    return res.json() as Promise<T>;
  }

  private buildParams(options?: ListOptions): Record<string, string> {
    const params: Record<string, string> = {};
    if (options?.filter) params['filter'] = JSON.stringify(options.filter);
    if (options?.sort) params['sort'] = Array.isArray(options.sort) ? options.sort.join(',') : options.sort;
    if (options?.fields) params['fields'] = Array.isArray(options.fields) ? options.fields.join(',') : options.fields;
    if (options?.limit) params['limit'] = String(options.limit);
    if (options?.offset) params['offset'] = String(options.offset);
    if (options?.page) params['page'] = String(options.page);
    if (options?.meta) params['meta'] = Array.isArray(options.meta) ? options.meta.join(',') : options.meta;
    return params;
  }

  // ============ Farms ============
  async listFarms(options?: ListOptions): Promise<IntelligenceFarm[]> {
    const data = await this.request<{ data: IntelligenceFarm[] }>('/items/farm_registry_record', { params: this.buildParams(options) });
    return data.data;
  }
  async getFarm(id: string, fields?: string[]): Promise<IntelligenceFarm> {
    const params = fields ? { fields: fields.join(',') } : undefined;
    const data = await this.request<{ data: IntelligenceFarm }>(`/items/farm_registry_record/${id}`, { params });
    return data.data;
  }

  // ============ MRV Events ============
  async listMRVEvents(options?: ListOptions): Promise<IntelligenceMRVEvent[]> {
    const data = await this.request<{ data: IntelligenceMRVEvent[] }>('/items/mrv_event', { params: this.buildParams(options) });
    return data.data;
  }
  async getMRVEvent(id: string): Promise<IntelligenceMRVEvent> {
    const data = await this.request<{ data: IntelligenceMRVEvent }>(`/items/mrv_event/${id}`);
    return data.data;
  }
  async listMRVByFarm(farmId: string, options?: ListOptions): Promise<IntelligenceMRVEvent[]> {
    return this.listMRVEvents({ ...options, filter: { farm_registry_record_id: farmId } });
  }

  // ============ Attestations ============
  async listAttestations(options?: ListOptions): Promise<IntelligenceAttestation[]> {
    const data = await this.request<{ data: IntelligenceAttestation[] }>('/items/attestation_record', { params: this.buildParams(options) });
    return data.data;
  }
  async getAttestation(id: string): Promise<IntelligenceAttestation> {
    const data = await this.request<{ data: IntelligenceAttestation }>(`/items/attestation_record/${id}`);
    return data.data;
  }
  async listAttestationsByUID(uid: string): Promise<IntelligenceAttestation[]> {
    return this.listAttestations({ filter: { attestation_uid: uid } });
  }

  // ============ Agents ============
  async listAgents(options?: ListOptions): Promise<IntelligenceAgent[]> {
    const data = await this.request<{ data: IntelligenceAgent[] }>('/items/agent_identity', { params: this.buildParams(options) });
    return data.data;
  }
  async getAgent(id: string): Promise<IntelligenceAgent> {
    const data = await this.request<{ data: IntelligenceAgent }>(`/items/agent_identity/${id}`);
    return data.data;
  }
  async getAgentByName(name: string): Promise<IntelligenceAgent | null> {
    const agents = await this.listAgents({ filter: { agent_name: { _eq: name } }, limit: 1 });
    return agents.length > 0 ? agents[0] : null;
  }

  // ============ Capability Manifests ============
  async listManifests(options?: ListOptions): Promise<IntelligenceCapabilityManifest[]> {
    const data = await this.request<{ data: IntelligenceCapabilityManifest[] }>('/items/agent_capability_manifest', { params: this.buildParams(options) });
    return data.data;
  }
  async getManifest(agentId: string): Promise<IntelligenceCapabilityManifest | null> {
    const manifests = await this.listManifests({ filter: { agent_id: agentId, is_active: true }, limit: 1 });
    return manifests.length > 0 ? manifests[0] : null;
  }

  // ============ Agent Tasks ============
  async listTasks(options?: ListOptions): Promise<IntelligenceAgentTask[]> {
    const data = await this.request<{ data: IntelligenceAgentTask[] }>('/items/agent_task', { params: this.buildParams(options) });
    return data.data;
  }
  async listTasksByAgent(agentId: string, options?: ListOptions): Promise<IntelligenceAgentTask[]> {
    return this.listTasks({ ...options, filter: { agent_id: agentId } });
  }

  // ============ AI Summaries ============
  async listAISummaries(options?: ListOptions): Promise<IntelligenceAISummary[]> {
    const data = await this.request<{ data: IntelligenceAISummary[] }>('/items/ai_summary', { params: this.buildParams(options) });
    return data.data;
  }
  async getAISummary(id: string): Promise<IntelligenceAISummary> {
    const data = await this.request<{ data: IntelligenceAISummary }>(`/items/ai_summary/${id}`);
    return data.data;
  }

  // ============ Reports ============
  async listReports(options?: ListOptions): Promise<IntelligenceReport[]> {
    const data = await this.request<{ data: IntelligenceReport[] }>('/items/report_snapshot', { params: this.buildParams(options) });
    return data.data;
  }
  async getReport(id: string): Promise<IntelligenceReport> {
    const data = await this.request<{ data: IntelligenceReport }>(`/items/report_snapshot/${id}`);
    return data.data;
  }

  // ============ Generic ============
  async listItems(collection: string, options?: ListOptions): Promise<unknown[]> {
    const data = await this.request<{ data: unknown[] }>(`/items/${collection}`, { params: this.buildParams(options) });
    return data.data;
  }
  async getItem(collection: string, id: string, fields?: string[]): Promise<unknown> {
    const params = fields ? { fields: fields.join(',') } : undefined;
    const data = await this.request<{ data: unknown }>(`/items/${collection}/${id}`, { params });
    return data.data;
  }

  // ============ Health ============
  async health(): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/server/health`);
      return res.ok;
    } catch {
      return false;
    }
  }
}
