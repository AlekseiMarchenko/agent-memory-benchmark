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

We evaluate four memory providers: Central Intelligence, Mem0, Zep, and an in-memory baseline (exact keyword matching with no semantic layer). All runs used AMB v2.0.2. The default store-to-search delay is 3 seconds. For async providers (Mem0, Zep), we also report results at 10 seconds to account for their LLM-based extraction pipelines.

### 6.1 Layer 1: Single-Operation Retrieval

**Default delay (3 seconds)**

| Provider | Overall | Factual | Semantic | Temporal | Conflict | Forgetting | Cross-Session | Multi-Agent | Cost |
|---|---|---|---|---|---|---|---|---|---|
| Central Intelligence | **90** | 100 | 100 | 86 | 86 | 83 | 86 | 67 | 94 |
| In-Memory Baseline | 55 | 100 | 0 | 43 | 86 | 83 | 57 | 50 | 56 |
| Zep | 11 | 0 | 0 | 14 | 0 | 67 | 0 | -- | 19 |
| Mem0 | 7 | 0 | 0 | 14 | 0 | 50 | 0 | 17 | 25 |

**Extended delay (10 seconds) for async providers**

| Provider | Overall | Factual | Semantic | Temporal | Conflict | Forgetting | Cross-Session | Multi-Agent | Cost |
|---|---|---|---|---|---|---|---|---|---|
| Mem0 | **54** | 100 | 100 | 29 | 29 | 0 | 43 | 17 | 44 |
| Zep | 39 | 75 | 63 | 29 | 0 | 67 | 0 | -- | 19 |

### 6.2 Layer 2: Multi-Step Retrieval

| Provider | Overall | Preference | Continuity | Conflict | Handoff | Redundancy |
|---|---|---|---|---|---|---|
| Central Intelligence | **60** | FAIL | FAIL | PASS | PASS | PASS |
| In-Memory Baseline | 20 | FAIL | FAIL | FAIL | FAIL | PASS |
| Zep | 0 | FAIL | FAIL | FAIL | FAIL | FAIL |
| Mem0 | 0 | FAIL | FAIL | FAIL | FAIL | FAIL |

Layer 2 results were consistent at both 3s and 10s delays. No async provider passed any Layer 2 scenario.

### 6.3 Key Findings

**1. Semantic search is table stakes, but most providers lack it at low latency.** At 3s, both Mem0 and Zep score 0% on semantic search. At 10s, Mem0 achieves 100% and Zep 63%. Central Intelligence scores 100% at 3s. The in-memory baseline (exact keyword match) scores 0% by design. For agents that need immediate recall after storing a fact, only providers with synchronous indexing deliver.

**2. Temporal reasoning separates real memory systems from vector databases.** Handling "what is the current X" after multiple updates requires the provider to understand recency, not just similarity. Central Intelligence scores 86%. All other providers score 29% or below, even at 10s. This is the category where most providers lose the most points relative to their factual recall scores.

**3. Selective forgetting is broken in Mem0.** Mem0 scores 0% on forgetting at both 3s and 10s. The root cause: Mem0's store endpoint returns `"status": "PENDING"` without a real memory ID. Delete operations use synthetic IDs that don't map to actual stored memories. Memories persist after supposed deletion. Zep handles deletion correctly (67% at both delays).

**4. Multi-step retrieval (Layer 2) remains unsolved.** Even Central Intelligence, scoring 90% on Layer 1, only achieves 60% on Layer 2. The failed scenarios (Preference Application, Context Continuity) require assembling information from multiple stored memories into a coherent answer. This suggests that retrieval quality alone is insufficient; relevance ranking across multiple related memories is the bottleneck.

**5. Async processing is an architectural choice, not a defect.** Mem0 and Zep both use LLM-based fact extraction that runs asynchronously after the store call returns. At 3s, most memories aren't indexed. At 10s, Mem0 jumps from 7 to 54 overall. This is by design: these systems trade immediate availability for richer semantic extraction. The right delay depends on the use case. AMB's `--store-delay` flag allows providers to be tested at their natural processing cadence.

## 7. Discussion

### 7.1 What AMB measures and what it does not

AMB evaluates memory systems as infrastructure. It answers: given a store operation followed by a search operation, does the system return the right information? It does not evaluate:

