import { MemoryAdapter, MemoryEntry, StoreOptions, SearchOptions } from "../types.js";

export class InMemoryAdapter implements MemoryAdapter {
  name = "In-Memory Baseline";
  capabilities = { multiAgent: true, scoping: true, temporalDecay: false };
  private memories: Map<string, MemoryEntry & { agentId?: string; scope?: string }> = new Map();
  private counter = 0;

  async initialize(): Promise<void> {}

  async store(content: string, options?: StoreOptions): Promise<MemoryEntry> {
    const id = `mem-${++this.counter}`;
    const entry = {
      id,
      content,
      tags: options?.tags,
      metadata: options?.metadata,
      createdAt: new Date().toISOString(),
      agentId: options?.agentId,
      scope: options?.scope || "agent",
    };
    this.memories.set(id, entry);
    return entry;
  }

  async search(query: string, options?: SearchOptions): Promise<MemoryEntry[]> {
    const queryLower = query.toLowerCase();
    const queryWords = queryLower.split(/\s+/).filter(w => w.length > 2);

    const results: (MemoryEntry & { matchScore: number })[] = [];

    for (const mem of this.memories.values()) {
      // Scope filtering
      if (options?.agentId && mem.agentId && mem.scope === "agent" && mem.agentId !== options.agentId) {
        continue;
      }

      const contentLower = mem.content.toLowerCase();
      let matchScore = 0;

      for (const word of queryWords) {
        if (contentLower.includes(word)) {
          matchScore += 1;
        }
      }

      if (matchScore > 0) {
        results.push({ ...mem, matchScore, score: matchScore / queryWords.length });
      }
    }

    results.sort((a, b) => b.matchScore - a.matchScore);
    return results.slice(0, options?.limit || 10).map((r) => ({
      id: r.id,
      content: r.content,
      tags: r.tags,
      metadata: r.metadata,
      createdAt: r.createdAt,
      score: r.score,
    }));
  }

  async delete(id: string): Promise<boolean> {
    return this.memories.delete(id);
  }

  async cleanup(): Promise<void> {
    this.memories.clear();
    this.counter = 0;
  }
}
