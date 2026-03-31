# Agent Memory Benchmark (AMB)

The definitive benchmark for agent memory systems. Two evaluation layers, 56+ tests, provider-agnostic.

**Why another benchmark?** LoCoMo tests synthetic conversational recall. LongMemEval tests long-context extraction. AMB tests what agents actually need: can the memory system store, retrieve, scope, forget, and maintain consistency across the operations that real agents perform?

## Quick Start

```bash
# Run against Central Intelligence
npx agent-memory-benchmark --provider central-intelligence --api-key $CI_API_KEY

# Run against Mem0
npx agent-memory-benchmark --provider mem0 --api-key $MEM0_API_KEY

# Run the in-memory baseline
npx agent-memory-benchmark --provider in-memory

# Run against any MCP memory server
npx agent-memory-benchmark --provider mcp --mcp-command "npx your-memory-server"
```

## Two Evaluation Layers

### Layer 1: Single-Operation Retrieval (56 tests, 8 categories)

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

### Layer 2: Multi-Step Retrieval (5 scenarios)

| Scenario | What It Tests |
|---|---|
| Preference Application | Retrieve multiple stored preferences to assemble a complete configuration |
| Context Continuity | Retrieve related context from multiple simulated prior sessions |
| Conflict Resolution (Multi-Step) | Handle chains of superseding facts |
| Cross-Agent Handoff | Agent B retrieves context stored by Agent A |
| Redundancy Check | Verify stored facts remain retrievable without re-storing |

Scores are reported separately (Layer 1 score + Layer 2 score). Layer 1 score is backward-compatible with v1.0.

## Scores

### Layer 1

| Provider | Overall | Factual | Semantic | Temporal | Conflict | Forgetting | Cross-Session | Multi-Agent | Cost |
|---|---|---|---|---|---|---|---|---|---|
| Central Intelligence | **92** | 100 | 100 | 86 | 86 | 83 | 86 | 83 | 100 |
| In-Memory Baseline | 55 | 100 | 0 | 43 | 86 | 83 | 57 | 50 | 56 |

### Layer 2

| Provider | Overall | Preference | Continuity | Conflict | Handoff | Redundancy |
|---|---|---|---|---|---|---|
| In-Memory Baseline | 20 | FAIL | FAIL | FAIL | FAIL | PASS |

*Run `npx agent-memory-benchmark --provider <name>` to add your provider's scores.*

## CLI Options

```
--provider <name>         Provider: central-intelligence | mem0 | in-memory | hindsight | zep | mcp
--api-key <key>           API key (or set AMB_API_KEY env var)
--api-url <url>           API base URL override
--categories <list>       Comma-separated category IDs (default: all)
--output <dir>            Output directory (default: ./amb-results)
--verbose                 Show detailed per-query output
--layer <1|2|all>         Which layer to run (default: all)
--no-delay                Skip inter-test delays (for local/in-memory adapters)
--fixtures-dir <dir>      Fixtures directory for Layer 2 scenarios

MCP-specific:
--mcp-command <cmd>       MCP server command (required for --provider mcp)
--mcp-store-tool <name>   Override MCP store tool name
--mcp-search-tool <name>  Override MCP search tool name
--mcp-delete-tool <name>  Override MCP delete tool name
```

## Output

AMB generates files in `./amb-results/`:

- **results.json** -- Machine-readable results with Layer 1 + Layer 2 scores
- **report.md** -- Human-readable report with tables and failure details
- **badge.svg** -- Embeddable Layer 1 score badge

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

Or use the MCP adapter for any MCP-compatible memory server:

```bash
npx agent-memory-benchmark --provider mcp --mcp-command "npx your-memory-server"
```

## GitHub Action

Add AMB to your CI:

```yaml
- uses: AlekseiMarchenko/agent-memory-benchmark/.github/actions/amb@v2
  with:
    provider: your-provider
    api-key: ${{ secrets.PROVIDER_API_KEY }}
```

## Scoring

- **Layer 1**: Per-query binary pass/fail based on expected keywords. Per-category: (passed / total) * 100. Overall: weighted average.
- **Layer 2**: Per-scenario binary pass/fail. Score: (passed / total) * 100.
- **Scores are separate**: Layer 1 and Layer 2 are independent metrics, not blended.
- **Exit code**: 0 if Layer 1 score >= 70, 1 otherwise.

## Philosophy

1. **Real-world scenarios** -- Every test maps to an actual agent workflow
2. **Provider-agnostic** -- Same tests, fair comparison
3. **Deterministic scoring** -- No LLM-as-judge, no embedding similarity
4. **Two layers** -- Single-operation retrieval + multi-step retrieval scenarios
5. **Open source** -- MIT licensed. Add your provider, submit PRs

## Contributing

1. Fork the repo
2. Add your adapter in `contrib/` or `src/adapters/`
3. Run the benchmark and include results
4. Submit a PR

See [CONTRIBUTING.md](CONTRIBUTING.md) for details.

## License

MIT -- [Aleksei Marchenko](https://github.com/AlekseiMarchenko)
