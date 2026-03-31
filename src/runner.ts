import { MemoryAdapter, TestCase, TestQuery, CategoryId, CategoryResult, QueryResult, BenchmarkResult, CATEGORY_NAMES } from "./types.js";
import { getTestsByCategory, getCategories } from "./categories/index.js";
import { computeOverallScore } from "./scoring.js";
import { runLayer2 } from "./layer2/runner.js";

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelayMs: number = 1000
): Promise<T> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const isRateLimit = err instanceof Error && (
        err.message.includes("429") || err.message.includes("rate") || err.message.includes("Rate")
      );
      if (!isRateLimit || attempt === maxRetries) throw err;
      const delay = baseDelayMs * Math.pow(2, attempt);
      await sleep(delay);
    }
  }
  throw new Error("Unreachable");
}

async function verifiedDelete(adapter: MemoryAdapter, id: string, verbose: boolean): Promise<void> {
  const deleted = await adapter.delete(id);
  if (!deleted && verbose) {
    console.log(`     ⚠️  Delete returned false for ${id}, retrying...`);
    await sleep(500);
    await adapter.delete(id);
  }
}

function checkKeywords(results: { content: string }[], keywords: string[]): boolean {
  const combined = results.map((r) => r.content).join(" ").toLowerCase();
  return keywords.every((kw) => combined.toLowerCase().includes(kw.toLowerCase()));
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runTestCase(
  adapter: MemoryAdapter,
  test: TestCase,
  verbose: boolean
): Promise<QueryResult[]> {
  const results: QueryResult[] = [];
  const storedIds: string[] = [];

  // Generate a unique default agent ID for this test to prevent cross-test pollution
  const defaultAgentId = `amb-${test.id}-${Date.now()}`;

  try {
    // Seed memories (unified loop with per-setup options)
    for (const seed of test.seeds) {
      if (test.setup === "store-with-delay" && seed.storeDelay) {
        await sleep(seed.storeDelay);
      }
      const entry = await withRetry(() => adapter.store(seed.content, {
        agentId: seed.agentId || defaultAgentId,
        tags: seed.tags,
        scope: seed.scope || (test.setup === "multi-agent-store" ? "org" : seed.scope),
      }));
      storedIds.push(entry.id);
    }

    // For store-then-delete tests, delete based on deletePattern
    if (test.setup === "store-then-delete") {
      const pattern = test.deletePattern || "all";

      if (pattern === "first") {
        await verifiedDelete(adapter, storedIds[0], verbose);
      } else if (pattern === "search-then-delete") {
        // Search first (for lifecycle timing tests), then delete all
        await adapter.search("lifecycle test", { limit: 5 });
        for (const id of storedIds) {
          await verifiedDelete(adapter, id, verbose);
        }
      } else if (typeof pattern === "object" && "keepLast" in pattern) {
        // Delete all except the last N
        const deleteCount = storedIds.length - pattern.keepLast;
        for (let i = 0; i < deleteCount; i++) {
          await verifiedDelete(adapter, storedIds[i], verbose);
        }
      } else {
        // "all" — delete everything
        for (const id of storedIds) {
          await verifiedDelete(adapter, id, verbose);
        }
      }
    }

    // Wait for indexing + rate limit cooldown
    await sleep(3000);

    // Run queries
    for (const query of test.queries) {
      const start = Date.now();
      const searchResults = await withRetry(() => adapter.search(query.query, {
        limit: query.topK || 3,
        agentId: query.agentId || defaultAgentId,
        scope: query.scope,
      }));
      const latency = Date.now() - start;
      const tokens = estimateTokens(query.query) + searchResults.reduce((sum, r) => sum + estimateTokens(r.content), 0);

      let passed = false;
      let reason = "";

      if (query.expectEmpty) {
        // Pass if no results, or all results have explicitly low scores.
        // If score is undefined (provider doesn't return scores), only pass on truly empty results.
        passed = searchResults.length === 0 || searchResults.every((r) => r.score !== undefined && r.score < 0.1);
        reason = passed ? "Correctly returned empty/low-score results" : `Expected empty but got ${searchResults.length} results (scores: ${searchResults.map(r => r.score ?? 'undefined').join(', ')})`;
      } else if (query.expectedKeywords && query.expectedKeywords.length > 0) {
        passed = checkKeywords(searchResults, query.expectedKeywords);
        if (!passed) {
          const found = query.expectedKeywords.filter((kw) =>
            searchResults.some((r) => r.content.toLowerCase().includes(kw.toLowerCase()))
          );
          const missing = query.expectedKeywords.filter((kw) =>
            !searchResults.some((r) => r.content.toLowerCase().includes(kw.toLowerCase()))
          );
          reason = `Found: [${found.join(", ")}], Missing: [${missing.join(", ")}]`;
        } else {
          reason = "All expected keywords found in results";
        }
      }

      // Check unexpected keywords across ALL results
      if (passed && query.unexpectedKeywords) {
        const combined = searchResults.map((r) => r.content).join(" ").toLowerCase();
        const foundUnexpected = query.unexpectedKeywords.filter((kw) =>
          combined.includes(kw.toLowerCase())
        );
        if (foundUnexpected.length > 0) {
          passed = false;
          reason = `Results contain unexpected keywords: [${foundUnexpected.join(", ")}]`;
        }
      }

      const qr: QueryResult = {
        testId: test.id,
        queryId: query.id,
        query: query.query,
        passed,
        score: passed ? 1 : 0,
        latencyMs: latency,
        tokensEstimated: tokens,
        topResults: searchResults.slice(0, 3),
        reason,
      };

      results.push(qr);

      if (verbose) {
        const icon = passed ? "✅" : "❌";
        console.log(`  ${icon} ${query.id}: "${query.query}" (${latency}ms)`);
        if (!passed) console.log(`     ${reason}`);
      }
    }
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    for (const query of test.queries) {
      results.push({
        testId: test.id,
        queryId: query.id,
        query: query.query,
        passed: false,
        score: 0,
        latencyMs: 0,
        tokensEstimated: 0,
        topResults: [],
        reason: `Error: ${errMsg}`,
      });
    }
  }

  // Clean up all memories created by this test case (except ones already deleted by store-then-delete tests)
  if (test.setup !== "store-then-delete") {
    for (const id of storedIds) {
      try {
        await adapter.delete(id);
      } catch {}
    }
  }
  // Delay to ensure deletes propagate before next test seeds
  await sleep(1500);

  return results;
}

export async function runBenchmark(
  adapter: MemoryAdapter,
  options: {
    categories?: CategoryId[];
    verbose?: boolean;
    layer?: "1" | "2" | "all";
    noDelay?: boolean;
    fixturesDir?: string;
  } = {}
): Promise<BenchmarkResult> {
  const verbose = options.verbose ?? false;
  const layer = options.layer ?? "all";
  const noDelay = options.noDelay ?? false;
  const categoriesToRun = options.categories || getCategories();

  console.log(`\n🧠 Agent Memory Benchmark v2.0.0`);
  console.log(`   Provider: ${adapter.name}`);
  console.log(`   Layer: ${layer}`);
  console.log(`   Categories: ${categoriesToRun.length}`);
  console.log(`   Tests: ${categoriesToRun.reduce((sum, c) => sum + getTestsByCategory(c).length, 0)}\n`);

  await adapter.initialize();

  const categoryResults: CategoryResult[] = [];

  // Run Layer 1 unless only Layer 2 was requested
  if (layer === "2") {
    console.log(`⏭️  Layer 1 — skipped (--layer 2)\n`);
  }

  for (const categoryId of (layer === "2" ? [] : categoriesToRun)) {
    const tests = getTestsByCategory(categoryId);
    const categoryName = CATEGORY_NAMES[categoryId];

    // Check capabilities
    if (categoryId === "multi-agent" && !adapter.capabilities?.multiAgent) {
      console.log(`⏭️  ${categoryName} — skipped (adapter does not support multi-agent)\n`);
      categoryResults.push({
        category: categoryId,
        name: categoryName,
        score: 0,
        passed: 0,
        total: tests.reduce((sum, t) => sum + t.queries.length, 0),
        details: [],
        avgLatencyMs: 0,
        totalTokens: 0,
        skipped: true,
        skipReason: "Adapter does not support multi-agent",
      });
      continue;
    }

    console.log(`📋 ${categoryName} (${tests.length} tests)`);

    const allQueryResults: QueryResult[] = [];

    for (const test of tests) {
      if (verbose) console.log(`\n  📝 ${test.name}: ${test.description}`);

      const queryResults = await runTestCase(adapter, test, verbose);
      allQueryResults.push(...queryResults);
    }

    const passed = allQueryResults.filter((r) => r.passed).length;
    const total = allQueryResults.length;
    const score = total > 0 ? (passed / total) * 100 : 0;
    const avgLatency = total > 0 ? allQueryResults.reduce((sum, r) => sum + r.latencyMs, 0) / total : 0;
    const totalTokens = allQueryResults.reduce((sum, r) => sum + r.tokensEstimated, 0);

    const bar = "█".repeat(Math.round(score / 5)) + "░".repeat(20 - Math.round(score / 5));
    console.log(`   ${bar} ${score.toFixed(0)}% (${passed}/${total})\n`);

    categoryResults.push({
      category: categoryId,
      name: categoryName,
      score,
      passed,
      total,
      details: allQueryResults,
      avgLatencyMs: Math.round(avgLatency),
      totalTokens,
    });
  }

  // Run Layer 2 if requested
  let layer2Result = undefined;
  if (layer === "2" || layer === "all") {
    layer2Result = await runLayer2(adapter, {
      verbose,
      noDelay,
      fixturesDir: options.fixturesDir,
    });
  }

  // Final cleanup
  await adapter.cleanup();

  const overall = computeOverallScore(categoryResults);

  const l1Meta = {
    totalLatencyMs: categoryResults.reduce((sum, c) => sum + c.details.reduce((s, d) => s + d.latencyMs, 0), 0),
    totalTokens: categoryResults.reduce((sum, c) => sum + c.totalTokens, 0),
    totalApiCalls: categoryResults.reduce((sum, c) => sum + c.details.length, 0),
  };

  const result: BenchmarkResult = {
    provider: adapter.name,
    timestamp: new Date().toISOString(),
    version: "2.0.0",
    overallScore: Math.round(overall),
    categories: categoryResults,
    layer2: layer2Result,
    meta: {
      totalLatencyMs: l1Meta.totalLatencyMs + (layer2Result?.scenarios.reduce((s, r) => s + r.latencyMs, 0) || 0),
      totalTokens: l1Meta.totalTokens,
      totalApiCalls: l1Meta.totalApiCalls + (layer2Result?.scenarios.length || 0),
    },
  };

  console.log(`\n${"═".repeat(50)}`);
  console.log(`🏆 Layer 1 Score: ${result.overallScore}/100`);
  if (layer2Result && layer2Result.total > 0) {
    console.log(`🏆 Layer 2 Score: ${Math.round(layer2Result.score)}/100`);
  }
  console.log(`${"═".repeat(50)}\n`);

  return result;
}
