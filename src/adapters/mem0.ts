import { MemoryAdapter, MemoryEntry, StoreOptions, SearchOptions } from "../types.js";

export class Mem0Adapter implements MemoryAdapter {
  name = "Mem0";
  capabilities = { multiAgent: true, scoping: false, temporalDecay: false };
  private apiKey: string;
  private apiUrl: string;
  private storedIds: string[] = [];

  constructor(apiKey: string, apiUrl: string = "https://api.mem0.ai/v1") {
    this.apiKey = apiKey;
    this.apiUrl = apiUrl;
  }

  async initialize(): Promise<void> {
    // Mem0 doesn't have a health check, just verify auth
    const res = await fetch(`${this.apiUrl}/memories/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Token ${this.apiKey}`,
      },
      body: JSON.stringify({
        messages: [{ role: "user", content: "test" }],
        user_id: "amb-health-check",
      }),
    });
    if (!res.ok && res.status !== 400) {
      throw new Error(`Mem0 API auth failed: ${res.status}`);
    }
  }

  async store(content: string, options?: StoreOptions): Promise<MemoryEntry> {
    const body: Record<string, unknown> = {
      messages: [{ role: "user", content }],
      user_id: options?.agentId || "amb-benchmark",
      metadata: options?.metadata,
    };

    const res = await fetch(`${this.apiUrl}/memories/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Token ${this.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Mem0 store failed (${res.status}): ${text}`);
    }

    const raw = await res.json() as
      | Array<{ id?: string; memory?: string; event?: string; event_id?: string; status?: string }>
      | { results: Array<{ id?: string; memory?: string; event?: string; status?: string }> };

    // Mem0 v1 returned {results: [...]}, v2 returns a flat array
    const items = Array.isArray(raw) ? raw : raw.results || [];
    const added = items.find((r) => r.event === "ADD" || r.status === "PENDING");
    const id = added?.id || `mem0-${Date.now()}`;
    if (added?.id) this.storedIds.push(added.id);

    return {
      id,
      content: added?.memory || content,
      createdAt: new Date().toISOString(),
    };
  }

  async search(query: string, options?: SearchOptions): Promise<MemoryEntry[]> {
    const body: Record<string, unknown> = {
      query,
      user_id: options?.agentId || "amb-benchmark",
      limit: options?.limit || 10,
    };

    const res = await fetch(`${this.apiUrl}/memories/search/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Token ${this.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Mem0 search failed (${res.status}): ${text}`);
    }

    const raw = await res.json() as
      | Array<{ id: string; memory: string; score: number; created_at: string }>
      | { results: Array<{ id: string; memory: string; score: number; created_at: string }> };

    const items = Array.isArray(raw) ? raw : raw.results || [];
    return items.map((m) => ({
      id: m.id,
      content: m.memory,
      score: m.score,
      createdAt: m.created_at,
    }));
  }

  async delete(id: string): Promise<boolean> {
    const res = await fetch(`${this.apiUrl}/memories/${id}/`, {
      method: "DELETE",
      headers: {
        Authorization: `Token ${this.apiKey}`,
      },
    });
    return res.ok;
  }

  async cleanup(): Promise<void> {
    for (const id of this.storedIds) {
      try {
        await this.delete(id);
      } catch {}
    }
    this.storedIds = [];
  }
}
