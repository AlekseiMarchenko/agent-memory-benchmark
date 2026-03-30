# 🧠 Agent Memory Benchmark (AMB)

The definitive benchmark for agent memory systems. 56 real-world tests across 8 categories.

**Why another benchmark?** LoCoMo tests synthetic conversational recall. AMB tests what agents actually need: semantic search, temporal reasoning, conflict resolution, selective forgetting, multi-agent collaboration, and cost efficiency.

## Quick Start

```bash
# Run against Central Intelligence
npx agent-memory-benchmark --provider central-intelligence --api-key $CI_API_KEY

# Run against Mem0
npx agent-memory-benchmark --provider mem0 --api-key $MEM0_API_KEY

# Run the in-memory baseline
npx agent-memory-benchmark --provider in-memory
```

## Scores

| Provider | Overall | Factual | Semantic | Temporal | Conflict | Forgetting | Cross-Session | Multi-Agent | Cost |
|---|---|---|---|---|---|---|---|---|---|
| Central Intelligence | **92** | 100 | 100 | 86 | 86 | 83 | 86 | 83 | 100 |
| In-Memory Baseline | 55 | 100 | 0 | 43 | 86 | 83 | 57 | 50 | 56 |

*Run `npx agent-memory-benchmark --provider <name>` to add your provider's scores.*

## 8 Test Categories

| # | Category | Tests | Weight | What It Measures |
|---|---|---|---|---|
| 1 | **Factual Recall** | 8 | 15% | Store a fact, retrieve it with a direct query |
| 2 | **Semantic Search** | 8 | 20% | Retrieve using paraphrased/conceptual queries |
| 3 | **Temporal Reasoning** | 7 | 15% | Handle "before/after" and "latest" queries |
| 4 | **Conflict Resolution** | 7 | 10% | When facts contradict, latest should win |
| 5 | **Selective Forgetting** | 6 | 10% | Deleted memories must not resurface |
| 6 | **Cross-Session** | 7 | 15% | Context carries over across sessions |
| 7 | **Multi-Agent** | 6 | 5% | Agent A stores, Agent B retrieves |
| 8 | **Cost Efficiency** | 7 | 10% | Latency, tokens, API calls per operation |

## Output

AMB generates three files in `./amb-results/`:

- **results.json** — Machine-readable full results (for CI/CD)
- **report.md** — Human-readable report with tables and failure details
- **badge.svg** — Embeddable score badge

## CLI Options

```
--provider <name>    Provider: central-intelligence | mem0 | in-memory (required)
--api-key <key>      API key (or set AMB_API_KEY env var)
--api-url <url>      API base URL override
--categories <list>  Comma-separated category IDs (default: all)
--output <dir>       Output directory (default: ./amb-results)
--verbose            Show detailed per-query output
```

## Adding Your Provider

Implement the `MemoryAdapter` interface:

```typescript
import { MemoryAdapter, MemoryEntry, StoreOptions, SearchOptions } from "agent-memory-benchmark";

class MyAdapter implements MemoryAdapter {
  name = "My Memory Provider";
  capabilities = { multiAgent: true, scoping: true, temporalDecay: false };

  async initialize(): Promise<void> { /* connect */ }
  async store(content: string, options?: StoreOptions): Promise<MemoryEntry> { /* store */ }
  async search(query: string, options?: SearchOptions): Promise<MemoryEntry[]> { /* search */ }
  async delete(id: string): Promise<boolean> { /* delete */ }
  async cleanup(): Promise<void> { /* cleanup test data */ }
}
```

Then run programmatically:

```typescript
import { runBenchmark, writeResults } from "agent-memory-benchmark";

const result = await runBenchmark(new MyAdapter(), { verbose: true });
writeResults(result, "./amb-results");
```

## Scoring

- **Per-query**: Binary pass/fail based on expected keywords in results
- **Per-category**: (passed / total) × 100
- **Overall**: Weighted average (weights reflect real-world importance)
- **Exit code**: 0 if score ≥ 70, 1 otherwise (CI/CD friendly)

## Philosophy

1. **Real-world scenarios** — Every test case maps to an actual agent workflow
2. **Provider-agnostic** — Same tests, fair comparison
3. **Accuracy AND efficiency** — Best memory is useless if it's too slow or expensive
4. **Open source** — MIT licensed. Add your provider, submit PRs

## Contributing

1. Fork the repo
2. Add your adapter in `contrib/`
3. Run the benchmark and include results
4. Submit a PR

See [CONTRIBUTING.md](CONTRIBUTING.md) for details.

## License

MIT — [Aleksei Marchenko](https://github.com/AlekseiMarchenko)
