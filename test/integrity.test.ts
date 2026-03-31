import { describe, it, expect } from "vitest";
import { generateIntegrity, verifyIntegrity } from "../src/integrity.js";
import * as path from "path";

const fixturesDir = path.resolve(__dirname, "../fixtures");

describe("integrity", () => {
  it("generates consistent hashes for fixture files", () => {
    const a = generateIntegrity(fixturesDir);
    const b = generateIntegrity(fixturesDir);
    expect(a.fixtureHashes).toEqual(b.fixtureHashes);
  });

  it("verifies unchanged fixtures as valid", () => {
    const metadata = generateIntegrity(fixturesDir);
    const { valid, mismatches } = verifyIntegrity(fixturesDir, metadata);
    expect(valid).toBe(true);
    expect(mismatches).toHaveLength(0);
  });

  it("detects hash mismatch when reference has different hash", () => {
    const metadata = generateIntegrity(fixturesDir);
    // Tamper with a hash
    const firstFile = Object.keys(metadata.fixtureHashes)[0];
    if (firstFile) {
      metadata.fixtureHashes[firstFile] = "0000000000000000000000000000000000000000000000000000000000000000";
      const { valid, mismatches } = verifyIntegrity(fixturesDir, metadata);
      expect(valid).toBe(false);
      expect(mismatches.length).toBeGreaterThan(0);
      expect(mismatches[0]).toContain("hash mismatch");
    }
  });
});
