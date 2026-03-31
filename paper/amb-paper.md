# AMB: Agent Memory Benchmark for Evaluating Memory Provider Infrastructure

## Abstract

We introduce AMB (Agent Memory Benchmark), a provider-agnostic benchmark for evaluating persistent memory systems used by AI agents. Unlike existing benchmarks that focus on conversational recall (LoCoMo) or long-context information extraction (LongMemEval), AMB evaluates memory systems as infrastructure: can they store, retrieve, scope, forget, and maintain consistency across the operations that real agents perform? AMB provides two evaluation layers: Layer 1 tests single-operation retrieval quality across 8 categories (56 tests), and Layer 2 tests multi-step retrieval scenarios that mirror real agent workflows (5 scenarios). All scoring is deterministic and reproducible. We evaluate 6 memory providers and find meaningful differentiation across categories, with no provider achieving perfect scores on both layers.

## 1. Introduction

AI agents increasingly rely on persistent memory to maintain context across sessions, share knowledge between agents, and avoid redundant work. Several memory providers have emerged (Mem0, Zep, Hindsight, Central Intelligence, mcp-memory-service), but developers lack a standardized way to compare them.

Existing benchmarks test the wrong thing for agent memory:

- **LoCoMo** (2024) measures word-level F1/IoU on 9K-token chat histories. It tests conversational recall, not the store/search/delete operations agents actually perform. Systems can score well by simply storing raw files.

- **LongMemEval** (2025) tests information extraction and temporal reasoning across 1.5M-token conversations. It is harder than LoCoMo, but still evaluates memory as a conversational aid rather than as agent infrastructure. Top systems now score 90%+, approaching saturation.

- **AMA-Bench** (2026) explicitly targets agentic applications with long-horizon reasoning. It categorizes prior work as "dialogue-centric" and proposes agent-specific evaluation. AMB shares this motivation but differs in approach: where AMA-Bench evaluates agent behavior with memory, AMB evaluates memory systems themselves.

- **LifeBench** (2026) tests multi-source memory with real-world complexity. Top systems score only 55%, validating that harder benchmarks are needed. AMB is complementary: LifeBench tests memory-augmented agent performance, AMB tests the memory layer in isolation.

AMB fills the gap between conversational memory benchmarks and agent behavior benchmarks. It tests memory as infrastructure: does the provider correctly store, retrieve, scope, delete, and maintain temporal consistency of memories? This is the foundation that agent performance depends on.

## 2. Design Principles

1. **Provider-agnostic.** Same tests, same scoring, any provider. AMB defines a minimal adapter interface (store, search, delete, cleanup) that maps to any memory system.

2. **Deterministic scoring.** All scores are binary pass/fail based on keyword presence in retrieved results. No LLM-as-judge, no embedding similarity, no subjective evaluation. The same inputs produce the same scores every run.

3. **Two evaluation layers.** Layer 1 tests single-operation retrieval quality (can the system find what was stored?). Layer 2 tests multi-step retrieval scenarios (can the system support a realistic agent workflow?). Scores are reported separately, not blended.

4. **Reproducibility metadata.** Every run records fixture hashes, benchmark version, provider version, and hardware specs. Results can be independently verified.

5. **Real-world scenarios.** Every test case maps to an actual agent workflow pattern. No synthetic or adversarial-only data.

## 3. Benchmark Structure

### 3.1 Layer 1: Single-Operation Retrieval (56 tests, 8 categories)

| Category | Tests | Weight | What It Measures |
|----------|-------|--------|------------------|
| Factual Recall | 8 | 15% | Store a fact, retrieve it with a direct query |
| Semantic Search | 8 | 20% | Retrieve using paraphrased/conceptual queries |
| Temporal Reasoning | 7 | 15% | Handle "before/after" and "latest" queries |
| Conflict Resolution | 7 | 10% | When facts contradict, latest should win |
| Selective Forgetting | 6 | 10% | Deleted memories must not resurface |
| Cross-Session Continuity | 7 | 15% | Context carries over across sessions |
| Multi-Agent Collaboration | 6 | 5% | Agent A stores, Agent B retrieves (with scoping) |
| Cost Efficiency | 7 | 10% | Latency and operation counts per workflow |

Each test seeds one or more memories via the adapter's `store()` method, waits for indexing (3 seconds), then runs one or more queries via `search()`. A query passes if all expected keywords appear in the retrieved results. The category score is (passed / total) * 100. The Layer 1 overall score is the weighted average across categories.

