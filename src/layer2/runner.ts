import * as fs from "fs";
import * as path from "path";
import { MemoryAdapter, Layer2Scenario, Layer2Result, Layer2ScenarioResult } from "../types.js";
import { scoreScenario } from "./scorer.js";

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function loadScenarios(fixturesDir: string): Layer2Scenario[] {
  const layer2Dir = path.join(fixturesDir, "layer2");
  if (!fs.existsSync(layer2Dir)) {
    return [];
  }
  const files = fs.readdirSync(layer2Dir).filter((f) => f.endsWith(".json"));
  return files.map((f) => {
    const raw = fs.readFileSync(path.join(layer2Dir, f), "utf-8");
    return JSON.parse(raw) as Layer2Scenario;
  });
}

async function runScenario(
  adapter: MemoryAdapter,
  scenario: Layer2Scenario,
  verbose: boolean,
  noDelay: boolean,
  storeDelayMs: number = 3000
): Promise<Layer2ScenarioResult> {
  const defaultAgentId = `amb-l2-${scenario.id}-${Date.now()}`;
  const storedIds: string[] = [];
  const start = Date.now();

  try {
    // Seed memories
    for (const seed of scenario.seeds) {
      if (seed.storeDelay && !noDelay) await sleep(seed.storeDelay);
      const entry = await adapter.store(seed.content, {
        agentId: seed.agentId || defaultAgentId,
        tags: seed.tags,
        scope: seed.scope,
      });
      storedIds.push(entry.id);
    }

    // Wait for indexing
    if (!noDelay) await sleep(storeDelayMs);

    // Run all queries and collect results
    const allContent: string[] = [];
    for (const query of scenario.queries) {
      const results = await adapter.search(query.query, {
        limit: query.limit || 5,
        agentId: query.agentId || defaultAgentId,
        scope: query.scope,
      });
      allContent.push(...results.map((r) => r.content));
    }

    const latency = Date.now() - start;
    const { passed, score, reason } = scoreScenario(scenario, allContent);

    if (verbose) {
      const icon = passed ? "✅" : "❌";
      console.log(`  ${icon} ${scenario.id}: ${scenario.name} (${latency}ms)`);
      if (!passed) console.log(`     ${reason}`);
    }

    return {
      scenarioId: scenario.id,
      name: scenario.name,
      passed,
      score,
      latencyMs: latency,
      reason,
      retrievedContent: allContent.slice(0, 10),
    };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    return {
      scenarioId: scenario.id,
      name: scenario.name,
      passed: false,
      score: 0,
      latencyMs: Date.now() - start,
      reason: `Error: ${errMsg}`,
      retrievedContent: [],
    };
  } finally {
    // Cleanup
    for (const id of storedIds) {
      try { await adapter.delete(id); } catch {}
    }
    if (!noDelay) await sleep(1500);
  }
}

export async function runLayer2(
  adapter: MemoryAdapter,
  options: { verbose?: boolean; noDelay?: boolean; storeDelayMs?: number; fixturesDir?: string } = {}
): Promise<Layer2Result> {
  const verbose = options.verbose ?? false;
  const noDelay = options.noDelay ?? false;
  const storeDelayMs = noDelay ? 0 : (options.storeDelayMs ?? 3000);
  const fixturesDir = options.fixturesDir ?? path.resolve(process.cwd(), "fixtures");

  const scenarios = loadScenarios(fixturesDir);

  if (scenarios.length === 0) {
    console.log(`\n⏭️  Layer 2 — skipped (no fixtures found in ${fixturesDir}/layer2/)\n`);
    return { score: 0, passed: 0, total: 0, scenarios: [], avgLatencyMs: 0 };
  }

  console.log(`\n📋 Layer 2: Multi-Step Retrieval (${scenarios.length} scenarios)`);

  const results: Layer2ScenarioResult[] = [];

  for (const scenario of scenarios) {
    if (verbose) console.log(`\n  📝 ${scenario.name}: ${scenario.description}`);
    const result = await runScenario(adapter, scenario, verbose, noDelay, storeDelayMs);
    results.push(result);
  }

  const passed = results.filter((r) => r.passed).length;
  const total = results.length;
  const score = total > 0 ? (passed / total) * 100 : 0;
  const avgLatency = total > 0 ? results.reduce((sum, r) => sum + r.latencyMs, 0) / total : 0;

  const bar = "█".repeat(Math.round(score / 5)) + "░".repeat(20 - Math.round(score / 5));
  console.log(`   ${bar} ${score.toFixed(0)}% (${passed}/${total})\n`);

  return {
    score,
    passed,
    total,
    scenarios: results,
    avgLatencyMs: Math.round(avgLatency),
  };
}
