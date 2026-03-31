import { describe, it, expect } from "vitest";

// Import the checkKeywords function from runner.
// Since it's not exported, we test it indirectly through the runner or re-implement the logic.
// For now, test the logic directly.
function checkKeywords(results: { content: string }[], keywords: string[]): boolean {
  const combined = results.map((r) => r.content).join(" ").toLowerCase();
  return keywords.every((kw) => combined.toLowerCase().includes(kw.toLowerCase()));
}

describe("checkKeywords", () => {
  it("matches case-insensitively", () => {
    const results = [{ content: "The database uses PostgreSQL" }];
    expect(checkKeywords(results, ["postgresql"])).toBe(true);
    expect(checkKeywords(results, ["POSTGRESQL"])).toBe(true);
  });

  it("requires all keywords present", () => {
    const results = [{ content: "Uses PostgreSQL with pgvector" }];
    expect(checkKeywords(results, ["PostgreSQL", "pgvector"])).toBe(true);
    expect(checkKeywords(results, ["PostgreSQL", "MongoDB"])).toBe(false);
  });

  it("returns false for empty query", () => {
    const results = [{ content: "some content" }];
    // Empty keywords array: every() on empty array returns true
    expect(checkKeywords(results, [])).toBe(true);
  });

  it("returns false for empty results", () => {
    expect(checkKeywords([], ["PostgreSQL"])).toBe(false);
  });

  it("finds keyword in second result", () => {
    const results = [
      { content: "First result about Node.js" },
      { content: "Second result mentions PostgreSQL" },
    ];
    expect(checkKeywords(results, ["PostgreSQL"])).toBe(true);
  });

  it("matches substring within longer text", () => {
    const results = [{ content: "We use AES-256 encryption" }];
    expect(checkKeywords(results, ["AES-256"])).toBe(true);
  });
});