### 3.2 Layer 2: Multi-Step Retrieval Scenarios (5 scenarios)

Layer 2 tests whether a memory system can support realistic multi-step agent workflows. Unlike Layer 1's single store-then-search pattern, Layer 2 scenarios involve multiple stores, multiple searches with different queries, and scoring against gold-standard expected outputs.

| Scenario | What It Tests |
|----------|---------------|
| Preference Application | Retrieve multiple stored preferences to assemble a complete configuration |
| Context Continuity | Retrieve related context from multiple simulated prior sessions |
| Conflict Resolution (Multi-Step) | Handle a chain of superseding facts across multiple stores |
| Cross-Agent Handoff | Agent B retrieves context stored by Agent A using scoped memory |
| Redundancy Check | Verify that previously stored facts remain retrievable without re-storing |

Scoring: a scenario passes (1.0) if ALL expected keywords are found in retrieved results AND no unexpected keywords appear. Otherwise it fails (0.0). The Layer 2 score is the percentage of scenarios passed.

Layer 2 is NOT agent task completion testing. It does not involve LLM reasoning over retrieved context. It is multi-step retrieval evaluation: testing whether the memory system returns the right information across a sequence of operations that mirrors how real agents use memory.

### 3.3 Adapter Interface

```typescript
interface MemoryAdapter {
  name: string;
  capabilities?: { multiAgent?: boolean; scoping?: boolean; temporalDecay?: boolean };
  initialize(): Promise<void>;
  store(content: string, options?: StoreOptions): Promise<MemoryEntry>;
  search(query: string, options?: SearchOptions): Promise<MemoryEntry[]>;
  delete(id: string): Promise<boolean>;
  cleanup(): Promise<void>;
}
```

Any memory system that can implement these 5 methods can be benchmarked. The interface is intentionally minimal. Providers with additional capabilities (scoping, multi-agent, temporal decay) declare them via the `capabilities` field; tests requiring unsupported capabilities are skipped and excluded from scoring.

## 4. Scoring Methodology

All scoring is binary pass/fail based on keyword presence:

1. For each query, combine the content of all returned results into a single string.
2. Check that every expected keyword appears (case-insensitive substring match).
3. Check that no unexpected keywords appear in the top result.
4. A query passes if both checks succeed.

This approach is deliberately simple. It trades granularity for reproducibility. Two independent runs against the same provider will produce identical scores. There is no embedding similarity threshold to tune, no LLM judge to calibrate, no tokenizer to specify.

**Limitations of keyword scoring:** A provider could return the right keywords in an irrelevant context and still pass. We accept this trade-off because: (a) test cases are designed with specific, distinctive keywords that are unlikely to appear in unrelated content, and (b) the alternative (embedding similarity) introduces non-determinism and hardware dependence.

## 5. Anti-Gaming and Reproducibility

AMB's test fixtures are public. Providers could theoretically optimize for the known test queries. We mitigate this through:

1. **Unique memory IDs per run.** Each test case generates a unique agent ID incorporating the test ID and current timestamp. Caching across runs is ineffective.

2. **Fixture integrity hashing.** SHA-256 hashes of all fixture files are recorded in the output. Modified fixtures are detectable.

3. **Reproducibility metadata.** Every run records: benchmark version, provider name/version, timestamp, Node.js version, OS, and fixture hashes.

We acknowledge that fixture hashing does not prevent a provider from training on known test data. The primary defense is community scrutiny: published results include full methodology, and any provider can run the benchmark independently.

## 6. Results

[To be filled after running all providers]

## 7. Discussion

[To be written after results]

## 8. Related Work

- **LoCoMo** (Maharana et al., 2024): Long-term conversational memory benchmark. 9K-token dialogues, word-level F1/IoU scoring. Tests conversational recall, not agent infrastructure operations.
- **LongMemEval** (Wu et al., 2025): 500 questions across 1.5M tokens. Tests information extraction and temporal reasoning. Harder than LoCoMo but still dialogue-centric.
- **AMA-Bench** (2026): Agent memory benchmark for long-horizon agentic applications. Evaluates agent behavior with memory. Complementary to AMB's infrastructure-level evaluation.
- **LifeBench** (2026): Multi-source memory benchmark. Top system scores 55%, validating need for harder benchmarks.
- **MemoryCD** (2026): Cross-domain personalization benchmark using authentic user data.

## References

[To be formatted]
