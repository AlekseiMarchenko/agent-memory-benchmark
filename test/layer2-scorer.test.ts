import { describe, it, expect } from "vitest";
import { scoreScenario } from "../src/layer2/scorer.js";
import { Layer2Scenario } from "../src/types.js";

function makeScenario(
  mustContain: string[],
  mustNotContain: string[] = []
): Layer2Scenario {
  return {
    id: "test",
    name: "Test Scenario",
    description: "test",
    seeds: [],
    queries: [],
    expected: { mustContain, mustNotContain },
  };
}

describe("scoreScenario", () => {
  it("passes when all mustContain found and no mustNotContain present", () => {
    const scenario = makeScenario(["TypeScript", "PostgreSQL"]);
    const content = ["Uses TypeScript for the backend", "Database is PostgreSQL 16"];
    const result = scoreScenario(scenario, content);
    expect(result.passed).toBe(true);
    expect(result.score).toBe(1);
  });

  it("fails when mustContain keywords are missing", () => {
    const scenario = makeScenario(["TypeScript", "PostgreSQL", "Redis"]);
    const content = ["Uses TypeScript for the backend"];
    const result = scoreScenario(scenario, content);
    expect(result.passed).toBe(false);
    expect(result.score).toBe(0);
    expect(result.reason).toContain("Redis");
  });

  it("fails when mustNotContain keywords are present", () => {
    const scenario = makeScenario(["TypeScript"], ["JavaScript"]);
    const content = ["Uses TypeScript and JavaScript together"];
    const result = scoreScenario(scenario, content);
    expect(result.passed).toBe(false);
    expect(result.score).toBe(0);
    expect(result.reason).toContain("JavaScript");
  });

  it("returns 0 for empty search results", () => {
    const scenario = makeScenario(["TypeScript"]);
    const result = scoreScenario(scenario, []);
    expect(result.passed).toBe(false);
    expect(result.score).toBe(0);
  });

  it("passes with empty mustContain (no requirements)", () => {
    const scenario = makeScenario([]);
    const result = scoreScenario(scenario, ["anything"]);
    expect(result.passed).toBe(true);
    expect(result.score).toBe(1);
  });
});
