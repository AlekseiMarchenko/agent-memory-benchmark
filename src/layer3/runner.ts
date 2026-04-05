import type {
  MemoryAdapter,
  TestCase,
  CategoryId,
  CategoryResult,
  QueryResult,
  Layer3Result,
  Layer3ScaleResult,
  CATEGORY_WEIGHTS,
} from "../types.js";
import { ALL_TESTS, getTestsByCategory } from "../categories/index.js";
import { generateDistractors } from "./distractors.js";

interface Layer3Options {
  scales: number[];
  categories?: CategoryId[];
  storeDelayMs: number;
  noDelay: boolean;
  verbose: boolean;
  layer1Results?: CategoryResult[];
}

/**
 * Run Layer 3: scale testing.
 *
 * For each scale level (e.g., 1K, 5K, 10K):
 *   1. Store N distractor memories under a shared agent_id
 *   2. Run all Layer 1 test cases against the same agent_id
 *   3. Cleanup distractors
 *   4. Report per-category accuracy at this scale
 */
export async function runLayer3(
  adapter: MemoryAdapter,
  options: Layer3Options
): Promise<Layer3Result> {
  const { scales, categories, storeDelayMs, noDelay, verbose } = options;
  const scaleResults: Layer3ScaleResult[] = [];

  // Determine which categories to run
  const categoriesToRun = categories || [
    "factual-recall",
    "semantic-search",
    "temporal-reasoning",
    "conflict-resolution",
    "selective-forgetting",
    "cross-session",
    "multi-agent",
    "cost-efficiency",
  ] as CategoryId[];

  for (const scale of scales) {
    console.log(`\n  === Layer 3: ${scale.toLocaleString()} distractors ===`);

    const agentId = `amb-l3-${scale}-${Date.now()}`;
    const distractors = generateDistractors(scale);
    const distractorIds: string[] = [];

    // Step 1: Store distractors
    const storeStart = Date.now();
    console.log(`  Storing ${scale.toLocaleString()} distractors...`);

    let stored = 0;
    let failed = 0;
    for (const content of distractors) {
      try {
        const entry = await adapter.store(content, { agentId });
        distractorIds.push(entry.id);
        stored++;
      } catch (err: any) {
        failed++;
        // Retry once on rate limit
        if (err.message?.includes("429") || err.message?.includes("rate")) {
          await sleep(2000);
          try {
            const entry = await adapter.store(content, { agentId });
            distractorIds.push(entry.id);
            stored++;
            failed--;
          } catch {
            // Give up on this one
          }
        }
      }

      if (stored % 200 === 0) {
        console.log(`    ${stored}/${scale} stored (${failed} failed)`);
      }
    }

    const distractorStoreTimeMs = Date.now() - storeStart;
    console.log(
      `  Distractors stored: ${stored}/${scale} in ${(distractorStoreTimeMs / 1000).toFixed(1)}s`
    );

    // Wait for indexing
    const indexDelay = noDelay ? 0 : Math.max(storeDelayMs, 3000);
    if (indexDelay > 0) {
      console.log(`  Waiting ${indexDelay}ms for indexing...`);
      await sleep(indexDelay);
    }

    // Step 2: Run test cases against the noisy store
    const categoryResults: CategoryResult[] = [];

    for (const catId of categoriesToRun) {
      const tests = getTestsByCategory(catId);

      // Skip categories that require capabilities the adapter doesn't have
      if (catId === "multi-agent" && !adapter.capabilities?.multiAgent) {
        categoryResults.push({
          category: catId,
          name: catId,
          score: 0,
          passed: 0,
          total: 0,
          details: [],
          avgLatencyMs: 0,
          totalTokens: 0,
          skipped: true,
          skipReason: "Adapter does not support multi-agent",
        });
        continue;
      }

      // Skip selective-forgetting and tests that use store-then-delete
      // (they need their own isolated seeds, which conflicts with shared agent_id)
      const applicableTests = tests.filter(
        (t) => t.setup !== "store-then-delete" && t.setup !== "multi-agent-store"
      );

      const queryResults: QueryResult[] = [];
      let catLatency = 0;
      let catTokens = 0;

      for (const test of applicableTests) {
        // Store test seeds under the SAME agent_id as distractors
        const seedIds: string[] = [];
        for (const seed of test.seeds) {
          try {
            const entry = await adapter.store(seed.content, {
              agentId: seed.agentId || agentId,
              tags: seed.tags,
            });
            seedIds.push(entry.id);

            if (seed.storeDelay && test.setup === "store-with-delay") {
              await sleep(seed.storeDelay);
            }
          } catch {
            // Skip if store fails
          }
        }

        // Wait for indexing
        if (!noDelay) {
          await sleep(storeDelayMs || 3000);
        }

        // Run queries
        for (const query of test.queries) {
          const start = Date.now();
          try {
            const results = await adapter.search(query.query, {
              agentId: query.agentId || agentId,
              limit: query.topK || 3,
              scope: query.scope,
            });
            const latency = Date.now() - start;
            catLatency += latency;

            // Check keywords
            const allContent = results.map((r) => r.content).join(" ");
            const contentLower = allContent.toLowerCase();
            const tokens = Math.ceil(allContent.length / 4);
            catTokens += tokens;

            let passed = true;
            let reason = "";

            if (query.expectEmpty) {
              passed = results.length === 0;
              if (!passed) reason = `Expected empty, got ${results.length} results`;
            } else {
              // Check expected keywords
              if (query.expectedKeywords) {
                for (const kw of query.expectedKeywords) {
                  if (!contentLower.includes(kw.toLowerCase())) {
                    passed = false;
                    reason = `Missing keyword: "${kw}"`;
                    break;
                  }
                }
              }

              // Check unexpected keywords
              if (passed && query.unexpectedKeywords) {
                for (const kw of query.unexpectedKeywords) {
                  if (contentLower.includes(kw.toLowerCase())) {
                    passed = false;
                    reason = `Found unwanted keyword: "${kw}"`;
                    break;
                  }
                }
              }
            }

            queryResults.push({
              testId: test.id,
              queryId: query.id,
              query: query.query,
              passed,
              score: passed ? 1 : 0,
              latencyMs: latency,
              tokensEstimated: tokens,
              topResults: results.slice(0, 3),
              reason: passed ? undefined : reason,
            });

            if (verbose) {
              const mark = passed ? "PASS" : "FAIL";
              console.log(`    ${mark} ${test.id}/${query.id}${passed ? "" : ` — ${reason}`}`);
            }
          } catch (err: any) {
            queryResults.push({
              testId: test.id,
              queryId: query.id,
              query: query.query,
              passed: false,
              score: 0,
              latencyMs: Date.now() - start,
              tokensEstimated: 0,
              topResults: [],
              reason: `Search error: ${err.message}`,
            });
          }
        }

        // Delete test seeds (keep distractors)
        for (const id of seedIds) {
          try {
            await adapter.delete(id);
          } catch {}
        }
      }

      const passed = queryResults.filter((q) => q.passed).length;
      const total = queryResults.length;

      categoryResults.push({
        category: catId,
        name: catId,
        score: total > 0 ? (passed / total) * 100 : 0,
        passed,
        total,
        details: queryResults,
        avgLatencyMs: total > 0 ? catLatency / total : 0,
        totalTokens: catTokens,
      });

      if (verbose) {
        console.log(`    ${catId}: ${passed}/${total} (${total > 0 ? ((passed / total) * 100).toFixed(0) : 0}%)`);
      }
    }

    // Compute overall score (weighted)
    const weights: Record<string, number> = {
      "factual-recall": 0.15,
      "semantic-search": 0.20,
      "temporal-reasoning": 0.15,
      "conflict-resolution": 0.10,
      "selective-forgetting": 0.10,
      "cross-session": 0.15,
      "multi-agent": 0.05,
      "cost-efficiency": 0.10,
    };

    let weightedSum = 0;
    let totalWeight = 0;
    for (const cat of categoryResults) {
      if (cat.skipped) continue;
      const w = weights[cat.category] || 0.1;
      weightedSum += cat.score * w;
      totalWeight += w;
    }
    const overallScore = totalWeight > 0 ? weightedSum / totalWeight : 0;

    const avgLatency =
      categoryResults.reduce((s, c) => s + c.avgLatencyMs, 0) / categoryResults.length;

    scaleResults.push({
      scale,
      categories: categoryResults,
      overallScore: Math.round(overallScore * 100) / 100,
      avgLatencyMs: Math.round(avgLatency),
      distractorStoreTimeMs,
    });

    console.log(`  Overall at ${scale.toLocaleString()}: ${overallScore.toFixed(1)}%`);

    // Step 3: Cleanup distractors
    console.log(`  Cleaning up ${distractorIds.length} distractors...`);
    let cleaned = 0;
    for (const id of distractorIds) {
      try {
        await adapter.delete(id);
        cleaned++;
      } catch {}
    }
    console.log(`  Cleaned ${cleaned}/${distractorIds.length}`);
  }

  // Compute degradation vs Layer 1
  const layer1Overall = options.layer1Results
    ? computeWeightedScore(options.layer1Results)
    : null;

  const degradation = scaleResults.map((s) => ({
    scale: s.scale,
    scoreDropPercent: layer1Overall !== null
      ? Math.round((s.overallScore - layer1Overall) * 100) / 100
      : 0,
  }));

  return { scales: scaleResults, degradation };
}

function computeWeightedScore(categories: CategoryResult[]): number {
  const weights: Record<string, number> = {
    "factual-recall": 0.15,
    "semantic-search": 0.20,
    "temporal-reasoning": 0.15,
    "conflict-resolution": 0.10,
    "selective-forgetting": 0.10,
    "cross-session": 0.15,
    "multi-agent": 0.05,
    "cost-efficiency": 0.10,
  };
  let ws = 0, tw = 0;
  for (const c of categories) {
    if (c.skipped) continue;
    const w = weights[c.category] || 0.1;
    ws += c.score * w;
    tw += w;
  }
  return tw > 0 ? ws / tw : 0;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
