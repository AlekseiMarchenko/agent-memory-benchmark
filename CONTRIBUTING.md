# Contributing to Agent Memory Benchmark

## Adding a New Adapter

### Option 1: REST/HTTP Adapter
1. Create a file in `src/adapters/your-provider.ts`
2. Implement the `MemoryAdapter` interface (5 methods: initialize, store, search, delete, cleanup)
3. **Cleanup contract**: Your `cleanup()` method MUST delete all memories created during the benchmark run, identified by stored IDs. Do not bulk-wipe all data.
4. Add your provider to the switch in `src/cli.ts`
5. Test it: `npx tsx src/cli.ts --provider your-provider --api-key YOUR_KEY --verbose`
6. Submit a PR with your results

### Option 2: MCP Adapter (no code needed)
If your provider is an MCP server, just run:
```bash
npx agent-memory-benchmark --provider mcp --mcp-command "npx your-memory-server"
```
The MCP adapter auto-discovers your store/search/delete tools. If discovery fails, use:
```bash
--mcp-store-tool your_store_tool --mcp-search-tool your_search_tool --mcp-delete-tool your_delete_tool
```

## Adding Test Cases

### Layer 1
1. Find the relevant category file in `src/categories/`
2. Add your test case following the existing pattern
3. Run the in-memory baseline to verify: `npx tsx src/cli.ts --provider in-memory --verbose`
4. Submit a PR

### Layer 2
1. Create a JSON fixture in `fixtures/layer2/`
2. Follow the schema: `{ id, name, description, seeds, queries, expected: { mustContain, mustNotContain } }`
3. Run against in-memory: `npx tsx src/cli.ts --provider in-memory --layer 2 --verbose`
4. Submit a PR

## Reporting Issues

If you believe a test case is unfair or incorrectly scored, open an issue with:
- Your provider name and version
- The test ID that failed
- What your provider returned vs what was expected
- Why you think the expected result should change
