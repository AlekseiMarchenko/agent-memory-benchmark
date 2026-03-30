#!/usr/bin/env node

import { Command } from "commander";
import { runBenchmark } from "./runner.js";
import { writeResults } from "./report.js";
import { InMemoryAdapter } from "./adapters/in-memory.js";
import { CentralIntelligenceAdapter } from "./adapters/central-intelligence.js";
import { Mem0Adapter } from "./adapters/mem0.js";
import { CategoryId } from "./types.js";

const program = new Command();

program
  .name("amb")
  .description("Agent Memory Benchmark — the definitive benchmark for agent memory systems")
  .version("1.0.0")
  .requiredOption("--provider <name>", "Provider: central-intelligence | mem0 | in-memory")
  .option("--api-key <key>", "API key (or set AMB_API_KEY env var)")
  .option("--api-url <url>", "API base URL override")
  .option("--categories <list>", "Comma-separated category IDs (default: all)")
  .option("--output <dir>", "Output directory", "./amb-results")
  .option("--verbose", "Show detailed per-query output", false);

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

    default:
      console.error(`❌ Unknown provider: ${provider}`);
      console.error("   Available: central-intelligence, mem0, in-memory");
      process.exit(1);
  }

  const categories = opts.categories
    ? (opts.categories as string).split(",").map((c: string) => c.trim() as CategoryId)
    : undefined;

  try {
    const result = await runBenchmark(adapter, {
      categories,
      verbose: opts.verbose,
    });

    writeResults(result, opts.output);

    process.exit(result.overallScore >= 70 ? 0 : 1);
  } catch (err) {
    console.error("❌ Benchmark failed:", err instanceof Error ? err.message : err);
    process.exit(1);
  }
}

main();
