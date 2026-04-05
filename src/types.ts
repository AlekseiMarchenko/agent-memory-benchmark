export interface MemoryEntry {
  id: string;
  content: string;
  metadata?: Record<string, unknown>;
  tags?: string[];
  createdAt?: string;
  score?: number;
}

export interface StoreOptions {
  agentId?: string;
  userId?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
  namespace?: string;
  scope?: "agent" | "user" | "org";
}

export interface SearchOptions {
  agentId?: string;
  userId?: string;
  tags?: string[];
  limit?: number;
  namespace?: string;
  scope?: "agent" | "user" | "org";
}

export interface MemoryAdapter {
  name: string;
  capabilities?: {
    multiAgent?: boolean;
    scoping?: boolean;
    temporalDecay?: boolean;
  };
  initialize(): Promise<void>;
  store(content: string, options?: StoreOptions): Promise<MemoryEntry>;
  search(query: string, options?: SearchOptions): Promise<MemoryEntry[]>;
  delete(id: string): Promise<boolean>;
  cleanup(): Promise<void>;
}

export interface SeedMemory {
  content: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
  storeDelay?: number;
  agentId?: string;
  scope?: "agent" | "user" | "org";
}

export interface TestQuery {
  id: string;
  query: string;
  expectedKeywords?: string[];
  unexpectedKeywords?: string[];
  expectedContent?: string;
  expectEmpty?: boolean;
  expectedFact?: string;
  topK?: number;
  agentId?: string;
  scope?: "agent" | "user" | "org";
}

export type CategoryId =
  | "factual-recall"
  | "semantic-search"
  | "temporal-reasoning"
  | "conflict-resolution"
  | "selective-forgetting"
  | "cross-session"
  | "multi-agent"
  | "cost-efficiency";

export interface TestCase {
  id: string;
  category: CategoryId;
  name: string;
  description: string;
  seeds: SeedMemory[];
  queries: TestQuery[];
  setup?: "store-then-delete" | "store-with-delay" | "multi-agent-store";
  /** For store-then-delete: which seeded memories to delete. Default: "all" */
  deletePattern?: "all" | "first" | { keepLast: number } | "search-then-delete";
  weight?: number;
}

export interface QueryResult {
  testId: string;
  queryId: string;
  query: string;
  passed: boolean;
  score: number;
  latencyMs: number;
  tokensEstimated: number;
  topResults: MemoryEntry[];
  reason?: string;
}

export interface CategoryResult {
  category: CategoryId;
  name: string;
  score: number;
  passed: number;
  total: number;
  details: QueryResult[];
  avgLatencyMs: number;
  totalTokens: number;
  skipped?: boolean;
  skipReason?: string;
}

// Layer 2: Multi-step retrieval scenarios

export interface Layer2SeedMemory {
  content: string;
  agentId?: string;
  scope?: "agent" | "user" | "org";
  tags?: string[];
  storeDelay?: number;
}

export interface Layer2Query {
  id: string;
  query: string;
  agentId?: string;
  scope?: "agent" | "user" | "org";
  limit?: number;
}

export interface Layer2Scenario {
  id: string;
  name: string;
  description: string;
  seeds: Layer2SeedMemory[];
  queries: Layer2Query[];
  expected: {
    mustContain: string[];
    mustNotContain?: string[];
  };
}

export interface Layer2ScenarioResult {
  scenarioId: string;
  name: string;
  passed: boolean;
  score: number;
  latencyMs: number;
  reason: string;
  retrievedContent: string[];
}

export interface Layer2Result {
  score: number;
  passed: number;
  total: number;
  scenarios: Layer2ScenarioResult[];
  avgLatencyMs: number;
}

// Layer 3: Scale testing

export interface Layer3ScaleResult {
  scale: number;
  categories: CategoryResult[];
  overallScore: number;
  avgLatencyMs: number;
  distractorStoreTimeMs: number;
}

export interface Layer3Result {
  scales: Layer3ScaleResult[];
  degradation: {
    scale: number;
    scoreDropPercent: number;
  }[];
}

export interface BenchmarkResult {
  provider: string;
  timestamp: string;
  version: string;
  overallScore: number;
  categories: CategoryResult[];
  layer2?: Layer2Result;
  layer3?: Layer3Result;
  meta: {
    totalLatencyMs: number;
    totalTokens: number;
    totalApiCalls: number;
  };
}

export const CATEGORY_WEIGHTS: Record<CategoryId, number> = {
  "factual-recall": 0.15,
  "semantic-search": 0.20,
  "temporal-reasoning": 0.15,
  "conflict-resolution": 0.10,
  "selective-forgetting": 0.10,
  "cross-session": 0.15,
  "multi-agent": 0.05,
  "cost-efficiency": 0.10,
};

export const CATEGORY_NAMES: Record<CategoryId, string> = {
  "factual-recall": "Factual Recall",
  "semantic-search": "Semantic Search",
  "temporal-reasoning": "Temporal Reasoning",
  "conflict-resolution": "Conflict Resolution",
  "selective-forgetting": "Selective Forgetting",
  "cross-session": "Cross-Session Continuity",
  "multi-agent": "Multi-Agent Collaboration",
  "cost-efficiency": "Cost Efficiency",
};
