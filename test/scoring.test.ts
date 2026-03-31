import { describe, it, expect } from "vitest";
import { computeOverallScore, getGrade, getGradeColor } from "../src/scoring.js";
import { CategoryResult } from "../src/types.js";

function makeCategory(id: string, score: number, skipped = false): CategoryResult {
  return {
    category: id as any,
    name: id,
    score,
    passed: Math.round(score / 100 * 10),
    total: 10,
    details: [],
    avgLatencyMs: 100,
    totalTokens: 500,
    skipped,
    skipReason: skipped ? "test" : undefined,
  };
}

describe("computeOverallScore", () => {
  it("computes weighted average across categories", () => {
    const categories = [
      makeCategory("factual-recall", 100),
      makeCategory("semantic-search", 80),
      makeCategory("temporal-reasoning", 60),
    ];
    const score = computeOverallScore(categories);
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  it("excludes skipped categories and renormalizes weights", () => {
    const categories = [
      makeCategory("factual-recall", 100),
      makeCategory("multi-agent", 0, true),
    ];
    const score = computeOverallScore(categories);
    expect(score).toBe(100);
  });

  it("returns 0 when all categories are skipped", () => {
    const categories = [
      makeCategory("factual-recall", 50, true),
      makeCategory("semantic-search", 80, true),
    ];
    expect(computeOverallScore(categories)).toBe(0);
  });

  it("returns single category score when only one category", () => {
    const categories = [makeCategory("factual-recall", 75)];
    expect(computeOverallScore(categories)).toBe(75);
  });
});

describe("getGrade", () => {
  it("returns correct grades at boundaries", () => {
    expect(getGrade(90)).toBe("A+");
    expect(getGrade(89.9)).toBe("A");
    expect(getGrade(80)).toBe("A");
    expect(getGrade(70)).toBe("B");
    expect(getGrade(69.9)).toBe("C");
    expect(getGrade(60)).toBe("C");
    expect(getGrade(50)).toBe("D");
    expect(getGrade(49)).toBe("F");
  });
});

describe("getGradeColor", () => {
  it("returns green for A+", () => {
    expect(getGradeColor(90)).toBe("#4CAF50");
  });

  it("returns red for F", () => {
    expect(getGradeColor(30)).toBe("#F44336");
  });
});
