import { execFile } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { promisify } from "node:util";
import { MemoryAdapter, MemoryEntry, StoreOptions, SearchOptions } from "../types.js";

const execFileAsync = promisify(execFile);
const QUERY_STOPWORDS = new Set([
  "about",
  "after",
  "all",
  "and",
  "are",
  "been",
  "before",
  "being",
  "can",
  "current",
  "currently",
  "did",
  "does",
  "for",
  "from",
  "have",
  "how",
  "into",
  "list",
  "made",
  "now",
  "our",
  "the",
  "this",
  "used",
  "uses",
  "was",
  "were",
  "what",
  "when",
  "where",
  "which",
  "who",
  "why",
  "with",
]);

type TreeRingScope = "global" | "project" | "agent";

interface TreeRingMemory {
  id: string;
  summary: string;
  created_at?: string;
  tags?: string[];
  project?: string;
}

interface TreeRingRecallItem {
  memory: TreeRingMemory;
  score?: number;
}

export class TreeRingAdapter implements MemoryAdapter {
  name = "Tree Ring Memory";
  capabilities = { multiAgent: true, scoping: true, temporalDecay: true };

  private bin: string;
  private root: string;
  private ownsRoot: boolean;
  private sharedProject: string;
  private storedIds: string[] = [];

  constructor(options: { bin?: string; root?: string; sharedProject?: string } = {}) {
    this.bin = options.bin || process.env.TREE_RING_BIN || "tree-ring";
    this.sharedProject = options.sharedProject || process.env.TREE_RING_PROJECT || "amb-tree-ring";

    if (options.root || process.env.TREE_RING_ROOT) {
      this.root = options.root || process.env.TREE_RING_ROOT!;
      this.ownsRoot = false;
    } else {
      this.root = fs.mkdtempSync(path.join(os.tmpdir(), "amb-tree-ring-"));
      this.ownsRoot = true;
    }
  }

  async initialize(): Promise<void> {
    await this.run(["init"]);
  }

  async store(content: string, options?: StoreOptions): Promise<MemoryEntry> {
    const tags = ["amb", ...(options?.tags || [])];
    if (options?.agentId) tags.push(`agent:${options.agentId}`);
    if (options?.scope) tags.push(`scope:${options.scope}`);

    const args = [
      "remember",
      "--event-type",
      "lesson",
      "--scope",
      this.toTreeRingScope(options),
      "--project",
      this.projectFor(options),
      ...tags.flatMap((tag) => ["--tag", tag]),
      content,
    ];

    const memory = await this.runJson<TreeRingMemory>(args);
    this.storedIds.push(memory.id);

    return {
      id: memory.id,
      content: memory.summary || content,
      tags: memory.tags,
      metadata: {
        project: memory.project,
      },
      createdAt: memory.created_at,
    };
  }

  async search(query: string, options?: SearchOptions): Promise<MemoryEntry[]> {
    const limit = options?.limit || 10;
    const seen = new Set<string>();
    const results: MemoryEntry[] = [];

    for (const recallQuery of [query, ...this.fallbackQueries(query)]) {
      for (const entry of await this.recall(recallQuery, options)) {
        if (seen.has(entry.id)) continue;
        seen.add(entry.id);
        results.push(entry);
        if (results.length >= limit) return results;
      }
    }

    return results;
  }

  private async recall(query: string, options?: SearchOptions): Promise<MemoryEntry[]> {
    const args = [
      "recall",
      "--project",
      this.projectFor(options),
      "--limit",
      String(options?.limit || 10),
      query,
    ];

    const items = await this.runJson<TreeRingRecallItem[]>(args);
    return items.map((item) => ({
      id: item.memory.id,
      content: item.memory.summary,
      tags: item.memory.tags,
      metadata: {
        project: item.memory.project,
      },
      createdAt: item.memory.created_at,
      score: item.score,
    }));
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.runJson<{ ok?: boolean }>([
      "forget",
      "--mode",
      "delete",
      "--reason",
      "AMB benchmark cleanup",
      id,
    ]);
    this.storedIds = this.storedIds.filter((storedId) => storedId !== id);
    return result.ok === true;
  }

  async cleanup(): Promise<void> {
    for (const id of [...this.storedIds]) {
      try {
        await this.delete(id);
      } catch {}
    }
    this.storedIds = [];

    if (this.ownsRoot) {
      fs.rmSync(this.root, { recursive: true, force: true });
    }
  }

  private toTreeRingScope(options?: StoreOptions | SearchOptions): TreeRingScope {
    if (options?.scope === "agent") return "agent";
    if (options?.scope === "org" || options?.scope === "user") return "global";
    return "project";
  }

  private projectFor(options?: StoreOptions | SearchOptions): string {
    if (options?.namespace) return options.namespace;
    if (options?.scope === "org") return this.sharedProject;
    if (options?.scope === "user") return options.userId || this.sharedProject;
    return options?.agentId || options?.userId || this.sharedProject;
  }

  private fallbackQueries(query: string): string[] {
    const terms = query
      .toLowerCase()
      .match(/[a-z0-9][a-z0-9./-]*/g)
      ?.filter((term) => term.length >= 3 && !QUERY_STOPWORDS.has(term)) || [];

    const expanded = terms.flatMap((term) => {
      if (term.startsWith("authent")) return [term, "auth"];
      if (term.endsWith("ing") && term.length > 5) return [term, term.slice(0, -3)];
      if (term.endsWith("s") && term.length > 4) return [term, term.slice(0, -1)];
      return [term];
    });

    return [...new Set(expanded)];
  }

  private async runJson<T>(args: string[]): Promise<T> {
    const stdout = await this.run(args, true);
    return JSON.parse(stdout) as T;
  }

  private async run(args: string[], json = false): Promise<string> {
    const cliArgs = ["--root", this.root, ...(json ? ["--json"] : []), ...args];
    try {
      const { stdout } = await execFileAsync(this.bin, cliArgs, {
        maxBuffer: 10 * 1024 * 1024,
      });
      return stdout.trim();
    } catch (err) {
      if (err instanceof Error && "stderr" in err) {
        const stderr = String((err as Error & { stderr?: unknown }).stderr || "").trim();
        throw new Error(`tree-ring ${args[0]} failed: ${stderr || err.message}`);
      }
      throw err;
    }
  }
}
