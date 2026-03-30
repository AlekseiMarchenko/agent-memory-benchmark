import { MemoryAdapter, TestCase, TestQuery, CategoryId, CategoryResult, QueryResult, BenchmarkResult, CATEGORY_NAMES } from "./types.js";
import { getTestsByCategory, getCategories } from "./categories/index.js";
import { computeOverallScore } from "./scoring.js";

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
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
    // Seed memories
    if (test.setup === "store-with-delay") {
      for (const seed of test.seeds) {
        if (seed.storeDelay) await sleep(seed.storeDelay);
        const entry = await adapter.store(seed.content, {
          agentId: seed.agentId || defaultAgentId,
          tags: seed.tags,
          scope: seed.scope,
        });
        storedIds.push(entry.id);
      }
    } else if (test.setup === "multi-agent-store") {
      for (const seed of test.seeds) {
        const entry = await adapter.store(seed.content, {
          agentId: seed.agentId || defaultAgentId,
          tags: seed.tags,
          scope: seed.scope || "org",
        });
        storedIds.push(entry.id);
      }
    } else {
      for (const seed of test.seeds) {
        const entry = await adapter.store(seed.content, {
          agentId: seed.agentId || defaultAgentId,
          tags: seed.tags,
          scope: seed.scope,
        });
        storedIds.push(entry.id);
      }
    }

    // For store-then-delete tests, delete specific memories
    if (test.setup === "store-then-delete") {
      if (test.id === "sf-03") {
        // Delete only the first (ESLint), keep the second (Biome)
        await adapter.delete(storedIds[0]);
      } else if (test.id === "sf-04") {
        // Delete first 3, keep last 2
        for (let i = 0; i < 3; i++) {
          await adapter.delete(storedIds[i]);
        }
      } else if (test.id === "ce-05") {
        // Delete all for cost efficiency measurement
        for (const id of storedIds) {
          await adapter.delete(id);
        }
      } else if (test.id === "ce-07") {
        // First search, then delete
        const searchStart = Date.now();
        await adapter.search("lifecycle test", { limit: 5 });
        const searchLatency = Date.now() - searchStart;
        // Now delete all
        for (const id of storedIds) {
          await adapter.delete(id);
        }
      } else {
        // Default: delete all seeded memories
        for (const id of storedIds) {
          await adapter.delete(id);
        }
      }
    }

    // Wait for indexing + rate limit cooldown
    await sleep(3000);

    // Run queries
    for (const query of test.queries) {
      const start = Date.now();
      const searchResults = await adapter.search(query.query, {
        limit: query.topK || 3,
        agentId: query.agentId || defaultAgentId,
        scope: query.scope,
      });
      const latency = Date.now() - start;
      const tokens = estimateTokens(query.query) + searchResults.reduce((sum, r) => sum + estimateTokens(r.content), 0);

      let passed = false;
      let reason = "";

      if (query.expectEmpty) {
        passed = searchResults.length === 0 || searchResults.every((r) => (r.score ?? 1) < 0.1);
        reason = passed ? "Correctly returned empty/low-score results" : `Expected empty but got ${searchResults.length} results`;
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

      // Check unexpected keywords
      if (passed && query.unexpectedKeywords) {
        const hasUnexpected = query.unexpectedKeywords.some((kw) =>
          searchResults.length > 0 && searchResults[0].content.toLowerCase().includes(kw.toLowerCase())
        );
        if (hasUnexpected) {
          passed = false;
          reason = `Top result contains unexpected keyword`;
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
  } = {}
): Promise<BenchmarkResult> {
  const verbose = options.verbose ?? false;
  const categoriesToRun = options.categories || getCategories();

  console.log(`\n🧠 Agent Memory Benchmark v1.0.0`);
  console.log(`   Provider: ${adapter.name}`);
  console.log(`   Categories: ${categoriesToRun.length}`);
  console.log(`   Tests: ${categoriesToRun.reduce((sum, c) => sum + getTestsByCategory(c).length, 0)}\n`);

  await adapter.initialize();

  const categoryResults: CategoryResult[] = [];

  for (const categoryId of categoriesToRun) {
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

  // Final cleanup
  await adapter.cleanup();

  const overall = computeOverallScore(categoryResults);

  const result: BenchmarkResult = {
    provider: adapter.name,
    timestamp: new Date().toISOString(),
    version: "1.0.0",
    overallScore: Math.round(overall),
    categories: categoryResults,
    meta: {
      totalLatencyMs: categoryResults.reduce((sum, c) => sum + c.details.reduce((s, d) => s + d.latencyMs, 0), 0),
      totalTokens: categoryResults.reduce((sum, c) => sum + c.totalTokens, 0),
      totalApiCalls: categoryResults.reduce((sum, c) => sum + c.details.length, 0),
    },
  };

  console.log(`\n${"═".repeat(50)}`);
  console.log(`🏆 Overall Score: ${result.overallScore}/100`);
  console.log(`${"═".repeat(50)}\n`);

  return result;
}
