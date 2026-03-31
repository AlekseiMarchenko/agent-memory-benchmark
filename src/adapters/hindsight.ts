import { MemoryAdapter, MemoryEntry, StoreOptions, SearchOptions } from "../types.js";

/**
 * Hindsight adapter.
 * Hindsight uses retain/recall/reflect tool names.
 * Requires Docker: docker run -p 8000:8000 hindsight/hindsight
 * API docs: https://github.com/pchaganti/gx-hindsight
 */
export class HindsightAdapter implements MemoryAdapter {
  name = "Hindsight";
  capabilities = { multiAgent: false, scoping: false, temporalDecay: true };
  private apiUrl: string;
  private storedIds: string[] = [];

  constructor(apiUrl: string = "http://localhost:8000") {
    this.apiUrl = apiUrl;
  }

  async initialize(): Promise<void> {
    try {
      const res = await fetch(`${this.apiUrl}/health`);
      if (!res.ok) throw new Error(`Health check returned ${res.status}`);
    } catch (err) {
      throw new Error(
        `Hindsight not reachable at ${this.apiUrl}. ` +
        `Start it: docker run -p 8000:8000 hindsight/hindsight. ` +
        `Error: ${err instanceof Error ? err.message : err}`
      );
    }
  }

  async store(content: string, options?: StoreOptions): Promise<MemoryEntry> {
    const res = await fetch(`${this.apiUrl}/retain`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content,
        agent_id: options?.agentId || "amb-benchmark",
        tags: options?.tags || [],
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Hindsight retain failed (${res.status}): ${text}`);
    }

    const data = await res.json() as { id?: string; memory_id?: string; content?: string };
    const id = data.id || data.memory_id || `hs-${Date.now()}`;
    this.storedIds.push(id);

    return { id, content: data.content || content, createdAt: new Date().toISOString() };
  }

  async search(query: string, options?: SearchOptions): Promise<MemoryEntry[]> {
    const res = await fetch(`${this.apiUrl}/recall`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query,
        agent_id: options?.agentId || "amb-benchmark",
        limit: options?.limit || 10,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Hindsight recall failed (${res.status}): ${text}`);
    }

    const data = await res.json() as { memories?: Array<{ id: string; content: string; score?: number }> };
    return (data.memories || []).map((m) => ({
      id: m.id,
      content: m.content,
      score: m.score,
    }));
  }

  async delete(id: string): Promise<boolean> {
    const res = await fetch(`${this.apiUrl}/memories/${id}`, { method: "DELETE" });
    return res.ok;
  }

  async cleanup(): Promise<void> {
    for (const id of this.storedIds) {
      try { await this.delete(id); } catch {}
    }
    this.storedIds = [];
  }
}
