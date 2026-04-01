# Agent Memory Benchmark (AMB)

An open-source tool to test and compare agent memory providers. Run the same 56 tests against any provider, get comparable scores.

```bash
npx agent-memory-benchmark --provider central-intelligence --api-key $CI_API_KEY
npx agent-memory-benchmark --provider mem0 --api-key $MEM0_API_KEY
npx agent-memory-benchmark --provider zep --api-key $ZEP_API_KEY
npx agent-memory-benchmark --provider mcp --mcp-command "npx your-memory-server"
npx agent-memory-benchmark --provider in-memory  # baseline
```

## What It Tests

56 tests across 8 categories, plus 5 multi-step scenarios:

| # | Category | Tests | What It Tests |
|---|---|---|---|
| 1 | Factual Recall | 8 | Store a fact, retrieve it with a direct query |
| 2 | Semantic Search | 8 | Retrieve using paraphrased/conceptual queries |
| 3 | Temporal Reasoning | 7 | Handle "before/after" and "latest" queries |
| 4 | Conflict Resolution | 7 | When facts contradict, latest should win |
| 5 | Selective Forgetting | 6 | Deleted memories must not resurface |
| 6 | Cross-Session | 7 | Context carries over across sessions |
| 7 | Multi-Agent | 6 | Agent A stores, Agent B retrieves |
| 8 | Cost Efficiency | 7 | Latency and operation counts |

**Layer 2** adds 5 multi-step scenarios (preference assembly, context continuity, conflict chains, cross-agent handoff, redundancy check) that mirror real agent workflows.

## Scores

> **Disclosure:** Central Intelligence is maintained by the same author as this benchmark. Run it yourself and verify. Scores below are from AMB v2.0.2. PRs with new provider adapters are welcome.

**Default (3s store delay)**

| Provider | Overall | Factual | Semantic | Temporal | Conflict | Forgetting | Cross-Session | Cost |
|---|---|---|---|---|---|---|---|---|
| Central Intelligence | **90** | 100 | 100 | 86 | 86 | 83 | 86 | 94 |
| In-Memory Baseline | 55 | 100 | 0 | 43 | 86 | 83 | 57 | 56 |
| Zep | 11 | 0 | 0 | 14 | 0 | 67 | 0 | 19 |
| Mem0 | 7 | 0 | 0 | 14 | 0 | 50 | 0 | 25 |

**Extended delay (10s) for async providers**

| Provider | Overall | Factual | Semantic | Temporal | Conflict | Forgetting | Cross-Session | Cost |
|---|---|---|---|---|---|---|---|---|
| Mem0 | **54** | 100 | 100 | 29 | 29 | 0 | 43 | 44 |
| Zep | 39 | 75 | 63 | 29 | 0 | 67 | 0 | 19 |

Mem0 and Zep use async LLM-based fact extraction. At 3s most memories aren't indexed. Use `--store-delay 10` to give them more time.

**Layer 2 (multi-step)**

| Provider | Overall | Preference | Continuity | Conflict | Handoff | Redundancy |
|---|---|---|---|---|---|---|
| Central Intelligence | **60** | FAIL | FAIL | PASS | PASS | PASS |
| In-Memory Baseline | 20 | FAIL | FAIL | FAIL | FAIL | PASS |
| Zep | 0 | FAIL | FAIL | FAIL | FAIL | FAIL |
| Mem0 | 0 | FAIL | FAIL | FAIL | FAIL | FAIL |

## Adding Your Provider

Implement 5 methods:

```typescript
import { MemoryAdapter } from "agent-memory-benchmark";

class MyAdapter implements MemoryAdapter {
  name = "My Provider";
  capabilities = { multiAgent: true, scoping: true };

  async initialize() { /* connect */ }
  async store(content, options?) { /* store, return MemoryEntry */ }
  async search(query, options?) { /* search, return MemoryEntry[] */ }
  async delete(id) { /* delete, return boolean */ }
  async cleanup() { /* remove test data */ }
}
```

Or test any MCP-compatible memory server directly:

```bash
npx agent-memory-benchmark --provider mcp --mcp-command "npx your-memory-server"
```

## CLI Options

```
--provider <name>         central-intelligence | mem0 | in-memory | hindsight | zep | mcp
--api-key <key>           API key (or set AMB_API_KEY)
--api-url <url>           API base URL override
--store-delay <seconds>   Wait time after store before search (default: 3)
--categories <list>       Comma-separated category IDs
--output <dir>            Output directory (default: ./amb-results)
--verbose                 Show detailed per-query output
--layer <1|2|all>         Which layer to run (default: all)
--no-delay                Skip delays (for local/in-memory adapters)

MCP-specific:
--mcp-command <cmd>       MCP server command
--mcp-store-tool <name>   Override store tool name
--mcp-search-tool <name>  Override search tool name
--mcp-delete-tool <name>  Override delete tool name
```

## Output

Results go to `./amb-results/`:
- **results.json** -- machine-readable scores
- **report.md** -- human-readable report with failure details
- **badge.svg** -- embeddable score badge

## Scoring

- **Layer 1**: Binary pass/fail per query based on keyword presence. Category score = (passed / total) * 100. Overall = weighted average.
- **Layer 2**: Binary pass/fail per scenario. Score = (passed / total) * 100.
- **Exit code**: 0 if Layer 1 >= 70, 1 otherwise.

No LLM-as-judge. No embedding similarity thresholds. Same inputs produce identical scores every run.

## Known Limitations

- Test corpus is small (1-20 memories per test). Doesn't test retrieval at scale (10K+ memories).
- The in-memory baseline uses exact keyword matching, not embeddings. It's a floor, not a meaningful comparison for semantic capabilities.
- Factual recall and semantic search categories will saturate with any decent embedding model given enough indexing time.
- The hard categories are temporal reasoning, conflict resolution, and selective forgetting -- these test system architecture, not model quality.
- This benchmark is maintained by the author of Central Intelligence. Independent verification is encouraged.

## GitHub Action

```yaml
- uses: AlekseiMarchenko/agent-memory-benchmark/.github/actions/amb@v2
  with:
    provider: your-provider
    api-key: ${{ secrets.PROVIDER_API_KEY }}
```

## Contributing

1. Fork the repo
2. Add your adapter in `src/adapters/`
3. Run the benchmark and include results
4. Submit a PR

See [CONTRIBUTING.md](CONTRIBUTING.md) for details.

## License

Apache 2.0