- **Agent reasoning quality.** Whether an agent can use retrieved memories to make good decisions is outside scope. That requires an LLM in the loop, which introduces non-determinism.
- **Semantic quality of stored representations.** AMB checks keyword presence, not whether the memory system extracted the right "meaning" from input. A system could store verbatim text and pass factual recall; that is a valid strategy.
- **Scale behavior.** AMB tests with small memory corpora (1-20 memories per test). Providers may behave differently at 10K or 1M memories. Scaling tests are planned for future work.

### 7.2 Limitations of keyword scoring

Binary keyword scoring is AMB's most polarizing design choice. It means:

- A provider can pass by returning the right keywords in irrelevant context.
- A provider can fail by correctly understanding a query but returning a paraphrase that lacks the exact expected keyword.
- There is no partial credit. A provider that returns 4 of 5 expected keywords scores the same as one returning 0.

We chose this trade-off deliberately. Embedding-based similarity scores vary across embedding models, hardware, and library versions. LLM-as-judge scores vary across model versions and prompts. Keyword matching is the only scoring method that produces identical results on any machine. For a benchmark intended to produce comparable, publishable numbers, reproducibility outweighs granularity.

### 7.3 The async provider dilemma

The gap between 3s and 10s scores for Mem0 (7 to 54) and Zep (11 to 39) raises a question: what is the "right" delay for benchmarking? There is no universal answer. An agent that stores a preference and immediately asks for it needs sub-second indexing. An agent that stores meeting notes today and queries them tomorrow can tolerate minutes of processing time.

AMB defaults to 3 seconds because this is the minimum viable latency for interactive agent workflows. The `--store-delay` flag allows providers to demonstrate their performance at longer indexing windows. We report both results and let users decide which scenario matches their use case.

### 7.4 Future work

- **Scale testing.** Evaluate providers at 1K, 10K, and 100K memory corpora.
- **Concurrent access.** Test behavior when multiple agents write and read simultaneously.
- **Layer 3: Agent task completion.** Add LLM-in-the-loop evaluation where agents use retrieved memories to complete tasks. This requires accepting non-deterministic scoring.
- **Community fixtures.** Accept contributed test scenarios from the community to expand coverage beyond the current 56 + 5.

## 8. Related Work

- **LoCoMo** (Maharana et al., 2024): Long-term conversational memory benchmark. 9K-token dialogues, word-level F1/IoU scoring. Tests conversational recall, not agent infrastructure operations.
- **LongMemEval** (Wu et al., 2025): 500 questions across 1.5M tokens. Tests information extraction and temporal reasoning. Harder than LoCoMo but still dialogue-centric.
- **AMA-Bench** (2026): Agent memory benchmark for long-horizon agentic applications. Evaluates agent behavior with memory. Complementary to AMB's infrastructure-level evaluation.
- **LifeBench** (2026): Multi-source memory benchmark. Top system scores 55%, validating need for harder benchmarks.
- **MemoryCD** (2026): Cross-domain personalization benchmark using authentic user data from Reddit.

## 9. Conclusion

AMB provides a reproducible, provider-agnostic benchmark for agent memory systems. It separates memory infrastructure quality from agent reasoning quality, enabling direct comparison of the underlying systems agents depend on.

The results show meaningful differentiation. No provider achieves perfect scores on both layers. Temporal reasoning and multi-step retrieval remain challenging for all tested systems. Async providers perform substantially better when given adequate indexing time, suggesting that benchmark methodology (specifically, store-to-search delay) significantly impacts results.

AMB is open source (Apache 2.0 license) and available at `npx agent-memory-benchmark`. Providers can add adapters and submit results. The benchmark, all test fixtures, and all adapter code are public.

## References

1. Maharana, A., Lee, D., Tulyakov, S., Bansal, M., Barbieri, F., & Fang, Y. (2024). Evaluating Very Long-Term Conversational Memory of LLM Agents. *ACL 2024*.
2. Wu, D., et al. (2025). LongMemEval: Benchmarking Chat Assistants on Long-Term Interactive Memory. *ICLR 2025*.
3. AMA-Bench (2026). Agent Memory Architecture Benchmark. arXiv preprint.
4. LifeBench (2026). Multi-Source Memory Evaluation for Long-Lived Agents. arXiv preprint.
5. MemoryCD (2026). Cross-Domain Personalization Benchmark for Memory-Augmented LLMs. arXiv preprint.
