#!/usr/bin/env node

import { Command } from "commander";
import { runBenchmark } from "./runner.js";
import { writeResults } from "./report.js";
import { InMemoryAdapter } from "./adapters/in-memory.js";
import { CentralIntelligenceAdapter } from "./adapters/central-intelligence.js";
import { Mem0Adapter } from "./adapters/mem0.js";
import { HindsightAdapter } from "./adapters/hindsight.js";
import { ZepAdapter } from "./adapters/zep.js";
import { McpAdapter } from "./adapters/mcp-adapter.js";
import { CategoryId } from "./types.js";

const program = new Command();

program
  .name("amb")
  .description("Agent Memory Benchmark — the definitive benchmark for agent memory systems")
  .version("2.0.0")
  .requiredOption("--provider <name>", "Provider: central-intelligence | mem0 | in-memory | hindsight | zep | mcp")
  .option("--api-key <key>", "API key (or set AMB_API_KEY env var)")
  .option("--api-url <url>", "API base URL override")
  .option("--categories <list>", "Comma-separated category IDs (default: all)")
  .option("--output <dir>", "Output directory", "./amb-results")
  .option("--verbose", "Show detailed per-query output", false)
  .option("--layer <layer>", "Which layer to run: 1, 2, or all", "all")
  .option("--no-delay", "Skip inter-test delays (useful for local/in-memory adapters)")
  .option("--store-delay <seconds>", "Seconds to wait after storing before searching (default: 3)", parseFloat)
  .option("--fixtures-dir <dir>", "Fixtures directory for Layer 2 scenarios")
  .option("--mcp-command <cmd>", "MCP server command (for --provider mcp)")
  .option("--mcp-store-tool <name>", "Override MCP store tool name")
  .option("--mcp-search-tool <name>", "Override MCP search tool name")
  .option("--mcp-delete-tool <name>", "Override MCP delete tool name");

program.parse();

const opts = program.opts();

async function main() {
  const apiKey = opts.apiKey || process.env.AMB_API_KEY;
  const provider = opts.provider;

  let adapter;

  switch (provider) {
    case "in-memory":
      adapter = new InMemoryAdapter();
      break;

    case "central-intelligence":
    case "ci":
      if (!apiKey) {
        console.error("❌ --api-key or AMB_API_KEY required for Central Intelligence");
        process.exit(1);
      }
      adapter = new CentralIntelligenceAdapter(apiKey, opts.apiUrl);
      break;

    case "mem0":
      if (!apiKey) {
        console.error("❌ --api-key or AMB_API_KEY required for Mem0");
        process.exit(1);
      }
      adapter = new Mem0Adapter(apiKey, opts.apiUrl);
      break;

    case "hindsight":
      adapter = new HindsightAdapter(opts.apiUrl);
      break;

    case "zep":
      if (!apiKey) {
        console.error("❌ --api-key or AMB_API_KEY required for Zep");
        process.exit(1);
      }
      adapter = new ZepAdapter(apiKey, opts.apiUrl);
      break;

    case "mcp":
      if (!opts.mcpCommand) {
        console.error("❌ --mcp-command required for MCP provider");
        console.error('   Example: --provider mcp --mcp-command "npx my-memory-server"');
        process.exit(1);
      }
      adapter = new McpAdapter(opts.mcpCommand, {
        store: opts.mcpStoreTool,
        search: opts.mcpSearchTool,
        delete: opts.mcpDeleteTool,
      });
      break;

    default:
      console.error(`❌ Unknown provider: ${provider}`);
      console.error("   Available: central-intelligence, mem0, in-memory, hindsight, zep, mcp");
      process.exit(1);
  }

  const categories = opts.categories
    ? (opts.categories as string).split(",").map((c: string) => c.trim() as CategoryId)
    : undefined;

  const layer = opts.layer as "1" | "2" | "all";

  try {
    const result = await runBenchmark(adapter, {
      categories,
      verbose: opts.verbose,
      layer,
      noDelay: opts.delay === false,
      storeDelayMs: opts.storeDelay ? opts.storeDelay * 1000 : undefined,
      fixturesDir: opts.fixturesDir,
    });

    writeResults(result, opts.output);

    process.exit(result.overallScore >= 70 ? 0 : 1);
  } catch (err) {
    console.error("❌ Benchmark failed:", err instanceof Error ? err.message : err);
    process.exit(1);
  }
}

main();
