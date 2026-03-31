import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

export interface IntegrityMetadata {
  benchmarkVersion: string;
  timestamp: string;
  nodeVersion: string;
  platform: string;
  arch: string;
  fixtureHashes: Record<string, string>;
}

function hashFile(filePath: string): string {
  const content = fs.readFileSync(filePath);
  return crypto.createHash("sha256").update(content).digest("hex");
}

function collectFixtureHashes(fixturesDir: string): Record<string, string> {
  const hashes: Record<string, string> = {};

  if (!fs.existsSync(fixturesDir)) return hashes;

  function walk(dir: string, prefix: string = "") {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        walk(fullPath, relativePath);
      } else if (entry.name.endsWith(".json")) {
        hashes[relativePath] = hashFile(fullPath);
      }
    }
  }

  walk(fixturesDir);
  return hashes;
}

export function generateIntegrity(fixturesDir: string): IntegrityMetadata {
  return {
    benchmarkVersion: "2.0.0",
    timestamp: new Date().toISOString(),
    nodeVersion: process.version,
    platform: os.platform(),
    arch: os.arch(),
    fixtureHashes: collectFixtureHashes(fixturesDir),
  };
}

export function verifyIntegrity(
  fixturesDir: string,
  expected: IntegrityMetadata
): { valid: boolean; mismatches: string[] } {
  const current = collectFixtureHashes(fixturesDir);
  const mismatches: string[] = [];

  for (const [file, expectedHash] of Object.entries(expected.fixtureHashes)) {
    const currentHash = current[file];
    if (!currentHash) {
      mismatches.push(`${file}: missing (was present in reference)`);
    } else if (currentHash !== expectedHash) {
      mismatches.push(`${file}: hash mismatch`);
    }
  }

  // Check for new files not in the reference
  for (const file of Object.keys(current)) {
    if (!expected.fixtureHashes[file]) {
      mismatches.push(`${file}: new file (not in reference)`);
    }
  }

  return { valid: mismatches.length === 0, mismatches };
}

export function writeIntegrity(metadata: IntegrityMetadata, outputDir: string): void {
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(
    path.join(outputDir, "integrity.json"),
    JSON.stringify(metadata, null, 2)
  );
}
