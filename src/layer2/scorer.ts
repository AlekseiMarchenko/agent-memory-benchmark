import { Layer2Scenario } from "../types.js";

export interface ScoreResult {
  passed: boolean;
  score: number;
  reason: string;
}

export function scoreScenario(
  scenario: Layer2Scenario,
  retrievedContent: string[]
): ScoreResult {
  const combined = retrievedContent.join(" ").toLowerCase();

  // Check mustContain
  const found = scenario.expected.mustContain.filter((kw) =>
    combined.includes(kw.toLowerCase())
  );
  const missing = scenario.expected.mustContain.filter((kw) =>
    !combined.includes(kw.toLowerCase())
  );

  if (missing.length > 0) {
    return {
      passed: false,
      score: 0,
      reason: `Missing keywords: [${missing.join(", ")}]. Found: [${found.join(", ")}]`,
    };
  }

  // Check mustNotContain
  const mustNotContain = scenario.expected.mustNotContain || [];
  const unexpected = mustNotContain.filter((kw) =>
    combined.includes(kw.toLowerCase())
  );

  if (unexpected.length > 0) {
    return {
      passed: false,
      score: 0,
      reason: `Unexpected keywords found: [${unexpected.join(", ")}]`,
    };
  }

  return {
    passed: true,
    score: 1,
    reason: `All ${scenario.expected.mustContain.length} expected keywords found`,
  };
}
